// app/actions/wallet.ts
'use server'

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Set sebuah dompet sebagai default wallet user.
 * Dipakai sebagai fallback ketika smart routing tidak menemukan dompet yang cocok.
 */
export async function setDefaultWalletAction(walletId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Pastikan wallet ini milik user yang sedang login
    const wallet = await prisma.wallets.findFirst({
      where: { id: walletId, user_id: session.user.id, deleted_at: null },
      select: { id: true, name: true },
    });

    if (!wallet) {
      return { error: 'Dompet tidak ditemukan.' };
    }

    await prisma.users.update({
      where: { id: session.user.id },
      data: { default_wallet_id: walletId },
    });

    revalidatePath('/wallets');

    return { success: true, walletName: wallet.name };
  } catch (error: any) {
    console.error('setDefaultWalletAction error:', error);
    return { error: error.message || 'Gagal mengatur dompet utama.' };
  }
}
