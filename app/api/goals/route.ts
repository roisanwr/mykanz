// app/api/goals/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET: Fetch all goals for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await (prisma.goals as any).findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ success: true, data: goals }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new savings goal
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      target_amount,
      is_asset_target = false,
      asset_id = null,
      target_asset_units = null,
      deadline = null,
    } = body;

    if (
      !name ||
      (!is_asset_target && !target_amount) ||
      (is_asset_target && (!asset_id || !target_asset_units))
    ) {
      return NextResponse.json(
        { error: 'Mohon lengkapi semua data wajib!' },
        { status: 400 }
      );
    }

    const parsedTargetAmount = new Prisma.Decimal(is_asset_target ? 1 : String(target_amount));
    const parsedTargetAssetUnits = target_asset_units
      ? new Prisma.Decimal(String(target_asset_units))
      : null;

    if (!is_asset_target && parsedTargetAmount.lte(0)) {
      return NextResponse.json(
        { error: 'Target nominal harus lebih dari 0!' },
        { status: 400 }
      );
    }

    const newGoal = await (prisma.goals as any).create({
      data: {
        user_id: session.user.id,
        name,
        target_amount: parsedTargetAmount,
        asset_id: is_asset_target ? asset_id : null,
        target_asset_units: is_asset_target ? parsedTargetAssetUnits : null,
        current_amount: 0,
        current_asset_units: 0,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Target impian berhasil dibuat!', data: newGoal },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat goal:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat menyimpan target impian.' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a goal
// Usage: DELETE /api/goals?id=<id>
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
        { error: 'ID Goal wajib dikirim!' },
        { status: 400 }
      );
    }

    const goal = await prisma.goals.findUnique({
      where: { id, user_id: session.user.id },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Target tidak ditemukan.' },
        { status: 404 }
      );
    }

    await prisma.goals.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: 'Target impian berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus goal:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus target impian.' },
      { status: 500 }
    );
  }
}
