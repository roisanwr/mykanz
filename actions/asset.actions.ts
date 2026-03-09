"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { asset_type } from '@prisma/client';

export async function createAsset(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const name = formData.get('name') as string;
    const type = formData.get('asset_type') as asset_type;
    const tickerStr = formData.get('ticker_symbol') as string;
    const ticker_symbol = tickerStr ? tickerStr.trim().toUpperCase() : null;
    const unit_name = (formData.get('unit_name') as string) || 'unit';
    const currency = (formData.get('currency') as string) || 'IDR';

    if (!name || name.trim() === '' || !type) {
      return { error: 'Nama Aset & Jenis Aset wajib diisi!' };
    }

    // Check for unique (type, ticker) combination per user if ticker exists
    if (ticker_symbol) {
      const existing = await prisma.assets.findFirst({
        where: { user_id: session.user.id, asset_type: type, ticker_symbol }
      });
      if (existing) {
        return { error: `Ticker ${ticker_symbol} sudah ada untuk aset jenis ${type}!` };
      }
    }

    await prisma.assets.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        asset_type: type,
        ticker_symbol,
        unit_name,
        currency,
      }
    });

    revalidatePath('/portfolios/assets');
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat aset:", error);
    return { error: 'Terjadi kesalahan sistem.' };
  }
}

export async function updateAsset(assetId: string, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const name = formData.get('name') as string;
    const tickerStr = formData.get('ticker_symbol') as string;
    const ticker_symbol = tickerStr ? tickerStr.trim().toUpperCase() : null;
    const unit_name = (formData.get('unit_name') as string) || 'unit';

    if (!name || name.trim() === '') {
      return { error: 'Nama Aset wajib diisi!' };
    }

    // Check ownership
    const asset = await prisma.assets.findFirst({
      where: { id: assetId, user_id: session.user.id }
    });
    if (!asset) return { error: 'Aset tidak ditemukan atau data milik global.' };

    await prisma.assets.update({
      where: { id: assetId },
      data: {
        name: name.trim(),
        ticker_symbol,
        unit_name,
        updated_at: new Date()
      }
    });

    revalidatePath('/portfolios/assets');
    return { success: true };
  } catch (error: any) {
    console.error("Gagal mengubah aset:", error);
    if (error.code === 'P2002') return { error: 'Ticker sudah terpakai!' };
    return { error: 'Terjadi kesalahan saat mengupdate.' };
  }
}

export async function deleteAsset(assetId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Tolak akses!' };

    await prisma.assets.delete({
      where: { id: assetId, user_id: session.user.id }
    });

    revalidatePath('/portfolios');
    revalidatePath('/portfolios/assets');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus aset:", error);
    return { error: 'Gagal menghapus aset. Pastikan aset ini tidak terikat dengan data penting.' };
  }
}
