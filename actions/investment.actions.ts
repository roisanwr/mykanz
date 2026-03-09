"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { asset_tx_type, Prisma } from '@prisma/client';

export async function createInvestment(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };
    const userId = session.user.id;

    const txTypeStr = formData.get('transaction_type') as string;
    const type = txTypeStr as asset_tx_type;
    const assetId = formData.get('asset_id') as string;
    const unitsStr = formData.get('units') as string;
    const priceStr = formData.get('price_per_unit') as string;
    const dateStr = formData.get('transaction_date') as string;
    const notes = formData.get('notes') as string || null;
    
    // Optional link to wallet
    const saveToWallet = formData.get('save_to_wallet') === 'true';
    const walletId = formData.get('wallet_id') as string | null;

    if (!type || !assetId || !unitsStr || !priceStr || !dateStr) {
      return { error: 'Semua data wajib (Aset, Tipe, Unit, Harga, Tanggal) harus diisi!' };
    }

    if (saveToWallet && !walletId) {
       return { error: 'Harap pilih dompet jika opsi hubungkan dengan dompet diaktifkan!' };
    }

    // Replace dot with empty string for IDR formats
    const cleanUnits = unitsStr.replace(/\./g, '').replace(',', '.');
    const cleanPrice = priceStr.replace(/\./g, '').replace(',', '.');

    const units = new Prisma.Decimal(cleanUnits);
    const price = new Prisma.Decimal(cleanPrice);
    const totalAmount = units.mul(price);
    const txDate = new Date(dateStr);

    if (units.lte(0) || price.lte(0)) {
      return { error: 'Unit dan Harga harus lebih dari 0!' };
    }

    // 1. Get or Create User Portfolio
    let portfolio = await prisma.user_portfolios.findUnique({
      where: { user_id_asset_id: { user_id: userId, asset_id: assetId } }
    });

    if (!portfolio) {
      if (type === 'JUAL') return { error: 'Tidak bisa menjual aset yang belum dimiliki!' };
      portfolio = await prisma.user_portfolios.create({
        data: {
          user_id: userId,
          asset_id: assetId,
          total_units: 0,
          average_buy_price: 0,
        }
      });
    }

    // Current balances
    const currentUnits = portfolio.total_units || new Prisma.Decimal(0);
    const currentAvgPrice = portfolio.average_buy_price || new Prisma.Decimal(0);

    // Business Logic Validation
    if (type === 'JUAL' && units.gt(currentUnits)) {
      return { error: 'Unit yang dijual melebihi total unit yang dimiliki!' };
    }

    // Helper to get or create category
    const getOrCreateCategory = async (name: string, catType: 'PEMASUKAN' | 'PENGELUARAN') => {
       let cat = await prisma.categories.findFirst({
         where: { user_id: userId, name: name, type: catType }
       });
       if (!cat) {
         cat = await prisma.categories.create({
           data: { user_id: userId, name, type: catType }
         });
       }
       return cat.id;
    };

    // Transaction execution
    await prisma.$transaction(async (tx) => {
      let linkedFiatTxId: string | null = null;
      let newUnits = currentUnits;
      let newAvgPrice = currentAvgPrice;

      // Logic BELI: add units, recalculate average cost basis
      if (type === 'BELI') {
        const totalPreviousCost = currentUnits.mul(currentAvgPrice);
        const totalNewCost = units.mul(price);
        
        newUnits = currentUnits.add(units);
        if (newUnits.gt(0)) {
           newAvgPrice = totalPreviousCost.add(totalNewCost).div(newUnits);
        }

        // Link to wallet if checked
        if (saveToWallet && walletId) {
          const catId = await getOrCreateCategory('Berinvestasi', 'PENGELUARAN');
          const fiatTx = await tx.fiat_transactions.create({
            data: {
              user_id: userId,
              wallet_id: walletId,
              category_id: catId,
              transaction_type: 'PENGELUARAN',
              amount: totalAmount,
              description: `Beli Aset ${notes ? '- '+notes : ''}`,
              transaction_date: txDate,
            }
          });
          linkedFiatTxId = fiatTx.id;
        }
      } 
      // Logic JUAL: subtract units. Average cost remains the same.
      else if (type === 'JUAL') {
        newUnits = currentUnits.sub(units);

        // Link to wallet if checked
        if (saveToWallet && walletId) {
          const catId = await getOrCreateCategory('Realisasi Investasi', 'PEMASUKAN');
          const fiatTx = await tx.fiat_transactions.create({
            data: {
              user_id: userId,
              wallet_id: walletId,
              category_id: catId,
              transaction_type: 'PEMASUKAN',
              amount: totalAmount,
              description: `Jual Aset ${notes ? '- '+notes : ''}`,
              transaction_date: txDate,
            }
          });
          linkedFiatTxId = fiatTx.id;
        }
      }

      // Update Portfolio
      await tx.user_portfolios.update({
        where: { id: portfolio.id },
        data: {
          total_units: newUnits,
          average_buy_price: newAvgPrice,
          updated_at: new Date()
        }
      });

      // Create Asset Transaction Log
      await tx.asset_transactions.create({
         data: {
           user_id: userId,
           portfolio_id: portfolio.id,
           transaction_type: type,
           units,
           price_per_unit: price,
           total_amount: totalAmount,
           notes,
           transaction_date: txDate,
           linked_fiat_transaction_id: linkedFiatTxId
         }
      });
    });

    revalidatePath('/portfolios');
    revalidatePath('/portfolios/transactions');
    if (saveToWallet) {
       revalidatePath('/wallets');
       revalidatePath('/transactions'); 
    }

    return { success: true };
  } catch (error) {
    console.error("Gagal mencatat investasi:", error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan.' };
  }
}

export async function deleteInvestment(transactionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const tx = await prisma.asset_transactions.findUnique({
      where: { id: transactionId, user_id: session.user.id },
      include: { user_portfolios: true }
    });

    if (!tx) return { error: 'Transaksi tidak ditemukan.' };

    await prisma.$transaction(async (ptx) => {
       const p = tx.user_portfolios;
       const currentUnits = p.total_units || new Prisma.Decimal(0);
       
       // Revert Portfolio logic (Note: This is an estimation for AvgCost. Full recalculation normally needs total history)
       // To keep it simple, we only revert the units strictly.
       let newUnits = currentUnits;
       
       if (tx.transaction_type === 'BELI') {
         newUnits = currentUnits.sub(tx.units);
         // Prevent negative units (Edge case if they deleted buy but kept sell)
         if (newUnits.lt(0)) {
            throw new Error('Penghapusan ini akan membuat unit portofolio menjadi minus. Hapus transaksi penjualan terlebih dahulu.');
         }
       } else if (tx.transaction_type === 'JUAL') {
         newUnits = currentUnits.add(tx.units);
         // Also delete the linked fiat transaction if any
         if (tx.linked_fiat_transaction_id) {
           await ptx.fiat_transactions.delete({
             where: { id: tx.linked_fiat_transaction_id }
           });
         }
       }

       await ptx.user_portfolios.update({
         where: { id: p.id },
         data: { total_units: newUnits }
       });

       await ptx.asset_transactions.delete({
         where: { id: transactionId }
       });
    });

    revalidatePath('/portfolios');
    revalidatePath('/portfolios/transactions');
    revalidatePath('/wallets');
    revalidatePath('/transactions');
    return { success: true };
  } catch (error: any) {
    console.error("Gagal menghapus investasi:", error);
    return { error: error.message || 'Gagal menghapus transaksi.' };
  }
}
