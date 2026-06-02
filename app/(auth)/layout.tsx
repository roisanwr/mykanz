import { Hexagon } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row transition-colors duration-500" style={{ backgroundColor: 'var(--color-bg-base)' }}>
      {/* ── LEFT PANEL: ATMOSPHERE ── */}
      <div 
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ backgroundColor: 'oklch(0.155 0.025 250)' }} // Always deep dark navy
      >
        {/* Dynamic Abstract Meshes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Brand orange glow */}
          <div 
            className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-40 mix-blend-screen"
            style={{
              background: 'radial-gradient(circle at 20% 30%, oklch(0.70 0.185 47 / 0.8), transparent 50%)',
              filter: 'blur(80px)'
            }} 
          />
          {/* Wealth emerald glow */}
          <div 
            className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] opacity-30 mix-blend-screen"
            style={{
              background: 'radial-gradient(circle at 80% 80%, oklch(0.64 0.185 152 / 0.6), transparent 50%)',
              filter: 'blur(80px)'
            }} 
          />
          {/* Dot texture */}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
        </div>

        {/* Brand Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-3 w-fit group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-105"
               style={{ 
                 backgroundImage: 'linear-gradient(to bottom right, var(--color-brand-400), var(--color-brand-600))',
                 boxShadow: '0 8px 24px oklch(0.70 0.185 47 / 0.4)'
               }}>
            <Hexagon className="w-6 h-6 text-white" fill="currentColor" strokeWidth={1} />
          </div>
          <span className="font-display font-black text-2xl tracking-tight text-white">MyKanz</span>
        </Link>

        {/* Copy / Message */}
        <div className="relative z-10 max-w-lg mt-auto mb-16">
          <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-6 font-display tracking-tight">
            Kendalikan masa depan finansialmu.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'oklch(0.85 0.02 250)' }}>
            Satu tempat premium untuk mencatat, menganalisa, dan menumbuhkan kekayaanmu tanpa batas. 
            Tanpa ribet, tanpa kompromi.
          </p>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-sm font-medium" style={{ color: 'oklch(0.55 0.02 250)' }}>
          © {new Date().getFullYear()} MyKanz Inc.
        </div>
      </div>

      {/* ── RIGHT PANEL: FORM AREA ── */}
      <div 
        className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-32 relative z-10"
        style={{ backgroundColor: 'var(--color-bg-base)' }}
      >
        {/* Mobile Brand Header */}
        <div className="lg:hidden flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-105"
                 style={{ 
                   backgroundImage: 'linear-gradient(to bottom right, var(--color-brand-400), var(--color-brand-600))',
                   boxShadow: '0 8px 24px oklch(0.70 0.185 47 / 0.3)'
                 }}>
              <Hexagon className="w-7 h-7 text-white" fill="currentColor" strokeWidth={1} />
            </div>
            <span className="font-display font-black text-3xl tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              MyKanz
            </span>
          </Link>
        </div>

        {/* Form Container (Children) */}
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
