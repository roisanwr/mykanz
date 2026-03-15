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