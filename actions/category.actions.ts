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
