// app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const result = await res.json()
      if (!res.ok || result?.error) {
        setError(result.error || 'Gagal membuat akun.')
      } else {
        router.push('/login')
      }
    } catch {
      setError('Gagal terhubung ke server.')
    }
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Buat Akun MyKanz</h1>
          <p className="mt-2 text-sm text-gray-500">Langkah pertama menuju kebebasan finansial! 🚀</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Panggilan</label>
            <input
              type="text"
              name="name"
              required
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="Misal: Sultan Depok"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Aktif</label>
            <input
              type="email"
              name="email"
              required
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="bosku@uangbanyak.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password Rahasia</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              placeholder="Minimal 6 karakter ya!"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang 🔥'}
          </button>
        </form>

      </div>
    </div>
  )
}