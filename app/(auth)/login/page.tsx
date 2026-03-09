"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  // Ambil pesan error dari URL jika ada
  const errorUrl = searchParams.get("error"); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Memanggil signIn dari next-auth/react
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/", // Ke dashboard jika sukses
    });

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white shadow-xl rounded-2xl w-full max-w-md border border-gray-100">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-600">MyKanz</h1>
        <p className="text-gray-500 text-center mb-8">Masuk untuk kelola cuanmu!</p>

        {/* --- AREA AHA! MOMEN: NOTIFIKASI ERROR --- */}
        {errorUrl && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg animate-pulse">
            <p className="font-bold">Waduh!</p>
            <p className="text-sm">
              {errorUrl === "CredentialsSignin" 
                ? "Email atau Password salah, cek lagi ya Bosku!" 
                : "Terjadi kesalahan sistem, coba sesaat lagi."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 shadow-lg active:scale-95"
            }`}
          >
            {loading ? "Sabar ya, lagi dicek..." : "Masuk Sekarang 🚀"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/register" className="text-blue-600 font-bold hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}