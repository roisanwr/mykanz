// app/api/export/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsv).join(',');
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'transaksi';

    const userId = session.user.id;

    if (type === 'investasi') {
      // Export investasi (asset transactions)
      const rows = await prisma.asset_transactions.findMany({
        where: { user_id: userId },
        orderBy: { transaction_date: 'desc' },
        include: {
          user_portfolios: {
            include: {
              assets: { select: { name: true, ticker_symbol: true, asset_type: true, currency: true } },
            },
          },
        },
      });

      const headers = ['Tanggal', 'Aset', 'Ticker', 'Tipe Aset', 'Jenis Transaksi', 'Jumlah Unit', 'Harga per Unit', 'Total', 'Mata Uang', 'Catatan'];
      const lines = [
        headers.join(','),
        ...rows.map((r) => rowToCsv([
          r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('id-ID') : '',
          r.user_portfolios.assets.name,
          r.user_portfolios.assets.ticker_symbol,
          r.user_portfolios.assets.asset_type,
          r.transaction_type,
          r.units.toString(),
          r.price_per_unit.toString(),
          r.total_amount.toString(),
          r.user_portfolios.assets.currency,
          r.notes,
        ])),
      ];

      const csv = lines.join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mykanz_investasi_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Default: export fiat transactions
    const rows = await prisma.fiat_transactions.findMany({
      where: { user_id: userId },
      orderBy: { transaction_date: 'desc' },
      include: {
        categories: { select: { name: true } },
        wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
        wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true } },
      },
    });

    const headers = ['Tanggal', 'Jenis', 'Dompet', 'Ke Dompet', 'Kategori', 'Jumlah', 'Mata Uang', 'Deskripsi'];
    const lines = [
      headers.join(','),
      ...rows.map((r) => rowToCsv([
        r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('id-ID') : '',
        r.transaction_type,
        r.wallets_fiat_transactions_wallet_idTowallets?.name,
        r.wallets_fiat_transactions_to_wallet_idTowallets?.name,
        r.categories?.name,
        r.amount.toString(),
        r.wallets_fiat_transactions_wallet_idTowallets?.currency,
        r.description,
      ])),
    ];

    const csv = lines.join('\n');
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mykanz_transaksi_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Gagal export:', error);
    return NextResponse.json({ error: 'Gagal mengekspor data.' }, { status: 500 });
  }
}
