// lib/auth.ts
import NextAuth, { CredentialsSignin } from "next-auth" // Tambahkan CredentialsSignin
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "./prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

// Buat class error custom supaya pesanmu tetap muncul!
class InvalidLoginError extends CredentialsSignin {
  code = "Email atau password salah, Bosku!"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null; // Balikin null alih-alih throw error kasar
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email as string }
        })

        // Jika user tidak ada atau password_hash kosong
        if (!user || !user.password_hash) {
          return null; 
        }

        const isPasswordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        // Jika password tidak cocok
        if (!isPasswordMatch) {
          return null; // Biarkan Auth.js yang menangani flow kegagalannya
        }

        return { id: user.id, name: user.name, email: user.email }
      }
    })
  ],
  // Tambahkan callback ini supaya kita bisa tangkap error dengan elegan
  pages: {
    signIn: '/login', // Arahkan balik ke halaman login kalau gagal
  }
})