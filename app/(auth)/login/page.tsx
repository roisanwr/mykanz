// app/(auth)/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // GSAP entrance — card flies up from below on mount
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { opacity: 0, y: 32, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, redirectTo: "/" });
    setLoading(false);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden"
      style={{ backgroundColor: "oklch(0.12 0.02 250)" }}
    >
      {/* Background decorative glow */}
      <div
        className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.72 0.18 55), transparent)" }}
      />
      <div
        className="absolute bottom-[-10%] left-[-5%] w-72 h-72 rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.16 145), transparent)" }}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="w-full max-w-md relative z-10"
        style={{ opacity: 0 }} // initial state for GSAP
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <img 
            src="/logomykanz.png" 
            alt="MyKanz Logo" 
            className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-2xl" 
          />
          <h1 className="font-display text-3xl font-black text-white tracking-tight">MyKanz</h1>
          <p className="text-sm mt-1.5" style={{ color: "oklch(0.65 0.04 250)" }}>
            Masuk untuk mulai kelola kekayaanmu.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Error state */}
          {errorUrl && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                {errorUrl === "CredentialsSignin"
                  ? "Email atau password tidak tepat. Coba lagi."
                  : "Terjadi kesalahan sistem. Coba sesaat lagi."}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                Alamat Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ backgroundColor: "oklch(0.72 0.18 55)" }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Masuk ke Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "oklch(0.55 0.03 250)" }}>
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-bold hover:opacity-80 transition-opacity"
              style={{ color: "oklch(0.72 0.18 55)" }}
            >
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}