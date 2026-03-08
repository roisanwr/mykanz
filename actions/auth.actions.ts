// actions/auth.actions.ts
'use server' // 👈 Ini kunci ajaibnya! Menandakan kode ini HANYA jalan di server (aman dari hacker)

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { signIn, signOut } from '../lib/auth' // Tambahkan signOut di sini
import { AuthError } from 'next-auth'


export async function registerUser(formData: FormData) {
  // 1. Tangkap data dari form yang dikirim user
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. Validasi sederhana (jangan sampai ada yang kosong!)
  if (!name || !email || !password) {
    throw new Error('Semua kolom wajib diisi, Bosku!')
  }

  // 3. Cek ke Database: Apakah email ini sudah ada yang punya?
  const existingUser = await prisma.users.findUnique({
    where: { email }
  })

  if (existingUser) {
    throw new Error('Email ini sudah terdaftar. Coba pakai email lain ya!')
  }

  // 4. Enkripsi Password! (Bcrypt akan mengacak password jadi kode rumit)
  const hashedPassword = await bcrypt.hash(password, 10)

  // 5. Simpan User Baru ke Database Kanz
  await prisma.users.create({
    data: {
      name,
      email,
      password_hash: hashedPassword
    }
  })

  // 6. Kalau sukses, tendang... eh, arahkan user ke halaman Login!
  redirect('/login')
}

export async function loginUser(formData: FormData) {
  try {
    // Memanggil fungsi signIn bawaan NextAuth v5
    // 'credentials' adalah nama provider yang kita setting di lib/auth.ts
    // redirectTo: '/' artinya kalau sukses, user langsung dilempar ke halaman utama (Dashboard)
    await signIn('credentials', Object.fromEntries(formData), { 
      redirectTo: '/' 
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          throw new Error('Waduh, Email atau Password-nya salah nih bosku! Coba cek lagi ya.')
        default:
          throw new Error('Ada gangguan di gerbang masuk. Coba beberapa saat lagi!')
      }
    }
    // Penting: Wajib di-throw ulang agar fitur redirect bawaan NextAuth bisa bekerja
    throw error; 
  }
}

// Fungsi untuk Logout (Keluar)
export async function logOut() {
  await signOut({ redirectTo: '/login' })
}