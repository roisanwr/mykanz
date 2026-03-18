// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { fiat_tx_type } from '@prisma/client';

// GET: Fetch transactions with optional filters
// Usage: GET /api/transactions?type=SEMUA&walletId=<id>
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type') as fiat_tx_type | 'SEMUA' | null;
    const filterWalletId = searchParams.get('walletId');

    const whereClause: any = { user_id: session.user.id };

    if (filterType && filterType !== 'SEMUA') {
      whereClause.transaction_type = filterType;
    }

    if (filterWalletId) {
      whereClause.OR = [
        { wallet_id: filterWalletId },
        { to_wallet_id: filterWalletId },
      ];
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: whereClause,
      orderBy: { transaction_date: 'desc' },
      take: 100,
      include: {
        categories: { select: { name: true, type: true } },
        wallets_fiat_transactions_wallet_idTowallets: {
          select: { name: true, currency: true },
        },
        wallets_fiat_transactions_to_wallet_idTowallets: {
          select: { name: true, currency: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: transactions }, { status: 200 });
  } catch (error) {
    console.error('Gagal fetch transaksi:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new transaction
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      transaction_type,
      wallet_id,
      amount,
      description = null,
      transaction_date,
      category_id,
      to_wallet_id,
      admin_fee = 0,
    } = body;

    if (!transaction_type || !wallet_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap atau jumlah tidak valid!' },
        { status: 400 }
      );
    }

    const txDate = transaction_date
      ? new Date(`${transaction_date}T00:00:00.000Z`)
      : undefined;

    const payload: any = {
      user_id: session.user.id,
      transaction_type,
      wallet_id,
      amount,
      description,
      ...(txDate && { transaction_date: txDate }),
    };

    if (transaction_type === 'TRANSFER') {
      if (!to_wallet_id || wallet_id === to_wallet_id) {
        return NextResponse.json(
          { error: 'Dompet tujuan tidak valid!' },
          { status: 400 }
        );
      }

      payload.to_wallet_id = to_wallet_id;

      const prismaOps: any[] = [prisma.fiat_transactions.create({ data: payload })];

      if (admin_fee > 0) {
        let adminCat = await prisma.categories.findFirst({
          where: {
            user_id: session.user.id,
            name: 'Biaya Admin',
            type: 'PENGELUARAN',
          },
        });

        if (!adminCat) {
          adminCat = await prisma.categories.create({
            data: {
              user_id: session.user.id,
              name: 'Biaya Admin',
              type: 'PENGELUARAN',
            },
          });
        }

        prismaOps.push(
          prisma.fiat_transactions.create({
            data: {
              user_id: session.user.id,
              transaction_type: 'PENGELUARAN',
              wallet_id,
              category_id: adminCat.id,
              amount: admin_fee,
              description: `Biaya Admin Transfer${description ? ' - ' + description : ''}`,
              ...(txDate && { transaction_date: txDate }),
            },
          })
        );
      }

      await prisma.$transaction(prismaOps);
    } else {
      if (category_id) payload.category_id = category_id;
      await prisma.fiat_transactions.create({ data: payload });
    }

    return NextResponse.json(
      { success: true, message: 'Transaksi berhasil dicatat!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat transaksi:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a transaction
// Usage: DELETE /api/transactions?id=<id>
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
        { error: 'ID Transaksi wajib dikirim!' },
        { status: 400 }
      );
    }

    await prisma.fiat_transactions.delete({
      where: { id, user_id: session.user.id },
    });

    return NextResponse.json(
      { success: true, message: 'Transaksi berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus transaksi:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus transaksi.' },
      { status: 500 }
    );
  }
}
