"use server";

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export async function createBudget(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };
    
    const userId = session.user.id;

    const amountStr = formData.get('amount') as string;
    const period = formData.get('period') as string;
    const dateStr = formData.get('date') as string;
    
    // Multi category selection typically comes as multiple values with the same name if using native FormData, 
    // or we receive it as a comma separated string if we manually construct it in JS.
    const categoryIdsStr = formData.get('category_ids') as string;

    if (!amountStr || !period || !dateStr || !categoryIdsStr) {
      return { error: 'Mohon lengkapi semua data wajib!' };
    }

    const categoryIds = JSON.parse(categoryIdsStr) as string[];
    
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return { error: 'Harap pilih minimal 1 kategori!' };
    }

    const cleanAmount = amountStr.replace(/\./g, '').replace(',', '.');
    const amount = new Prisma.Decimal(cleanAmount);

    if (amount.lte(0)) {
       return { error: 'Limit Anggaran harus lebih dari 0!' };
    }

    // Determine start and end date based on period
    const bDate = new Date(dateStr);
    let startDate = new Date(bDate);
    let endDate = new Date(bDate);

    if (period === 'BULANAN') {
       startDate = new Date(bDate.getFullYear(), bDate.getMonth(), 1);
       endDate = new Date(bDate.getFullYear(), bDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'MINGGUAN') {
       // get monday
       const day = bDate.getDay();
       const diff = bDate.getDate() - day + (day === 0 ? -6 : 1);
       startDate = new Date(bDate.setDate(diff));
       startDate.setHours(0,0,0,0);
       endDate = new Date(startDate);
       endDate.setDate(startDate.getDate() + 6);
       endDate.setHours(23, 59, 59, 999);
    } else {
       return { error: 'Periode tidak valid' };
    }

    // Transaction to create Budget AND its associated categories
    await prisma.$transaction(async (tx) => {
       const budget = await tx.budgets.create({
         data: {
           user_id: userId,
           amount,
           period,
           start_date: startDate,
           end_date: endDate
         }
       });

       // Create relation
       const budgetCategoriesData = categoryIds.map(catId => ({
          budget_id: budget.id,
          category_id: catId
       }));

       await tx.budget_categories.createMany({
          data: budgetCategoriesData
       });
    });

    revalidatePath('/budgets');
    return { success: true };
  } catch (error) {
    console.error("Gagal membuat anggaran:", error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan anggaran.' };
  }
}

export async function deleteBudget(budgetId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Harap login terlebih dahulu!' };

    const budget = await prisma.budgets.findUnique({
      where: { id: budgetId, user_id: session.user.id }
    });

    if (!budget) return { error: 'Anggaran tidak ditemukan.' };

    await prisma.budgets.delete({
      where: { id: budgetId }
    });

    revalidatePath('/budgets');
    return { success: true };
  } catch (error) {
    console.error("Gagal menghapus anggaran:", error);
    return { error: 'Gagal menghapus anggaran.' };
  }
}
