"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { fiat_tx_type } from '@prisma/client';

export async function createTransaction(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const transaction_type = formData.get('transaction_type') as fiat_tx_type;
    const wallet_id = formData.get('wallet_id') as string;
    const amountStr = formData.get('amount') as string;
    const amount = amountStr ? parseFloat(amountStr) : 0;
    const description = formData.get('description') as string || null;
    
    if (!transaction_type || !wallet_id || amount <= 0) {
      return { error: 'Data tidak lengkap atau jumlah tidak valid!' };
    }

    const payload: any = {
      user_id: session.user.id,
      transaction_type,
      wallet_id,
      amount,
      description,
    };

    if (transaction_type === 'TRANSFER') {
      const to_wallet_id = formData.get('to_wallet_id') as string;
      if (!to_wallet_id || wallet_id === to_wallet_id) {
        return { error: 'Dompet tujuan tidak valid!' };
      }
      payload.to_wallet_id = to_wallet_id;
    } else {
      const category_id = formData.get('category_id') as string;
      if (category_id) {
        payload.category_id = category_id;
      }
    }

    await prisma.fiat_transactions.create({ data: payload });

    revalidatePath('/transactions');
    revalidatePath('/wallets'); // Update wallet balances immediately!
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat transaksi:", error);
    return { error: 'Terjadi kesalahan sistem.' };
  }
}

export async function deleteTransaction(txId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Tidak ada akses!' };

    await prisma.fiat_transactions.delete({
      where: { id: txId, user_id: session.user.id }
    });

    revalidatePath('/transactions');
    revalidatePath('/wallets');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus tx:", error);
    return { error: 'Gagal menghapus transaksi.' };
  }
}

export async function getTransactions(
  filterType?: fiat_tx_type | 'SEMUA', 
  filterWalletId?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login!', data: [] };

    // Build Where Clause
    const whereClause: any = { user_id: session.user.id };
    
    if (filterType && filterType !== 'SEMUA') {
      whereClause.transaction_type = filterType;
    }
    
    if (filterWalletId) {
      // If a wallet is selected, we want transactions where it's the source OR the destination
      whereClause.OR = [
        { wallet_id: filterWalletId },
        { to_wallet_id: filterWalletId }
      ];
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: whereClause,
      orderBy: { transaction_date: 'desc' },
      take: 100, // Fetch up to 100 recent globally
      include: {
        categories: { select: { name: true, type: true } },
        wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
        wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } }
      }
    });

    return { success: true, data: transactions };
  } catch (error) {
    console.error("Gagal fetch txs:", error);
    return { error: 'Gagal mengambil data transaksi.', data: [] };
  }
}
