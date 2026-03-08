// app/(auth)/login/page.tsx
import { loginUser } from '../../../actions/auth.actions' // Sesuaikan titik-titiknya kayak kemaren ya bosku!
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
            {/* Icon gembok sederhana pakai SVG */}
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Selamat Datang!</h1>
          <p className="mt-2 text-sm text-gray-500">Masuk ke akun Kanz untuk memantau kekayaanmu 💸</p>
        </div>

        {/* Form Login yang langsung memanggil Server Action loginUser */}
        <form action={loginUser} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="bosku@uangbanyak.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-600/30 transition-all active:scale-[0.98]"
          >
            Masuk ke Dashboard 🚀
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">
            Daftar di sini
          </Link>
        </p>

      </div>
    </div>
  )
}