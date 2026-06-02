// app/api/gmail/status/route.ts
// GET  → cek status koneksi Gmail user (+ info diagnostik)
// DELETE → disconnect Gmail (hapus tokens dari DB)

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      gmail_connected: true,
      gmail_email: true,
      gmail_needs_reauth: true,
      gmail_watch_expiry: true,
      gmail_history_id: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const now = new Date();
  const watchExpiry = user.gmail_watch_expiry;

  return NextResponse.json({
    connected: user.gmail_connected,
    email: user.gmail_email,
    needs_reauth: user.gmail_needs_reauth,
    // Info diagnostik tambahan — berguna untuk debugging
    watch_active: watchExpiry ? watchExpiry > now : false,
    watch_expires_at: watchExpiry?.toISOString() ?? null,
    history_id_set: !!user.gmail_history_id,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.users.update({
    where: { id: session.user.id },
    data: {
      gmail_connected: false,
      gmail_needs_reauth: false,
      gmail_email: null,
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_token_expiry: null,
      gmail_history_id: null,
      gmail_watch_expiry: null,
    },
  });

  return NextResponse.json({ success: true });
}
