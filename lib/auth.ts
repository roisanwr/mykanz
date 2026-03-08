// lib/auth.ts
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "./prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config" // Ambil konfigurasi satpam

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig, // Gabungkan di sini
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi, Bosku!")
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password_hash) {
          throw new Error("Email tidak terdaftar, yuk daftar dulu!")
        }

        const isPasswordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )

        if (!isPasswordMatch) {
          throw new Error("Password-nya salah nih, coba ingat-ingat lagi!")
        }

        return { id: user.id, name: user.name, email: user.email }
      }
    })
  ],
})