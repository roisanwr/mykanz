'use server'

import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Server Action Input Validation using Zod
const TransactionSchema = z.object({
  transaction_type: z.enum(['PEMASUKAN', 'PENGELUARAN', 'TRANSFER']),
  wallet_id: z.string().uuid("Wallet ID tidak valid"),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  description: z.string().optional().nullable(),
  transaction_date: z.string(),
  category_id: z.string().uuid("Category ID tidak valid").optional().nullable(),
  event_id: z.string().uuid("Event ID tidak valid").optional().nullable(),
  to_wallet_id: z.string().uuid("To Wallet ID tidak valid").optional().nullable(),
  admin_fee: z.number().min(0).optional(),
}).refine(data => {
  if (data.transaction_type === 'TRANSFER' && !data.to_wallet_id) {
    return false;
  }
  return true;
}, { message: "To Wallet ID wajib untuk transaksi TRANSFER", path: ["to_wallet_id"] });

export type TransactionPayload = z.infer<typeof TransactionSchema>

export async function createTransactionAction(payload: TransactionPayload) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // OWASP 2025: Validate input strictly before touching the ORM
    const validatedData = TransactionSchema.safeParse(payload)
    if (!validatedData.success) {
      return { error: 'Validasi gagal: ' + validatedData.error.issues[0].message }
    }

    const {
      transaction_type,
      wallet_id,
      amount,
      description,
      transaction_date,
      category_id,
      event_id,
      to_wallet_id,
      admin_fee = 0,
    } = validatedData.data

    const txDate = new Date(transaction_date)

    // Using interactive transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Create main transaction
      await tx.fiat_transactions.create({
        data: {
          user_id: session.user!.id!,
          wallet_id,
          transaction_type,
          amount,
          description: description || null,
          category_id: category_id || null,
          event_id: event_id || null,
          to_wallet_id: transaction_type === 'TRANSFER' ? to_wallet_id : null,
          transaction_date: txDate,
        },
      })

      // 2. If it's a TRANSFER with an admin fee, record the fee as an EXPENSE
      if (transaction_type === 'TRANSFER' && admin_fee > 0) {
        // Attempt to find a generic "Biaya Admin" category
        let adminCategory = await tx.categories.findFirst({
          where: {
            user_id: session.user!.id!,
            name: { contains: 'Admin', mode: 'insensitive' },
            type: 'PENGELUARAN',
          },
        })

        // Create if not exists to avoid nulls
        if (!adminCategory) {
          adminCategory = await tx.categories.create({
            data: {
              user_id: session.user!.id!,
              name: 'Biaya Admin',
              type: 'PENGELUARAN',
            },
          })
        }

        await tx.fiat_transactions.create({
          data: {
            user_id: session.user!.id!,
            wallet_id, // Fee taken from source wallet
            transaction_type: 'PENGELUARAN',
            amount: admin_fee,
            description: `Biaya Admin Transfer: ${description || 'Transfer Dana'}`,
            category_id: adminCategory.id,
            transaction_date: txDate,
          },
        })
      }
    })

    // Revalidate affected routes to ensure fresh data without SWR
    revalidatePath('/')
    revalidatePath('/transactions')
    revalidatePath('/wallets')

    return { success: true }
  } catch (error: any) {
    console.error('Server Action Error:', error)
    return { error: error.message || 'Gagal menyimpan transaksi' }
  }
}
