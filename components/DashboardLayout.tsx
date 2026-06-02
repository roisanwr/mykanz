'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu, Moon, Sun, Bell,
  LayoutDashboard, Wallet, Rocket, Target, PieChart,
  Settings, LogOut, User as UserIcon, X,
  ArrowRightLeft, Tags, ChevronDown, CalendarRange
} from 'lucide-react'
import PageTransition from '@/components/shared/PageTransition'
import type { AppUser } from '@/types'
import { signOut } from 'next-auth/react'

// ─── Types ────────────────────────────────────────────────────────────────────
type MenuItem = {
  name: string
  path?: string
  icon: React.ElementType
  badge?: string
  subItems?: { name: string; path: string }[]
}

// ─── Navigation config ────────────────────────────────────────────────────────
const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
  { name: 'Dompet & Kas', path: '/wallets',       icon: Wallet },
  { name: 'Transaksi',   path: '/transactions',  icon: ArrowRightLeft },
  { name: 'Event',       path: '/events',        icon: CalendarRange },
  { name: 'Kategori',    path: '/categories',    icon: Tags },
  {
    name: 'Portofolio',
    icon: Rocket,
    badge: 'DCA',
    subItems: [
      { name: 'Portofolio Saya', path: '/portfolios' },
      { name: 'Data Aset',       path: '/portfolios/assets' },
      { name: 'Investasi',       path: '/portfolios/transactions' },
    ],
  },
  { name: 'Target Impian', path: '/goals',   icon: Target },
  { name: 'Anggaran',      path: '/budgets', icon: PieChart },
]

// 5 tab untuk bottom navigation mobile (pilih yang paling penting)
const BOTTOM_NAV: MenuItem[] = [
  { name: 'Dashboard',  path: '/',            icon: LayoutDashboard },
  { name: 'Transaksi',  path: '/transactions', icon: ArrowRightLeft },
  { name: 'Portofolio', path: '/portfolios',   icon: Rocket },
  { name: 'Anggaran',   path: '/budgets',      icon: PieChart },
  { name: 'Pengaturan', path: '/settings',     icon: Settings },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
  user,
}: {
  children: React.ReactNode
  user: AppUser
}) {
  const pathname  = usePathname()
  const router    = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const [isMobileMenuOpen,   setIsMobileMenuOpen]   = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isProfileOpen,      setIsProfileOpen]      = useState(false)
  const [openMenus,          setOpenMenus]          = useState<Record<string, boolean>>({})
  const [isDarkMode,         setIsDarkMode]         = useState(false)
  const [mounted,            setMounted]            = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)

  const userName     = user?.name || 'Pengguna'
  const userInitials = userName.slice(0, 2).toUpperCase()
  const userEmail    = user?.email || ''

  // ── Init: baca theme dari DOM (sudah diset oleh anti-FOUC script) ──────────
  useEffect(() => {
    setMounted(true)
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  // ── Close profile dropdown saat klik di luar (fix bug lama) ──────────────
  useEffect(() => {
    if (!isProfileOpen) return
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    // Delay sedikit agar click yang membuka dropdown tidak langsung menutupnya
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 10)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [isProfileOpen])

  // ── Close mobile menu saat Escape ditekan ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Dark mode toggle ──────────────────────────────────────────────────────
  const toggleDarkMode = useCallback(() => {
    const html = document.documentElement
    const next = !isDarkMode
    html.classList.toggle('dark',  next)
    html.classList.toggle('light', !next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDarkMode(next)
  }, [isDarkMode])

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/login' })
    } catch { /* ignore */ }
  }

  // ── Sub-menu toggle ───────────────────────────────────────────────────────
  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // ── Helper: is path active ────────────────────────────────────────────────
  const isPathActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-[100dvh] overflow-hidden flex flex-col font-sans transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >

      {/* ════════════════════════════════════════════════════════════════════
          HEADER — Floating glass island
      ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 z-40 px-3 pt-3 pb-0 sm:px-4">
        <header className="card-glass flex items-center justify-between h-14 px-3 sm:px-5">

          {/* Left: hamburger (desktop) + logo */}
          <div className="flex items-center gap-3 flex-1">
            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              aria-label={isSidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              aria-expanded={!isSidebarCollapsed}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-brand-surface)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-brand-600)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'
              }}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <img
                  src="/logomykanz.png"
                  alt="MyKanz"
                  className="w-8 h-8 object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                  style={{ transitionDuration: 'var(--duration-slow)', transitionTimingFunction: 'var(--ease-spring)' }}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="font-display font-bold tracking-tight text-base leading-none group-hover:transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  MyKanz
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.15em] mt-0.5"
                  style={{ color: 'var(--color-brand-500)' }}
                >
                  Wealth
                </span>
              </div>
            </Link>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Dark mode toggle — hanya tampil setelah mount untuk hindari hydration mismatch */}
            {mounted && (
              <button
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-brand-surface)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-brand-600)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'
                }}
              >
                {isDarkMode
                  ? <Sun  className="w-4 h-4" />
                  : <Moon className="w-4 h-4" />
                }
              </button>
            )}

            {/* Bell — future: notifikasi real */}
            <button
              aria-label="Notifikasi"
              className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150"
              style={{ color: 'var(--color-text-tertiary)' }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-brand-surface)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-brand-600)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'
              }}
            >
              <Bell className="w-4 h-4" />
              {/* Dot: nanti dihubungkan ke notification count */}
              <span
                className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full border-2"
                style={{
                  backgroundColor: 'var(--color-brand-500)',
                  borderColor: 'var(--color-bg-surface)',
                }}
              />
            </button>

            {/* Separator */}
            <div
              className="hidden sm:block w-px h-5 mx-1"
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            {/* Profile avatar + dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(p => !p)}
                aria-label="Menu profil"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-150"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-brand-surface)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                }}
              >
                {/* Avatar circle — pakai brand color, bukan green aneh */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: 'var(--color-brand-500)' }}
                >
                  {userInitials}
                </div>
                {/* Nama (hidden on mobile) */}
                <span className="hidden sm:block text-sm font-semibold max-w-[100px] truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {userName.split(' ')[0]}
                </span>
              </button>

              {/* Dropdown profile */}
              {isProfileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  {/* User info */}
                  <div
                    className="px-4 py-3.5"
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ backgroundColor: 'var(--color-brand-500)' }}
                      >
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {userName}
                        </p>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                          {userEmail}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-brand-surface)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--color-brand-600)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                      }}
                    >
                      <UserIcon className="w-4 h-4" />
                      Profil Saya
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 mt-0.5"
                      style={{ color: 'var(--color-expense-600)' }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-expense-surface)'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BODY — Sidebar (desktop) + Main content
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden px-3 py-3 sm:px-4 gap-3 pb-[72px] lg:pb-3">

        {/* Mobile overlay backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: 'var(--color-bg-overlay)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        {/*
          Desktop behavior:
          - Expanded (default): w-[240px], labels visible
          - Collapsed (icon-rail): w-[64px], only icons, tooltip on hover
          
          Mobile behavior:
          - Hidden: translated off-screen left
          - Open: slides in as overlay (w-[240px])
        */}
        <aside
          aria-label="Navigasi utama"
          className={[
            // Base
            'card-glass flex flex-col h-full overflow-hidden shrink-0',
            'transition-all hide-scrollbar',
            // Mobile: fixed overlay
            'fixed top-0 bottom-0 left-0 z-50 lg:relative lg:z-auto',
            // Mobile open/close
            isMobileMenuOpen
              ? 'translate-x-3 mt-3 mb-3 lg:translate-x-0'
              : '-translate-x-full lg:translate-x-0',
            // Desktop width: expanded vs icon-only
            isSidebarCollapsed
              ? 'lg:w-16'   // 64px icon-only rail
              : 'lg:w-60',  // 240px full
            // Mobile always full width
            'w-60',
          ].join(' ')}
          style={{ transitionDuration: 'var(--duration-slow)', transitionTimingFunction: 'var(--ease-out-expo)' }}
        >
          {/* Mobile close button */}
          <div
            className="lg:hidden flex justify-end p-3 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
          >
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg-sunken)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable nav content */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-6 hide-scrollbar">

            {/* Main menu */}
            <div>
              {!isSidebarCollapsed && (
                <p
                  className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  Menu
                </p>
              )}
              <ul className="space-y-0.5">
                {MENU_ITEMS.map(item => {
                  const Icon = item.icon

                  if (item.subItems) {
                    const isOpen = openMenus[item.name]
                    const isAnySubActive = item.subItems.some(s => pathname === s.path)

                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => toggleMenu(item.name)}
                          title={isSidebarCollapsed ? item.name : undefined}
                          className={[
                            'w-full flex items-center px-3 py-2.5 rounded-xl font-semibold text-sm',
                            'transition-colors duration-150 relative group',
                            isSidebarCollapsed ? 'justify-center' : 'justify-between',
                          ].join(' ')}
                          style={{
                            backgroundColor: (isOpen || isAnySubActive) ? 'var(--color-brand-surface)' : '',
                            color: (isOpen || isAnySubActive)
                              ? 'var(--color-brand-600)'
                              : 'var(--color-text-secondary)',
                          }}
                          onMouseEnter={e => {
                            if (!isOpen && !isAnySubActive) {
                              ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-sunken)'
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isOpen && !isAnySubActive) {
                              ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                            }
                          }}
                        >
                          {/* Active accent bar */}
                          {(isOpen || isAnySubActive) && !isSidebarCollapsed && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                              style={{ backgroundColor: 'var(--color-brand-500)' }}
                            />
                          )}

                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className="w-4.5 h-4.5 shrink-0 transition-transform duration-150"
                              style={{ width: '1.125rem', height: '1.125rem' }}
                            />
                            {!isSidebarCollapsed && (
                              <span className="truncate">{item.name}</span>
                            )}
                          </div>

                          {!isSidebarCollapsed && (
                            <div className="flex items-center gap-2 shrink-0">
                              {item.badge && (
                                <span className="badge badge-wealth">{item.badge}</span>
                              )}
                              <ChevronDown
                                className="w-3.5 h-3.5 transition-transform duration-200"
                                style={{ transform: isOpen ? 'rotate(180deg)' : '' }}
                              />
                            </div>
                          )}
                        </button>

                        {/* Sub items — only shown when sidebar expanded */}
                        {!isSidebarCollapsed && (
                          <div
                            className="overflow-hidden transition-all"
                            style={{
                              maxHeight: isOpen ? '10rem' : '0',
                              opacity: isOpen ? 1 : 0,
                              transitionDuration: 'var(--duration-slow)',
                              transitionTimingFunction: 'var(--ease-out-expo)',
                            }}
                          >
                            <ul className="mt-0.5 space-y-0.5 pl-3">
                              {item.subItems.map(sub => {
                                const isSubActive = pathname === sub.path
                                return (
                                  <li key={sub.path}>
                                    <Link
                                      href={sub.path}
                                      aria-current={isSubActive ? 'page' : undefined}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="flex items-center pl-9 pr-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150"
                                      style={{
                                        backgroundColor: isSubActive ? 'var(--color-brand-surface)' : '',
                                        color: isSubActive ? 'var(--color-brand-600)' : 'var(--color-text-tertiary)',
                                      }}
                                      onMouseEnter={e => {
                                        if (!isSubActive) {
                                          ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-sunken)'
                                          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (!isSubActive) {
                                          ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                                          ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'
                                        }
                                      }}
                                    >
                                      {sub.name}
                                    </Link>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </li>
                    )
                  }

                  // ── Regular nav link ────────────────────────────────────
                  const isActive = isPathActive(item.path!)
                  return (
                    <li key={item.path}>
                      <Link
                        href={item.path!}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={isSidebarCollapsed ? item.name : undefined}
                        className={[
                          'flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold',
                          'transition-colors duration-150 relative',
                          isSidebarCollapsed ? 'justify-center' : 'gap-3',
                        ].join(' ')}
                        style={{
                          backgroundColor: isActive ? 'var(--color-brand-surface)' : '',
                          color: isActive ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-sunken)'
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                          }
                        }}
                      >
                        {/* Active accent bar */}
                        {isActive && !isSidebarCollapsed && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{ backgroundColor: 'var(--color-brand-500)' }}
                          />
                        )}

                        <Icon style={{ width: '1.125rem', height: '1.125rem', flexShrink: 0 }} />

                        {!isSidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>
                            {item.badge && (
                              <span className="badge badge-wealth">{item.badge}</span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* System menu (Settings) */}
            <div className="mt-auto">
              {!isSidebarCollapsed && (
                <p
                  className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--color-text-disabled)' }}
                >
                  Sistem
                </p>
              )}
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/settings"
                    title={isSidebarCollapsed ? 'Pengaturan' : undefined}
                    className={[
                      'flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold',
                      'transition-colors duration-150 group',
                      isSidebarCollapsed ? 'justify-center' : 'gap-3',
                    ].join(' ')}
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-sunken)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                    }}
                  >
                    <Settings
                      style={{ width: '1.125rem', height: '1.125rem', flexShrink: 0 }}
                      className="group-hover:rotate-90 transition-transform duration-300"
                    />
                    {!isSidebarCollapsed && <span>Pengaturan</span>}
                  </Link>
                </li>
              </ul>

              {/* Quote card — hanya saat sidebar expanded */}
              {!isSidebarCollapsed && (
                <div
                  className="mt-4 mx-1 p-4 rounded-xl border-l-2 relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-brand-surface)',
                    borderColor: 'var(--color-brand-400)',
                  }}
                >
                  <p
                    className="text-xs font-medium leading-relaxed italic"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    "Kekayaan sejati adalah waktu luangmu."
                  </p>
                </div>
              )}
            </div>
          </nav>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main
          className="flex-1 overflow-y-auto rounded-xl transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <PageTransition className="p-4 sm:p-6 lg:p-8 min-h-full">
            {children}
          </PageTransition>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM NAVIGATION — Mobile only (< lg)
          Floating pill style, backdrop blur, 5 tabs
      ════════════════════════════════════════════════════════════════════ */}
      <nav
        aria-label="Navigasi bawah"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3"
      >
        <div
          className="card-glass flex items-center justify-around py-2 px-1 rounded-2xl"
          style={{ boxShadow: 'var(--shadow-xl)' }}
        >
          {BOTTOM_NAV.map(item => {
            const Icon = item.icon
            const isActive = isPathActive(item.path!)

            return (
              <Link
                key={item.path}
                href={item.path!}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.name}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-150 min-w-0 flex-1"
                style={{
                  color: isActive ? 'var(--color-brand-500)' : 'var(--color-text-tertiary)',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'
                  }
                }}
              >
                <Icon
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: `transform var(--duration-fast) var(--ease-spring)`,
                  }}
                />
                <span
                  className="text-[10px] font-semibold truncate max-w-full"
                  style={{
                    opacity: isActive ? 1 : 0.7,
                    fontWeight: isActive ? 700 : 600,
                  }}
                >
                  {item.name}
                </span>
                {/* Active dot */}
                {isActive && (
                  <span
                    className="absolute bottom-2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-brand-500)' }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}