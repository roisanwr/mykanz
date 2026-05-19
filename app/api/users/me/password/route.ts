// app/api/users/me/password/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const PasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi.'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.'),
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = PasswordChangeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

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
