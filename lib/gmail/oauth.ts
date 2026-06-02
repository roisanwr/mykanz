import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { saveTokens, getClientForUser } from './token-manager';

function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

/**
 * Generate URL Google Consent Screen untuk user tertentu.
 * - access_type: 'offline' → dapat refresh_token
 * - prompt: 'consent' → refresh_token selalu dikirim ulang
 * - state: userId → linking token ke user saat callback
 */
export function getAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'openid',
      'email',
    ],
    state: userId,
  });
}

/**
 * Handle callback dari Google setelah user approve/deny consent screen.
 * Menukar authorization code dengan tokens, menyimpannya, dan setup watch.
 *
 * FIX BUG #1: gmail_connected = true hanya di-set SETELAH setupGmailWatch berhasil.
 * Sebelumnya, jika setupGmailWatch gagal, DB tetap punya gmail_connected = true
 * tapi tidak ada watch yang berjalan → UI tampil "connected" tapi notif tidak jalan.
 *
 * FIX BUG #4: Email address diambil langsung dari Gmail API (profile),
 * bukan hanya dari id_token yang bisa saja tidak ada atau gagal di-decode.
 */
export async function handleCallback(code: string, userId: string): Promise<void> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Set credentials di client dulu agar bisa memanggil API
  oauth2Client.setCredentials(tokens);

  // FIX BUG #4: Ambil email address langsung dari Gmail API — lebih reliable
  // daripada decode id_token yang bisa tidak hadir atau gagal
  const gmailApi = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmailApi.users.getProfile({ userId: 'me' });
  const emailAddress = profile.data.emailAddress;

  if (!emailAddress) {
    throw new Error('Tidak bisa mendapatkan email address dari Google profile');
  }

  // Simpan tokens ke DB (terenkripsi)
  await saveTokens(userId, tokens);

  // Simpan email address secara eksplisit (jangan hanya andalkan id_token)
  await prisma.users.update({
    where: { id: userId },
    data: { gmail_email: emailAddress },
  });

  // FIX BUG #1: Setup watch DULU sebelum set gmail_connected = true
  // Jika setupGmailWatch gagal (mis. GCP_PROJECT_ID salah, topic belum dibuat),
  // handleCallback akan throw dan callback route redirect ke ?gmail=error.
  // DB TIDAK akan punya gmail_connected = true yang salah.
  await setupGmailWatch(userId, oauth2Client);

  // Baru set gmail_connected = true SETELAH watch berhasil
  await prisma.users.update({
    where: { id: userId },
    data: {
      gmail_connected: true,
      gmail_needs_reauth: false,
    },
  });
}

/**
 * Setup gmail.watch() agar Google Pub/Sub mengirim notifikasi ke webhook kita.
 * Watch expire tiap 7 hari — di-renew otomatis oleh cron job.
 */
export async function setupGmailWatch(
  userId: string,
  clientOrTokens?: OAuth2Client,
): Promise<void> {
  const oauth2Client = clientOrTokens ?? (await getClientForUser(userId));
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const projectId = process.env.GCP_PROJECT_ID!;
  const topicName = `projects/${projectId}/topics/mykanz-gmail-push`;

  const watchResponse = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  });

  const expiry = watchResponse.data.expiration
    ? new Date(Number(watchResponse.data.expiration))
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 hari dari sekarang

  await prisma.users.update({
    where: { id: userId },
    data: {
      gmail_history_id: watchResponse.data.historyId ?? undefined,
      gmail_watch_expiry: expiry,
    },
  });

  console.log(`[Gmail] watch() setup untuk user ${userId}, expiry: ${expiry.toISOString()}`);
}
