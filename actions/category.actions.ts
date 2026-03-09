"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { fiat_tx_type } from '@prisma/client';

export async function createCategory(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap masuk terlebih dahulu.' };

    const name = formData.get('name') as string;
    const type = formData.get('type') as fiat_tx_type;

    if (!name || name.trim() === '') {
      return { error: 'Nama kategori wajib diisi!' };
    }

    if (!type) {
      return { error: 'Tipe kategori (Pemasukan/Pengeluaran) wajib dipilih!' };
    }

    await prisma.categories.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        type: type,
      }
    });

    revalidatePath('/categories');
    revalidatePath('/transactions'); // Cause transactions use categories in Add form
    
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat kategori:", error);
    return { error: 'Terjadi kesalahan saat membuat kategori.' };
  }
}

export async function updateCategory(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Akses ditolak.' };

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as fiat_tx_type;

    if (!id || !name || !type) {
      return { error: 'Data tidak lengkap!' };
    }

    await prisma.categories.update({
      where: { id, user_id: session.user.id },
      data: { name: name.trim(), type }
    });

    revalidatePath('/categories');
    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error("Gagal update kategori:", error);
    return { error: 'Gagal memperbarui kategori.' };
  }
}

export async function deleteCategory(id: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Akses ditolak.' };

    // Soft delete so history records linked to this category don't break
    await prisma.categories.update({
      where: { id, user_id: session.user.id },
      data: { deleted_at: new Date() }
    });

    revalidatePath('/categories');
    revalidatePath('/transactions');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus kategori:", error);
    return { error: 'Gagal menghapus kategori.' };
  }
}

export async function getCategoryHistory(categoryId: string, startDate?: string, endDate?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Akses ditolak.', data: [] };

    // Validasi apakah kategori ini milik user (atau admin bisa bypass jika ada role)
    const category = await prisma.categories.findFirst({
      where: { id: categoryId, user_id: session.user.id }
    });

    if (!category) {
      return { error: 'Kategori tidak ditemukan!', data: [] };
    }

    const whereClause: any = {
      user_id: session.user.id,
      category_id: categoryId,
    };

    // Filter tanggal (Default: semua history jika tidak diisi)
    if (startDate || endDate) {
      whereClause.transaction_date = {};
      
      if (startDate) {
        // Start of day
        whereClause.transaction_date.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      
      if (endDate) {
        // End of day
        whereClause.transaction_date.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: whereClause,
      orderBy: { transaction_date: 'desc' },
      include: {
        wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
      }
    });

    return { success: true, data: transactions, categoryName: category.name };
  } catch (error) {
    console.error("Gagal fetch histori kategori:", error);
    return { error: 'Terjadi kesalahan sistem.', data: [] };
  }
}
