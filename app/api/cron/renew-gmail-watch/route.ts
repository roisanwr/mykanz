// app/api/cron/renew-gmail-watch/route.ts
// Dijalankan Vercel Cron setiap hari jam 02:00 WIB (19:00 UTC)
// Renew gmail.watch() untuk semua user yang watch-nya akan expire dalam 2 hari

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getClientForUser, handleInvalidGrant } from '@/lib/gmail/token-manager';
import { setupGmailWatch } from '@/lib/gmail/oauth';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verifikasi cron secret untuk keamanan
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  // Cari users yang gmail-nya connected dan watch-nya hampir expire
  const usersToRenew = await prisma.users.findMany({
    where: {
      gmail_connected: true,
      gmail_needs_reauth: false,
      gmail_watch_expiry: {
        lt: twoDaysFromNow,
      },
    },
    select: { id: true, gmail_email: true },
  });

  let renewed = 0;
  let failed = 0;

  for (const user of usersToRenew) {
    try {
      const oauth2Client = await getClientForUser(user.id);
      await setupGmailWatch(user.id, oauth2Client);
      renewed++;
      console.log(`[Cron] Renewed gmail.watch() untuk user ${user.id} (${user.gmail_email})`);
    } catch (err: unknown) {
      const error = err as { message?: string; code?: number };
      if (
        error?.message?.includes('invalid_grant') ||
        error?.code === 401
      ) {
        await handleInvalidGrant(user.id);
        console.warn(`[Cron] invalid_grant untuk user ${user.id} — tandai perlu re-auth`);
      } else {
        console.error(`[Cron] Gagal renew watch untuk user ${user.id}:`, err);
      }
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: usersToRenew.length,
    renewed,
    failed,
  });
}
