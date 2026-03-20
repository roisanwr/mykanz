// app/api/users/me/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Get the currently logged-in user's profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update the currently logged-in user's profile
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nama tidak boleh kosong!' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.users.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Profil berhasil diupdate!', data: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal update user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate profil.' },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete the currently logged-in user's account
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Konfirmasi password wajib diisi.' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: { password_hash: true },
    });

    if (!user?.password_hash) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Password tidak sesuai.' }, { status: 400 });
    }

    // Cascade delete — all related data (wallets, transactions, etc.) will be removed
    await prisma.users.delete({ where: { id: session.user.id } });

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus.' });
  } catch (error) {
    console.error('Gagal hapus akun:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
