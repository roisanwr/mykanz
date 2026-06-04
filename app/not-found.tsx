'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import Link from 'next/link'

export default function NotFound() {
  const pageRef   = useRef<HTMLDivElement>(null)
  const walletRef = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLDivElement>(null)
  const ctaRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(walletRef.current, { y: -80, opacity: 0 })
      gsap.set(textRef.current,   { y: 24,  opacity: 0 })
      gsap.set(ctaRef.current,    { y: 16,  opacity: 0 })

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.to(walletRef.current, { y: 0, opacity: 1, duration: 0.85, ease: 'back.out(1.4)' })
        .to(textRef.current,   { y: 0, opacity: 1, duration: 0.50 }, '-=0.25')
        .to(ctaRef.current,    { y: 0, opacity: 1, duration: 0.40 }, '-=0.22')

      // idle float
      gsap.to(walletRef.current, {
        y: -6, repeat: -1, yoyo: true, duration: 3.0, ease: 'sine.inOut', delay: 1.2,
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      {/* ── Scoped CSS: all hover magic lives here ── */}
      <style>{`
        .nf-page {
          min-height: 100vh;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          background: oklch(0.97 0.012 68);
          position: relative;
          font-family: var(--dm-sans), system-ui, sans-serif;
        }

        /* dot grid */
        .nf-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, oklch(0.68 0.04 60 / 0.30) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        /* ── Wallet wrapper ── */
        .nf-wallet {
          position: relative;
          width: 260px;
          height: 210px;
          cursor: pointer;
          perspective: 1000px;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          transition: transform 0.4s ease;
          margin-bottom: 10px;
          flex-shrink: 0;
        }

        /* Entry animation for cards */
        @keyframes nf-slide-in {
          0%   { transform: translateY(-80px); opacity: 0; }
          100% { transform: translateY(0);     opacity: 1; }
        }

        /* ── Wallet back ── */
        .nf-wallet-back {
          position: absolute;
          bottom: 0;
          width: 260px;
          height: 182px;
          background: linear-gradient(160deg, oklch(0.48 0.09 42) 0%, oklch(0.36 0.07 37) 60%, oklch(0.28 0.055 34) 100%);
          border-radius: 20px 20px 52px 52px;
          z-index: 5;
          box-shadow:
            inset 0 22px 32px oklch(0 0 0 / 0.35),
            inset 0 4px 12px oklch(0 0 0 / 0.40),
            0 20px 48px oklch(0.35 0.07 38 / 0.28),
            0  8px 20px oklch(0.30 0.06 36 / 0.18);
        }

        /* leather grain on wallet back */
        .nf-wallet-back::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='wb'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23wb)' opacity='0.10'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
          opacity: 0.8;
          pointer-events: none;
        }

        /* ── Cards ── */
        .nf-card {
          position: absolute;
          width: 242px;
          height: 132px;
          left: 9px;
          border-radius: 14px;
          padding: 16px;
          color: white;
          box-shadow:
            inset 0 1px 1px oklch(1 1 1 / 0.25),
            0 -3px 12px oklch(0 0 0 / 0.12);
          transition: transform 0.55s cubic-bezier(0.34, 1.45, 0.64, 1);
          animation: nf-slide-in 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
          overflow: hidden;
        }

        .nf-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 55%; height: 48%;
          background: linear-gradient(135deg, oklch(1 1 1 / 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .nf-card-inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          position: relative;
          z-index: 2;
        }

        .nf-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          opacity: 0.90;
        }

        .nf-chip {
          width: 30px;
          height: 22px;
          border-radius: 4px;
          background: linear-gradient(145deg, oklch(0.82 0.12 58) 0%, oklch(0.68 0.10 50) 100%);
          border: 1px solid oklch(0.90 0.14 62 / 0.35);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
          gap: 1px;
          padding: 3px;
        }
        .nf-chip-cell {
          background: oklch(0.72 0.11 52);
          border-radius: 1px;
        }
        .nf-chip-cell:nth-child(5) {
          background: oklch(0.86 0.13 60);
        }

        .nf-card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .nf-card-label {
          font-size: 7.5px;
          opacity: 0.65;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: block;
          margin-bottom: 2px;
        }
        .nf-card-value {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
        }
        .nf-card-num-wrap { text-align: right; }
        .nf-stars {
          font-size: 15px;
          letter-spacing: 2px;
          opacity: 0.70;
        }
        .nf-fullnum {
          display: none;
          font-size: 13px;
          letter-spacing: 1px;
          font-family: monospace;
          opacity: 0.80;
        }
        .nf-card:hover .nf-stars   { display: none; }
        .nf-card:hover .nf-fullnum { display: block; }

        /* duo circles logo */
        .nf-card-logo {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
        }
        .nf-logo-c1, .nf-logo-c2 {
          width: 18px;
          height: 18px;
          border-radius: 50%;
        }
        .nf-logo-c1 { margin-right: -7px; }

        /* ── Card variants ── */
        .nf-c1 {
          background: linear-gradient(135deg, oklch(0.62 0.185 47) 0%, oklch(0.50 0.165 41) 100%);
          bottom: 82px;
          z-index: 10;
          animation-delay: 0.08s;
        }
        .nf-c2 {
          background: linear-gradient(135deg, oklch(0.42 0.10 270) 0%, oklch(0.30 0.08 260) 100%);
          bottom: 58px;
          z-index: 20;
          animation-delay: 0.18s;
        }
        .nf-c3 {
          background: linear-gradient(135deg, oklch(0.38 0.09 158) 0%, oklch(0.28 0.07 153) 100%);
          bottom: 34px;
          z-index: 30;
          animation-delay: 0.28s;
        }

        /* ── Pocket (bottom) ── */
        .nf-pocket {
          position: absolute;
          bottom: 0;
          width: 260px;
          height: 148px;
          z-index: 40;
          filter: drop-shadow(0 12px 22px oklch(0.30 0.06 38 / 0.35));
        }

        .nf-pocket-content {
          position: absolute;
          top: 42px;
          width: 100%;
          text-align: center;
          z-index: 50;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .nf-bal-wrap {
          position: relative;
          height: 30px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nf-bal-stars {
          font-size: 22px;
          letter-spacing: 5px;
          color: oklch(0.58 0.06 44);
          transition: opacity 0.3s, transform 0.3s;
          font-family: var(--outfit);
        }

        .nf-bal-real {
          font-size: 22px;
          font-weight: 700;
          color: oklch(0.62 0.14 44);
          font-family: var(--outfit);
          opacity: 0;
          position: absolute;
          top: 0; left: 50%;
          transform: translate(-50%, 8px);
          transition: opacity 0.3s, transform 0.3s;
          letter-spacing: -0.02em;
          text-shadow: 0 0 16px oklch(0.68 0.16 47 / 0.35);
          white-space: nowrap;
        }

        .nf-bal-label {
          font-size: 10px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: oklch(0.56 0.07 44);
          font-weight: 500;
        }

        /* eye icon */
        .nf-eye-wrap {
          margin-top: 4px;
          height: 18px; width: 18px;
          position: relative;
          opacity: 0.30;
          transition: opacity 0.3s;
        }
        .nf-eye {
          position: absolute;
          top: 0; left: 0;
          stroke: oklch(0.60 0.14 45);
          transition: opacity 0.25s, transform 0.25s;
        }
        .nf-eye-closed { opacity: 1; }
        .nf-eye-open   { opacity: 0; transform: scale(0.6); }

        /* ── HOVER EFFECTS on .nf-wallet ── */
        .nf-wallet:hover {
          transform: translateY(-4px);
        }
        .nf-wallet:hover .nf-c1 {
          transform: translateY(-70px) rotate(-4deg);
        }
        .nf-wallet:hover .nf-c2 {
          transform: translateY(-44px) rotate(2.5deg);
        }
        .nf-wallet:hover .nf-c3 {
          transform: translateY(-12px) rotate(0deg);
        }

        /* individual card hover on top of wallet hover */
        .nf-wallet:hover .nf-c1:hover {
          transform: translateY(-82px) scale(1.04) rotate(0deg);
          z-index: 100;
        }
        .nf-wallet:hover .nf-c2:hover {
          transform: translateY(-76px) scale(1.04) rotate(0deg);
          z-index: 100;
        }
        .nf-wallet:hover .nf-c3:hover {
          transform: translateY(-62px) scale(1.04) rotate(0deg);
          z-index: 100;
        }

        /* balance reveal */
        .nf-wallet:hover .nf-bal-stars {
          opacity: 0;
          transform: translateY(-4px);
        }
        .nf-wallet:hover .nf-bal-real {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        .nf-wallet:hover .nf-eye-wrap {
          opacity: 1;
        }
        .nf-wallet:hover .nf-eye-closed { opacity: 0; transform: scale(0.5); }
        .nf-wallet:hover .nf-eye-open   { opacity: 1; transform: scale(1.1); }
      `}</style>

      <div ref={pageRef} className="nf-page">

        {/* ═══ WALLET ═══ */}
        <div ref={walletRef} className="nf-wallet">

          {/* Wallet back */}
          <div className="nf-wallet-back" />

          {/* Card 1 — MyKanz (amber) */}
          <div className="nf-card nf-c1">
            <div className="nf-card-inner">
              <div className="nf-card-top">
                <span>MyKanz</span>
                <div className="nf-chip">
                  {Array.from({length:9}).map((_,i)=>(
                    <div key={i} className="nf-chip-cell" />
                  ))}
                </div>
              </div>
              <div className="nf-card-bottom">
                <div>
                  <span className="nf-card-label">Holder</span>
                  <span className="nf-card-value">MYKANZ USER</span>
                </div>
                <div className="nf-card-num-wrap">
                  <div className="nf-stars">**** 7782</div>
                  <div className="nf-fullnum">5524 9910 7782</div>
                </div>
              </div>
            </div>
            <div className="nf-card-logo">
              <div className="nf-logo-c1" style={{background:'oklch(0.62 0.18 25 / 0.75)'}} />
              <div className="nf-logo-c2" style={{background:'oklch(0.82 0.16 55 / 0.75)'}} />
            </div>
          </div>

          {/* Card 2 — Invest (violet) */}
          <div className="nf-card nf-c2">
            <div className="nf-card-inner">
              <div className="nf-card-top">
                <span>Invest</span>
                <div className="nf-chip">
                  {Array.from({length:9}).map((_,i)=>(
                    <div key={i} className="nf-chip-cell" />
                  ))}
                </div>
              </div>
              <div className="nf-card-bottom">
                <div>
                  <span className="nf-card-label">Portfolio</span>
                  <span className="nf-card-value">GROWTH FUND</span>
                </div>
                <div className="nf-card-num-wrap">
                  <div className="nf-stars">**** 4291</div>
                  <div className="nf-fullnum">9012 4432 4291</div>
                </div>
              </div>
            </div>
            <div className="nf-card-logo">
              <div className="nf-logo-c1" style={{background:'oklch(0.55 0.15 270 / 0.75)'}} />
              <div className="nf-logo-c2" style={{background:'oklch(0.70 0.12 290 / 0.75)'}} />
            </div>
          </div>

          {/* Card 3 — Savings (emerald) */}
          <div className="nf-card nf-c3">
            <div className="nf-card-inner">
              <div className="nf-card-top">
                <span>Savings</span>
                <div className="nf-chip">
                  {Array.from({length:9}).map((_,i)=>(
                    <div key={i} className="nf-chip-cell" />
                  ))}
                </div>
              </div>
              <div className="nf-card-bottom">
                <div>
                  <span className="nf-card-label">Account</span>
                  <span className="nf-card-value">EMERGENCY</span>
                </div>
                <div className="nf-card-num-wrap">
                  <div className="nf-stars">**** 0038</div>
                  <div className="nf-fullnum">3312 0045 0038</div>
                </div>
              </div>
            </div>
            <div className="nf-card-logo">
              <div className="nf-logo-c1" style={{background:'oklch(0.45 0.14 158 / 0.75)'}} />
              <div className="nf-logo-c2" style={{background:'oklch(0.60 0.12 148 / 0.75)'}} />
            </div>
          </div>

          {/* Pocket */}
          <div className="nf-pocket">
            <svg className="nf-pocket-svg" viewBox="0 0 260 148" fill="none" style={{width:'100%',height:'100%'}}>
              <path
                d="M 0 18 C 0 9, 5 9, 9 9 C 18 9, 23 23, 37 23 L 223 23 C 237 23, 242 9, 251 9 C 255 9, 260 9, 260 18 L 260 110 C 260 143, 242 148, 223 148 L 37 148 C 18 148, 0 143, 0 110 Z"
                fill="oklch(0.40 0.08 40)"
              />
              <path
                d="M 7 20 C 7 14, 11 14, 14 14 C 21 14, 25 26, 37 26 L 223 26 C 235 26, 239 14, 246 14 C 249 14, 253 14, 253 20 L 253 110 C 253 138, 238 140, 223 140 L 37 140 C 22 140, 7 140, 7 110 Z"
                stroke="oklch(0.58 0.08 44)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              {/* leather grain hint */}
              <rect width="260" height="148" rx="18" fill="oklch(0.55 0.07 42)" opacity="0.04" />
            </svg>
            <div className="nf-pocket-content">
              <div className="nf-bal-wrap">
                <span className="nf-bal-stars">* * * * *</span>
                <span className="nf-bal-real">$0.00</span>
              </div>
              <div className="nf-bal-label">Total Balance</div>
              <div className="nf-eye-wrap">
                {/* eye-slash (default) */}
                <svg className="nf-eye nf-eye-closed" width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx={12} cy={12} r={3}/>
                  <line x1={3} y1={3} x2={21} y2={21}/>
                </svg>
                {/* eye-open (on hover) */}
                <svg className="nf-eye nf-eye-open" width={18} height={18} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx={12} cy={12} r={3}/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TEXT ═══ */}
        <div ref={textRef} style={{ textAlign: 'center', lineHeight: 1, marginBottom: '20px' }}>
          <div style={{
            fontFamily: 'var(--outfit)', fontWeight: 900,
            fontSize: 'clamp(4.5rem, 13vw, 7.5rem)',
            letterSpacing: '-0.05em', lineHeight: 0.88,
            color: 'oklch(0.32 0.07 40)',
          }}>
            404
          </div>
          <div style={{
            fontFamily: 'var(--outfit)', fontWeight: 700,
            fontSize: 'clamp(1.05rem, 3vw, 1.5rem)',
            letterSpacing: '-0.01em', lineHeight: 1,
            color: 'oklch(0.52 0.08 44)',
            marginTop: '6px',
          }}>
            Not Found
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div
          ref={ctaRef}
          style={{ display:'flex', gap:'0.6rem', justifyContent:'center', flexWrap:'wrap' }}
        >
          <Link
            href="/"
            id="not-found-home-btn"
            aria-label="Kembali ke beranda"
            style={{
              display:'inline-flex', alignItems:'center', gap:'0.45rem',
              padding:'0.62rem 1.45rem', borderRadius:'9999px',
              background:'oklch(0.60 0.145 44)',
              color:'#fff',
              fontFamily:'var(--dm-sans)', fontWeight:700,
              fontSize:'var(--text-sm)', textDecoration:'none',
              boxShadow:'0 4px 16px oklch(0.58 0.14 44 / 0.35), inset 0 1px 0 oklch(0.80 0.12 52 / 0.30)',
              transition:'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.05)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Kembali
          </Link>

          <Link
            href="/login"
            id="not-found-login-btn"
            aria-label="Masuk"
            style={{
              display:'inline-flex', alignItems:'center', gap:'0.45rem',
              padding:'0.62rem 1.45rem', borderRadius:'9999px',
              border:'1.5px solid oklch(0.72 0.07 50)',
              background:'transparent',
              color:'oklch(0.48 0.08 44)',
              fontFamily:'var(--dm-sans)', fontWeight:600,
              fontSize:'var(--text-sm)', textDecoration:'none',
              transition:'transform 0.2s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.04)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
          >
            Masuk
          </Link>
        </div>

        {/* footer */}
        <p style={{
          position:'absolute', bottom:'1.25rem',
          fontFamily:'var(--dm-sans)', fontSize:'var(--text-xs)',
          color:'oklch(0.68 0.04 55)', letterSpacing:'0.06em',
        }}>
          MyKanz · {new Date().getFullYear()}
        </p>
      </div>
    </>
  )
}
