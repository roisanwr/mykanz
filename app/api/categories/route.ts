// app/api/categories/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { fiat_tx_type } from '@prisma/client';

// POST: Create a new category
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type } = body as { name: string; type: fiat_tx_type };

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nama kategori wajib diisi!' },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Tipe kategori (Pemasukan/Pengeluaran) wajib dipilih!' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.categories.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        type,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Kategori berhasil dibuat!', data: newCategory },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat kategori:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// GET: Get all categories for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.categories.findMany({
      where: { user_id: session.user.id, deleted_at: null },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing category
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, type } = body as { id: string; name: string; type: fiat_tx_type };

    if (!id || !name || !type) {
      return NextResponse.json(
        { error: 'Data tidak lengkap!' },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.categories.update({
      where: { id, user_id: session.user.id },
      data: { name: name.trim(), type },
    });

    return NextResponse.json(
      { success: true, message: 'Kategori berhasil diupdate!', data: updatedCategory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal update kategori:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui kategori.' },
      { status: 500 }
    );
  }
}

// DELETE: Soft-delete a category
// Usage: DELETE /api/categories?id=<id>
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID Kategori wajib dikirim!' },
        { status: 400 }
      );
    }

    await prisma.categories.update({
      where: { id, user_id: session.user.id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json(
      { success: true, message: 'Kategori berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus kategori:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus kategori.' },
      { status: 500 }
    );
  }
}
