"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const errorUrl = searchParams.get("error");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // GSAP entrance
  useGSAP(() => {
    if (!formRef.current) return;
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );
  }, { scope: formRef });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, redirectTo: "/" });
    setLoading(false); // Only reached if sign in fails or is interrupted
  };

  return (
    <div ref={formRef} className="opacity-0">
      
      <div className="mb-10 text-center lg:text-left">
        <h2 className="font-display text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Selamat Datang Kembali
        </h2>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Masuk ke akun MyKanz kamu untuk melanjutkan.
        </p>
      </div>

      {errorUrl && (
        <div 
          className="mb-8 flex items-start gap-3 p-4 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--color-expense-surface)', 
            borderColor: 'oklch(from var(--color-expense-500) l c h / 0.2)',
            color: 'var(--color-expense-600)'
          }}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            {errorUrl === "CredentialsSignin"
              ? "Email atau password tidak tepat. Coba lagi."
              : "Terjadi kesalahan sistem. Coba sesaat lagi."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Alamat Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            className="w-full px-5 py-3.5 rounded-xl text-sm font-medium transition-all outline-none"
            style={{ 
              backgroundColor: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--color-brand-400)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full px-5 py-3.5 pr-12 rounded-xl text-sm font-medium transition-all outline-none"
              style={{ 
                backgroundColor: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'var(--color-brand-400)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 transition-colors hover:scale-110"
              style={{ color: 'var(--color-text-disabled)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-disabled)'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2 shadow-lg"
          style={{ 
            backgroundImage: 'linear-gradient(to bottom right, var(--color-brand-400), var(--color-brand-600))',
            boxShadow: '0 8px 24px oklch(0.70 0.185 47 / 0.25)'
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Masuk ke Dashboard
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-bold transition-colors hover:underline underline-offset-4"
          style={{ color: 'var(--color-brand-500)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand-600)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-brand-500)'}
        >
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}