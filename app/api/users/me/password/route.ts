// app/api/users/me/password/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter.' },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { password_hash: true },
    });

    if (!user?.password_hash) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Password lama tidak sesuai.' }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.users.update({
      where: { id: session.user.id },
      data: { password_hash: newHash },
    });

    return NextResponse.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (error) {
    console.error('Gagal ganti password:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
