import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate secure random hex token (6 chars for ease of typing)
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    // Set expiry 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        telegram_link_token: token,
        telegram_token_expires_at: expiresAt
      }
    });

    return NextResponse.json({ success: true, token, expiresAt }, { status: 200 });
  } catch (error) {
    console.error("Token Generation Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
