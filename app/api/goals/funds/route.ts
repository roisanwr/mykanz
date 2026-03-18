// app/api/goals/funds/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// POST: Add funds to a goal (tabungan)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { goal_id, amount, wallet_id } = body;

    if (!goal_id || !amount || !wallet_id) {
      return NextResponse.json(
        { error: 'Nominal tabungan dan Dompet sumber wajib diisi!' },
        { status: 400 }
      );
    }

    const parsedAmount = new Prisma.Decimal(String(amount));

    if (parsedAmount.lte(0)) {
      return NextResponse.json(
        { error: 'Nominal tabungan harus lebih dari 0!' },
        { status: 400 }
      );
    }

    const goal = await (prisma.goals as any).findUnique({
      where: { id: goal_id, user_id: session.user.id },
    }) as any;

    if (!goal) {
      return NextResponse.json(
        { error: 'Target Impian tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (goal.asset_id) {
      return NextResponse.json(
        {
          error:
            'Target berbasis aset hanya bisa diupdate otomatis dari menu Investasi!',
        },
        { status: 400 }
      );
    }

    const userId = session.user.id as string;

    const getOrCreateCategory = async (
      catName: string,
      catType: 'PEMASUKAN' | 'PENGELUARAN'
    ) => {
      let cat = await prisma.categories.findFirst({
        where: { user_id: userId, name: catName, type: catType },
      });
      if (!cat) {
        cat = await prisma.categories.create({
          data: { user_id: userId, name: catName, type: catType },
        });
      }
      return cat.id;
    };

    await prisma.$transaction(async (tx) => {
      const catId = await getOrCreateCategory('Tabungan Impian', 'PENGELUARAN');

      await tx.fiat_transactions.create({
        data: {
          user_id: userId,
          wallet_id,
          category_id: catId,
          transaction_type: 'PENGELUARAN',
          amount: parsedAmount,
          description: `Nabung untuk: ${goal.name}`,
        },
      });

      const newAmount = (
        goal.current_amount || new Prisma.Decimal(0)
      ).add(parsedAmount);

      await tx.goals.update({
        where: { id: goal_id },
        data: { current_amount: newAmount, updated_at: new Date() },
      });
    });

    return NextResponse.json(
      { success: true, message: 'Tabungan berhasil ditambahkan!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menabung:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menabung.' },
      { status: 500 }
    );
  }
}
