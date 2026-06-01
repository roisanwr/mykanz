import { google } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { encrypt, decrypt } from './crypto';

function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

/**
 * Simpan/update token Gmail user ke database (dienkripsi).
 */
export async function saveTokens(
  userId: string,
  tokens: Partial<Credentials>,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (tokens.access_token) {
    updateData.gmail_access_token = encrypt(tokens.access_token);
  }
  if (tokens.refresh_token) {
    updateData.gmail_refresh_token = encrypt(tokens.refresh_token);
  }
  if (tokens.expiry_date) {
    updateData.gmail_token_expiry = BigInt(tokens.expiry_date);
  }
  if (tokens.id_token) {
    // Decode email dari id_token (tanpa verifikasi — hanya untuk simpan email)
    try {
      const payload = JSON.parse(
        Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString('utf8'),
      );
      if (payload.email) {
        updateData.gmail_email = payload.email;
      }
    } catch {
      // id_token tidak bisa di-decode, abaikan
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.users.update({
      where: { id: userId },
      data: updateData,
    });
  }
}

/**
 * Buat OAuth2Client yang sudah di-set credentials untuk user tertentu.
 * Secara otomatis menyimpan token baru ke DB saat auto-refresh terjadi.
 */
export async function getClientForUser(userId: string): Promise<OAuth2Client> {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      gmail_access_token: true,
      gmail_refresh_token: true,
      gmail_token_expiry: true,
    },
  });

  if (!user?.gmail_refresh_token) {
    throw new Error('User tidak memiliki Gmail refresh token');
  }

  const oauth2Client = createOAuth2Client();

  const credentials: Credentials = {
    refresh_token: decrypt(user.gmail_refresh_token),
  };

  if (user.gmail_access_token) {
    credentials.access_token = decrypt(user.gmail_access_token);
  }
  if (user.gmail_token_expiry) {
    credentials.expiry_date = Number(user.gmail_token_expiry);
  }

  oauth2Client.setCredentials(credentials);

  // Listen event 'tokens' — otomatis simpan ke DB saat token di-refresh
  oauth2Client.on('tokens', async (newTokens) => {
    await saveTokens(userId, newTokens);
  });

  return oauth2Client;
}

/**
 * Tandai user sebagai perlu re-auth (token tidak valid lagi).
 */
export async function handleInvalidGrant(userId: string): Promise<void> {
  await prisma.users.update({
    where: { id: userId },
    data: {
      gmail_connected: false,
      gmail_needs_reauth: true,
    },
  });
  console.warn(`[Gmail] invalid_grant untuk user ${userId} — perlu re-auth`);
}
