// app/api/investments/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { asset_tx_type, Prisma } from '@prisma/client';

// GET: Fetch all investment transactions for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await prisma.asset_transactions.findMany({
      where: { user_id: session.user.id },
      orderBy: { transaction_date: 'desc' },
      include: {
        user_portfolios: {
          include: {
            assets: { select: { name: true, ticker_symbol: true, asset_type: true, unit_name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: transactions }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Record an investment transaction (BUY or SELL)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const {
      transaction_type,
      asset_id,
      units,
      price_per_unit,
      transaction_date,
      notes = null,
      save_to_wallet = false,
      wallet_id = null,
    } = body;

    if (!transaction_type || !asset_id || !units || !transaction_date) {
      return NextResponse.json(
        { error: 'Data wajib (Aset, Tipe, Unit, Tanggal) harus diisi!' },
        { status: 400 }
      );
    }

    if (save_to_wallet && !wallet_id) {
      return NextResponse.json(
        {
          error:
            'Harap pilih dompet jika opsi hubungkan dengan dompet diaktifkan!',
        },
        { status: 400 }
      );
    }

    const type = transaction_type as asset_tx_type;
    const parsedUnits = new Prisma.Decimal(String(units));
    const parsedPrice = new Prisma.Decimal(String(price_per_unit || 0));
    const totalAmount = parsedUnits.mul(parsedPrice);
    const txDate = new Date(transaction_date);

    if (parsedUnits.lte(0) || parsedPrice.lt(0)) {
      return NextResponse.json(
        { error: 'Unit harus lebih dari 0 dan Harga tidak boleh negatif!' },
        { status: 400 }
      );
    }

    // Get or create portfolio entry
    let portfolio = await prisma.user_portfolios.findUnique({
      where: { user_id_asset_id: { user_id: userId, asset_id } },
    });

    if (!portfolio) {
      if (type === 'JUAL') {
        return NextResponse.json(
          { error: 'Tidak bisa menjual aset yang belum dimiliki!' },
          { status: 400 }
        );
      }
      portfolio = await prisma.user_portfolios.create({
        data: { user_id: userId, asset_id, total_units: 0, average_buy_price: 0 },
      });
    }

    const currentUnits = portfolio.total_units || new Prisma.Decimal(0);
    const currentAvgPrice = portfolio.average_buy_price || new Prisma.Decimal(0);

    if (type === 'JUAL' && parsedUnits.gt(currentUnits)) {
      return NextResponse.json(
        { error: 'Unit yang dijual melebihi total unit yang dimiliki!' },
        { status: 400 }
      );
    }

    const getOrCreateCategory = async (
      name: string,
      catType: 'PEMASUKAN' | 'PENGELUARAN'
    ) => {
      let cat = await prisma.categories.findFirst({
        where: { user_id: userId, name, type: catType },
      });
      if (!cat) {
        cat = await prisma.categories.create({
          data: { user_id: userId, name, type: catType },
        });
      }
      return cat.id;
    };

    await prisma.$transaction(async (tx) => {
      let linkedFiatTxId: string | null = null;
      let newUnits = currentUnits;
      let newAvgPrice = currentAvgPrice;

      if (type === 'BELI') {
        const totalPreviousCost = currentUnits.mul(currentAvgPrice);
        const totalNewCost = parsedUnits.mul(parsedPrice);
        newUnits = currentUnits.add(parsedUnits);
        if (newUnits.gt(0)) {
          newAvgPrice = totalPreviousCost.add(totalNewCost).div(newUnits);
        }

        if (save_to_wallet && wallet_id) {
          const catId = await getOrCreateCategory('Berinvestasi', 'PENGELUARAN');
          const fiatTx = await tx.fiat_transactions.create({
            data: {
              user_id: userId,
              wallet_id,
              category_id: catId,
              transaction_type: 'PENGELUARAN',
              amount: totalAmount,
              description: `Beli Aset${notes ? ' - ' + notes : ''}`,
              transaction_date: txDate,
            },
          });
          linkedFiatTxId = fiatTx.id;
        }
      } else if (type === 'JUAL') {
        newUnits = currentUnits.sub(parsedUnits);

        if (save_to_wallet && wallet_id) {
          const catId = await getOrCreateCategory('Realisasi Investasi', 'PEMASUKAN');
          const fiatTx = await tx.fiat_transactions.create({
            data: {
              user_id: userId,
              wallet_id,
              category_id: catId,
              transaction_type: 'PEMASUKAN',
              amount: totalAmount,
              description: `Jual Aset${notes ? ' - ' + notes : ''}`,
              transaction_date: txDate,
            },
          });
          linkedFiatTxId = fiatTx.id;
        }
      }

      await tx.user_portfolios.update({
        where: { id: portfolio!.id },
        data: {
          total_units: newUnits,
          average_buy_price: newAvgPrice,
          updated_at: new Date(),
        },
      });

      await tx.asset_transactions.create({
        data: {
          user_id: userId,
          portfolio_id: portfolio!.id,
          transaction_type: type,
          units: parsedUnits,
          price_per_unit: parsedPrice,
          total_amount: totalAmount,
          notes,
          transaction_date: txDate,
          linked_fiat_transaction_id: linkedFiatTxId,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: 'Investasi berhasil dicatat!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal mencatat investasi:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an investment transaction and revert portfolio
// Usage: DELETE /api/investments?id=<transactionId>
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

    const investTx = await prisma.asset_transactions.findUnique({
      where: { id, user_id: session.user.id },
      include: { user_portfolios: true },
    });

    if (!investTx) {
      return NextResponse.json(
        { error: 'Transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (ptx) => {
      const p = investTx.user_portfolios;
      const currentUnits = p.total_units || new Prisma.Decimal(0);
      let newUnits = currentUnits;

      if (investTx.transaction_type === 'BELI') {
        newUnits = currentUnits.sub(investTx.units);
        if (newUnits.lt(0)) {
          throw new Error(
            'Penghapusan ini akan membuat unit portofolio menjadi minus. Hapus transaksi penjualan terlebih dahulu.'
          );
        }
      } else if (investTx.transaction_type === 'JUAL') {
        newUnits = currentUnits.add(investTx.units);
        if (investTx.linked_fiat_transaction_id) {
          await ptx.fiat_transactions.delete({
            where: { id: investTx.linked_fiat_transaction_id },
          });
        }
      }

      await ptx.user_portfolios.update({
        where: { id: p.id },
        data: { total_units: newUnits },
      });

      await ptx.asset_transactions.delete({ where: { id } });
    });

    return NextResponse.json(
      { success: true, message: 'Transaksi investasi berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Gagal menghapus investasi:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus transaksi.' },
      { status: 500 }
    );
  }
}
