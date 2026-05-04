import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.events.findMany({
      where: { user_id: session.user.id },
      orderBy: { start_date: 'asc' },
      include: {
        _count: {
          select: { fiat_transactions: true }
        },
        fiat_transactions: {
          select: { amount: true, transaction_type: true }
        }
      }
    });

    // Kalkulasi summary (opsional, frontend bisa juga yang kalkulasi, tapi ini mempermudah)
    const data = events.map(event => {
      let total_expense = 0;
      let total_income = 0;

      event.fiat_transactions.forEach(tx => {
        if (tx.transaction_type === 'PENGELUARAN') {
          total_expense += Number(tx.amount);
        } else if (tx.transaction_type === 'PEMASUKAN') {
          total_income += Number(tx.amount);
        }
      });

      const { fiat_transactions, ...rest } = event;
      return {
        ...rest,
        total_expense,
        total_income,
        transaction_count: event._count.fiat_transactions
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Gagal fetch events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, start_date, end_date, budget_limit } = body;

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Nama, Tanggal Mulai, dan Tanggal Selesai wajib diisi!' },
        { status: 400 }
      );
    }

    const event = await prisma.events.create({
      data: {
        user_id: session.user.id,
        name,
        description: description || null,
        start_date: new Date(`${start_date}T00:00:00.000Z`),
        end_date: new Date(`${end_date}T23:59:59.999Z`),
        budget_limit: budget_limit ? parseFloat(budget_limit) : null,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Event berhasil dibuat!', data: event },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat event:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID Event wajib dikirim!' },
        { status: 400 }
      );
    }

    await prisma.events.delete({
      where: { id, user_id: session.user.id },
    });

    return NextResponse.json(
      { success: true, message: 'Event berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus event:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus event.' },
      { status: 500 }
    );
  }
}
