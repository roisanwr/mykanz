// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth"

// Konfigurasi ini SUPER RINGAN, tanpa Prisma dan tanpa Bcrypt
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  providers: [], // Biarkan kosong dulu di sini
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig