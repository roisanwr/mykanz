// app/api/gmail/status/route.ts
// GET  → cek status koneksi Gmail user
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
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    connected: user.gmail_connected,
    email: user.gmail_email,
    needs_reauth: user.gmail_needs_reauth,
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
