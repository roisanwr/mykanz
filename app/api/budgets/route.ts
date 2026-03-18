// app/api/budgets/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET: Fetch all budgets for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budgets = await prisma.budgets.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: 'desc' },
      include: {
        budget_categories: {
          include: { categories: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: budgets }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new budget
// Body: { amount, period, date, category_ids: string[] }
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { amount, period, date, category_ids } = body;

    if (!amount || !period || !date || !category_ids) {
      return NextResponse.json(
        { error: 'Mohon lengkapi semua data wajib!' },
        { status: 400 }
      );
    }

    if (!Array.isArray(category_ids) || category_ids.length === 0) {
      return NextResponse.json(
        { error: 'Harap pilih minimal 1 kategori!' },
        { status: 400 }
      );
    }

    const parsedAmount = new Prisma.Decimal(String(amount));

    if (parsedAmount.lte(0)) {
      return NextResponse.json(
        { error: 'Limit Anggaran harus lebih dari 0!' },
        { status: 400 }
      );
    }

    const bDate = new Date(date);
    let startDate = new Date(bDate);
    let endDate = new Date(bDate);

    if (period === 'BULANAN') {
      startDate = new Date(bDate.getFullYear(), bDate.getMonth(), 1);
      endDate = new Date(
        bDate.getFullYear(),
        bDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    } else if (period === 'MINGGUAN') {
      const day = bDate.getDay();
      const diff = bDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(bDate.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return NextResponse.json(
        { error: 'Periode tidak valid. Gunakan BULANAN atau MINGGUAN.' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const budget = await tx.budgets.create({
        data: {
          user_id: userId,
          amount: parsedAmount,
          period,
          start_date: startDate,
          end_date: endDate,
        },
      });

      await tx.budget_categories.createMany({
        data: category_ids.map((catId: string) => ({
          budget_id: budget.id,
          category_id: catId,
        })),
      });
    });

    return NextResponse.json(
      { success: true, message: 'Anggaran berhasil dibuat!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat anggaran:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan anggaran.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a budget
// Usage: DELETE /api/budgets?id=<id>
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
        { error: 'ID Anggaran wajib dikirim!' },
        { status: 400 }
      );
    }

    const budget = await prisma.budgets.findUnique({
      where: { id, user_id: session.user.id },
    });

    if (!budget) {
      return NextResponse.json(
        { error: 'Anggaran tidak ditemukan.' },
        { status: 404 }
      );
    }

    await prisma.budgets.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: 'Anggaran berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus anggaran:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus anggaran.' },
      { status: 500 }
    );
  }
}
