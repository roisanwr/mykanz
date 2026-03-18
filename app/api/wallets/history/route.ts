// app/api/wallets/history/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Fetch transaction history for a specific wallet
// Usage: GET /api/wallets/history?walletId=<id>
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json(
        { error: 'walletId wajib dikirim!' },
        { status: 400 }
      );
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: {
        user_id: session.user.id,
        OR: [{ wallet_id: walletId }, { to_wallet_id: walletId }],
      },
      orderBy: { transaction_date: 'desc' },
      take: 50,
      include: {
        categories: { select: { name: true } },
        wallets_fiat_transactions_to_wallet_idTowallets: {
          select: { name: true },
        },
        wallets_fiat_transactions_wallet_idTowallets: {
          select: { name: true },
        },
      },
    });

    const formattedData = transactions.map((tx) => {
      const isSource = tx.wallet_id === walletId;
      const isDestination = tx.to_wallet_id === walletId;

      let typeLabel = '';
      let isIncome = false;

      if (tx.transaction_type === 'PEMASUKAN') {
        typeLabel = 'Pemasukan';
        isIncome = true;
      } else if (tx.transaction_type === 'PENGELUARAN') {
        typeLabel = 'Pengeluaran';
        isIncome = false;
      } else if (tx.transaction_type === 'TRANSFER') {
        if (isSource) {
          typeLabel = `Trf Keluar ke ${tx.wallets_fiat_transactions_to_wallet_idTowallets?.name || 'Dompet Lain'}`;
          isIncome = false;
        } else if (isDestination) {
          typeLabel = `Trf Masuk dari ${tx.wallets_fiat_transactions_wallet_idTowallets?.name || 'Dompet Lain'}`;
          isIncome = true;
        }
      }

      return {
        id: tx.id,
        date: tx.transaction_date,
        amount: Number(tx.amount),
        typeLabel,
        isIncome,
        category: tx.categories?.name || '-',
        description: tx.description || '-',
      };
    });

    return NextResponse.json(
      { success: true, data: formattedData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal ambil history wallet:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil riwayat transaksi.' },
      { status: 500 }
    );
  }
}
