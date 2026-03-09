// actions/wallet.actions.ts
'use server'

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createWallet(formData: FormData) {
  try {
    // 1. Cek Autentikasi User
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Kamu harus login dulu ya!' };
    }

    // 2. Ambil data dari form Pop-up
    const name = formData.get('name') as string;
    const type = formData.get('type') as any; // Sesuai enum: 'TUNAI', 'BANK', 'DOMPET_DIGITAL'
    const currency = formData.get('currency') as string || 'IDR';

    if (!name || !type) {
      return { error: 'Nama dan Tipe dompet wajib diisi!' };
    }

    // 3. Simpan ke Database lewat Prisma
    await prisma.wallets.create({
      data: {
        user_id: session.user.id,
        name,
        type,
        currency,
      },
    });

    // 4. Jurus Sakti Next.js: Refresh data di halaman /wallets tanpa perlu F5 manual!
    revalidatePath('/wallets');
    
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat dompet:", error);
    return { error: 'Ups! Terjadi kesalahan saat menyimpan data.' };
  }
}

export async function updateWallet(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Kamu harus login dulu ya!' };

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as any;

    if (!id || !name || !type) return { error: 'Semua field wajib diisi!' };

    await prisma.wallets.update({
      where: { id, user_id: session.user.id },
      data: { name, type, updated_at: new Date() },
    });

    revalidatePath('/wallets');
    return { success: true };
  } catch (error) {
    console.error("Gagal update dompet:", error);
    return { error: 'Ups! Terjadi kesalahan saat menyimpan data.' };
  }
}

export async function deleteWallet(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Kamu harus login dulu ya!' };

    await prisma.wallets.update({
      where: { id, user_id: session.user.id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    revalidatePath('/wallets');
    return { success: true };
  } catch (error) {
    console.error("Gagal hapus dompet:", error);
    return { error: 'Ups! Gagal menghapus dompet.' };
  }
}

export async function getWalletHistory(walletId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Kamu harus login dulu ya!', data: [] };

    // Fetch transactions where wallet is source or destination
    const transactions = await prisma.fiat_transactions.findMany({
      where: {
        user_id: session.user.id,
        OR: [
          { wallet_id: walletId },
          { to_wallet_id: walletId }
        ]
      },
      orderBy: { transaction_date: 'desc' },
      take: 50,
      include: {
        categories: { select: { name: true } },
        wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true } },
        wallets_fiat_transactions_wallet_idTowallets: { select: { name: true } }
      }
    });

    // Format for frontend
    const formattedData = transactions.map(tx => {
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
        description: tx.description || '-'
      };
    });

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Gagal ambil history:", error);
    return { error: 'Gagal mengambil riwayat transaksi', data: [] };
  }
}