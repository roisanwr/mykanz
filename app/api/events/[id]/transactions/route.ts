import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Pastikan event milik user ini
    const event = await prisma.events.findUnique({
      where: { id: eventId, user_id: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
    }

    const transactions = await prisma.fiat_transactions.findMany({
      where: { event_id: eventId, user_id: session.user.id },
      orderBy: { transaction_date: 'desc' },
      include: {
        categories: { select: { name: true, type: true } },
        wallets_fiat_transactions_wallet_idTowallets: { select: { name: true, currency: true } },
        wallets_fiat_transactions_to_wallet_idTowallets: { select: { name: true, currency: true } },
      },
    });

    return NextResponse.json({ success: true, data: transactions }, { status: 200 });
  } catch (error) {
    console.error('Gagal fetch event transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Untuk assign atau unassign transaksi ke event
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    // Pastikan event milik user ini
    const event = await prisma.events.findUnique({
      where: { id: eventId, user_id: session.user.id },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
    }

    const body = await req.json();
    const { transaction_id, action } = body;

    if (!transaction_id || !['assign', 'unassign'].includes(action)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    // Pastikan transaksi milik user ini
    const transaction = await prisma.fiat_transactions.findUnique({
      where: { id: transaction_id, user_id: session.user.id },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
    }

    await prisma.fiat_transactions.update({
      where: { id: transaction_id },
      data: { event_id: action === 'assign' ? eventId : null },
    });

    return NextResponse.json(
      { success: true, message: `Transaksi berhasil ${action === 'assign' ? 'ditambahkan ke' : 'dihapus dari'} event!` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal mengubah event transaksi:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
