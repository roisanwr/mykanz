// app/api/categories/history/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Fetch transaction history for a specific category
// Usage: GET /api/categories/history?categoryId=<id>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId wajib dikirim!' },
        { status: 400 }
      );
    }

    // Validate ownership
    const category = await prisma.categories.findFirst({
      where: { id: categoryId, user_id: session.user.id },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan!' },
        { status: 404 }
      );
    }

    const whereClause: any = {
      user_id: session.user.id,
      category_id: categoryId,
    };

    if (startDate || endDate) {
      whereClause.transaction_date = {};
      if (startDate) {
        whereClause.transaction_date.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        whereClause.transaction_date.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: whereClause,
      orderBy: { transaction_date: 'desc' },
      include: {
        wallets_fiat_transactions_wallet_idTowallets: {
          select: { name: true, currency: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: transactions,
        categoryName: category.name,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal fetch histori kategori:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}
