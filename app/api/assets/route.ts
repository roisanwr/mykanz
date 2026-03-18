// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { asset_type } from '@prisma/client';

// GET: Fetch all assets for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assets = await prisma.assets.findMany({
      where: { user_id: session.user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: assets }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new asset
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      asset_type: type,
      ticker_symbol: rawTicker,
      unit_name = 'unit',
      currency = 'IDR',
    } = body as {
      name: string;
      asset_type: asset_type;
      ticker_symbol?: string;
      unit_name?: string;
      currency?: string;
    };

    const ticker_symbol = rawTicker ? rawTicker.trim().toUpperCase() : null;

    if (!name || name.trim() === '' || !type) {
      return NextResponse.json(
        { error: 'Nama Aset & Jenis Aset wajib diisi!' },
        { status: 400 }
      );
    }

    if (ticker_symbol) {
      const existing = await prisma.assets.findFirst({
        where: { user_id: session.user.id, asset_type: type, ticker_symbol },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Ticker ${ticker_symbol} sudah ada untuk aset jenis ${type}!` },
          { status: 409 }
        );
      }
    }

    const newAsset = await prisma.assets.create({
      data: {
        user_id: session.user.id,
        name: name.trim(),
        asset_type: type,
        ticker_symbol,
        unit_name,
        currency,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Aset berhasil dibuat!', data: newAsset },
      { status: 201 }
    );
  } catch (error) {
    console.error('Gagal membuat aset:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing asset
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, ticker_symbol: rawTicker, unit_name } = body;

    if (!id || !name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nama Aset wajib diisi!' },
        { status: 400 }
      );
    }

    const ticker_symbol = rawTicker ? rawTicker.trim().toUpperCase() : null;

    const asset = await prisma.assets.findFirst({
      where: { id, user_id: session.user.id },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Aset tidak ditemukan atau bukan milik Anda.' },
        { status: 404 }
      );
    }

    const updatedAsset = await prisma.assets.update({
      where: { id },
      data: {
        name: name.trim(),
        ticker_symbol,
        unit_name,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: 'Aset berhasil diupdate!', data: updatedAsset },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Gagal mengubah aset:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ticker sudah terpakai!' }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengupdate.' },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete an asset
// Usage: DELETE /api/assets?id=<id>
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
        { error: 'ID Aset wajib dikirim!' },
        { status: 400 }
      );
    }

    await prisma.assets.delete({
      where: { id, user_id: session.user.id },
    });

    return NextResponse.json(
      { success: true, message: 'Aset berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Gagal menghapus aset:', error);
    return NextResponse.json(
      {
        error:
          'Gagal menghapus aset. Pastikan aset ini tidak terikat dengan data penting.',
      },
      { status: 500 }
    );
  }
}
