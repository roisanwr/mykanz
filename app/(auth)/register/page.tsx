// app/(auth)/register/page.tsx
import { registerUser } from '@/actions/auth.actions'

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Buat Akun Kanz</h1>
          <p className="mt-2 text-sm text-gray-500">Langkah pertama menuju kebebasan finansial! 🚀</p>
        </div>

        {/* Pesta "Aha!" Momen:
          Lihat atribut action di bawah? Kita LANGSUNG memanggil fungsi registerUser 
          dari server action tanpa perlu fetch(), axios, atau state yang ribet! React 19 itu ajaib!
        */}
        <form action={registerUser} className="space-y-5">
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
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-bold hover:bg-blue-700 focus:ring-4 focus:ring-blue-600/30 transition-all active:scale-[0.98]"
          >
            Daftar Sekarang 🔥
          </button>
        </form>

      </div>
    </div>
  )
}