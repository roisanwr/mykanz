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