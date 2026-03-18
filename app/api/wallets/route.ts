// app/api/wallets/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth'; // Sesuaikan lokasi import auth kamu ya

// 🚀 POST: Untuk Membuat Wallet Baru (Pengganti createWallet)
export async function POST(req: Request) {
  try {
    // 1. Cek Autentikasi (Sama kayak sebelumnya)
    const session = await auth();
    if (!session?.user?.id) {
      // Bedanya: Kita kembalikan error dengan HTTP Status 401 (Unauthorized)
      return NextResponse.json({ error: 'Kamu harus login dulu ya!' }, { status: 401 });
    }

    // 2. Ambil data dari Body (Sekarang kita pakai JSON, bukan FormData lagi!)
    const body = await req.json();
    const { name, type, currency = 'IDR' } = body;

    if (!name || !type) {
      // Bedanya: Error validasi pakai HTTP Status 400 (Bad Request)
      return NextResponse.json({ error: 'Nama dan Tipe dompet wajib diisi!' }, { status: 400 });
    }

    // 3. Simpan ke Database
    const newWallet = await prisma.wallets.create({
      data: {
        user_id: session.user.id,
        name,
        type,
        currency,
      },
    });

    // 4. BERHASIL! Kita kembalikan data yang baru dibuat dengan Status 201 (Created)
    // PERHATIKAN: Tidak ada lagi revalidatePath! API murni nggak peduli sama tampilan UI.
    return NextResponse.json(
      { success: true, message: 'Dompet berhasil dibuat!', data: newWallet },
      { status: 201 }
    );

  } catch (error) {
    console.error("Gagal membuat dompet via API:", error);
    // Bedanya: Error server pakai HTTP Status 500 (Internal Server Error)
    return NextResponse.json({ error: 'Ups! Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// 🚀 GET: Untuk Mengambil Daftar Wallet (Contoh tambahan biar komplit!)
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const wallets = await prisma.wallets.findMany({
      where: { user_id: session.user.id, deleted_at: null },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ success: true, data: wallets }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 🚀 PUT: Untuk Mengupdate Dompet (Pengganti updateWallet)
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kamu harus login dulu ya!' }, { status: 401 });
    }

    // Ambil data dari Body JSON
    const body = await req.json();
    const { id, name, type } = body;

    if (!id || !name || !type) {
      return NextResponse.json({ error: 'Semua field wajib diisi!' }, { status: 400 });
    }

    // Update ke Database
    const updatedWallet = await prisma.wallets.update({
      where: { id: id, user_id: session.user.id }, // Pastikan cuma dompet miliknya sendiri yang bisa diedit
      data: { name, type, updated_at: new Date() },
    });

    return NextResponse.json(
      { success: true, message: 'Dompet berhasil diupdate!', data: updatedWallet },
      { status: 200 } // Status 200 berarti "OK"
    );
  } catch (error) {
    console.error("Gagal update dompet via API:", error);
    return NextResponse.json({ error: 'Ups! Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// 🚀 DELETE: Untuk Menghapus Dompet (Pengganti deleteWallet)
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Kamu harus login dulu ya!' }, { status: 401 });
    }

    // Trik API: Ambil ID dari URL pencarian (contoh: /api/wallets?id=abc-123)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Dompet wajib dikirim!' }, { status: 400 });
    }

    // Soft Delete (hanya update deleted_at, sesuai logikamu sebelumnya)
    await prisma.wallets.update({
      where: { id: id, user_id: session.user.id },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });

    return NextResponse.json(
      { success: true, message: 'Dompet berhasil dihapus!' },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gagal hapus dompet via API:", error);
    return NextResponse.json({ error: 'Ups! Gagal menghapus dompet.' }, { status: 500 });
  }
}
