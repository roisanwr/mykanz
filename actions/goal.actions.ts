"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function createGoal(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const name = formData.get('name') as string;
    const targetAmountStr = formData.get('target_amount') as string;
    const isAssetTarget = formData.get('is_asset_target') === 'true';
    const assetId = formData.get('asset_id') as string | null;
    const targetAssetUnitsStr = formData.get('target_asset_units') as string | null;
    const deadlineStr = formData.get('deadline') as string;

    if (!name || (!isAssetTarget && !targetAmountStr) || (isAssetTarget && (!assetId || !targetAssetUnitsStr))) {
      return { error: 'Mohon lengkapi semua data wajib!' };
    }

    const cleanTargetAmount = targetAmountStr ? targetAmountStr.replace(/\./g, '').replace(',', '.') : '0';
    const cleanTargetAssetUnits = targetAssetUnitsStr ? targetAssetUnitsStr.replace(/\./g, '').replace(',', '.') : '0';

    const targetAmount = new Prisma.Decimal(cleanTargetAmount);
    const targetAssetUnits = new Prisma.Decimal(cleanTargetAssetUnits);
    const deadline = deadlineStr ? new Date(deadlineStr) : null;

    if ((!isAssetTarget && targetAmount.lte(0)) || (isAssetTarget && targetAssetUnits.lte(0))) {
      return { error: 'Target nominal harus lebih dari 0!' };
    }

    await (prisma.goals as any).create({
      data: {
        user_id: session.user.id,
        name,
        target_amount: isAssetTarget ? 1 : targetAmount,  // DB CHECK requires > 0, use 1 as placeholder for asset goals
        asset_id: isAssetTarget ? assetId : null,
        target_asset_units: isAssetTarget ? targetAssetUnits : null,
        current_amount: 0,
        current_asset_units: 0,
        deadline
      }
    });

    revalidatePath('/goals');
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat goal:", error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan target impian.' };
  }
}

export async function deleteGoal(goalId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const goal = await prisma.goals.findUnique({
      where: { id: goalId, user_id: session.user.id }
    });

    if (!goal) return { error: 'Target tidak ditemukan.' };

    await prisma.goals.delete({
      where: { id: goalId }
    });

    revalidatePath('/goals');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus goal:", error);
    return { error: 'Gagal menghapus target impian.' };
  }
}

export async function addFundsToGoal(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const goalId = formData.get('goal_id') as string;
    const amountStr = formData.get('amount') as string;
    const walletId = formData.get('wallet_id') as string;

    if (!goalId || !amountStr || !walletId) {
      return { error: 'Nominal tabungan dan Dompet sumber wajib diisi!' };
    }

    const cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');
    const amount = new Prisma.Decimal(cleanAmount);

    if (amount.lte(0)) {
       return { error: 'Nominal tabungan harus lebih dari 0!' };
    }

    const goal = await (prisma.goals as any).findUnique({
      where: { id: goalId, user_id: session.user.id }
    }) as any;

    if (!goal) return { error: 'Target Impian tidak ditemukan.' };
    
    if (goal.asset_id) {
       return { error: 'Target berbasis aset hanya bisa diupdate otomatis dari menu Investasi!' };
    }

    const userId = session.user.id as string;
    // Helper to get or create category Tabungan Impian
    const getOrCreateCategory = async (catName: string, catType: 'PEMASUKAN' | 'PENGELUARAN') => {
       let cat = await prisma.categories.findFirst({
         where: { user_id: userId, name: catName, type: catType }
       });
       if (!cat) {
         cat = await prisma.categories.create({
           data: { user_id: userId, name: catName, type: catType }
         });
       }
       return cat.id;
    };

    await prisma.$transaction(async (tx) => {
       // Catat pengeluaran di dompet
       const catId = await getOrCreateCategory('Tabungan Impian', 'PENGELUARAN');
       await tx.fiat_transactions.create({
         data: {
           user_id: userId,
           wallet_id: walletId,
           category_id: catId,
           transaction_type: 'PENGELUARAN',
           amount: amount,
           description: `Nabung untuk: ${goal.name}`,
         }
       });

       // Tambah progress goal
       const newAmount = (goal.current_amount || new Prisma.Decimal(0)).add(amount);
       await tx.goals.update({
         where: { id: goalId },
         data: { current_amount: newAmount, updated_at: new Date() }
       });
    });

    revalidatePath('/goals');
    revalidatePath('/wallets');
    return { success: true };
  } catch (error) {
    console.error("Gagal menabung:", error);
    return { error: 'Terjadi kesalahan sistem saat menabung.' };
  }
}
