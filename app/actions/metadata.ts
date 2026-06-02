// app/actions/metadata.ts
'use server'

import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function getTransactionFormMetadata() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    const [wallets, categories, events] = await Promise.all([
      prisma.wallets.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, name: true, currency: true },
        orderBy: { name: 'asc' },
      }),
      prisma.categories.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
      prisma.events.findMany({
        where: { user_id: userId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        wallets,
        categories,
        events,
      },
    };
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return { error: 'Gagal memuat metadata form' };
  }
}
