// components/DashboardLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Menu, Bitcoin, Moon, Bell, LayoutDashboard, 
  Wallet, Rocket, Target, PieChart, Settings, Leaf, 
  LogOut, User as UserIcon, X, ArrowRightLeft, Tags, ChevronDown
} from 'lucide-react'

// Define a type for menu items to fix TS errors
type MenuItem = {
  name: string
  path?: string // Optional because parents might not have a direct path
  icon: React.ElementType
  badge?: string
  subItems?: { name: string, path: string }[]
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Dompet & Kas', path: '/wallets', icon: Wallet },
  { name: 'Transaksi', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Kategori', path: '/categories', icon: Tags },
  { 
    name: 'Portofolio', 
    icon: Rocket, 
    badge: 'DCA',
    subItems: [
      { name: 'Portofolio Saya', path: '/portfolios' },
      { name: 'Data Aset', path: '/portfolios/assets' },
      { name: 'Investasi', path: '/portfolios/transactions' }
    ]
  },
  { name: 'Target Impian', path: '/goals', icon: Target },
  { name: 'Anggaran', path: '/budgets', icon: PieChart },
]

export default function DashboardLayout({ children, user }: { children: React.ReactNode, user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false) 
  const [isProfileOpen, setIsProfileOpen] = useState(false) 
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})

  const userName = user?.name || 'Sultan'
  const userInitials = userName.charAt(0).toUpperCase()

  // ==========================================
  // FITUR DARK MODE SPESIAL SPARKY 🦇
  // ==========================================
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Cek tema saat komponen pertama kali dimuat (anti reset pas refresh!)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    // Kalau sebelumnya user milih dark, ATAU belum pernah milih tapi sistem OS-nya dark
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setIsDarkMode(false)
    }
  }, [])

  // Fungsi toggle yang langsung menyimpan pilihan ke Browser Storage
  const toggleDarkMode = () => {
    const html = document.documentElement
    if (isDarkMode) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  const handleLogout = async () => {
    try {
      // Use NextAuth's built-in signout GET endpoint which handles session teardown + redirect
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch { /* ignore */ } finally {
      router.push('/login');
    }
  };

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  return (
    // Background utama: Slate-50 di mode terang (sangat bersih), Slate-900 di mode gelap
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* ==========================================
          1. HEADER PREMIUM
          ========================================== */}
      <div className="w-full shrink-0 z-40 p-4 pb-0">
        <header className="bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 shadow-sm rounded-2xl flex items-center justify-between py-3 px-4 sm:px-6 transition-colors">
          
          <div className="flex items-center space-x-4 flex-1 justify-start">
            {/* Tombol Menu Mobile */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden text-slate-500 hover:text-orange-500 dark:text-slate-400 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            {/* Tombol Menu Desktop - Mengontrol Hilangnya Sidebar */}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:block text-slate-500 hover:text-orange-500 dark:text-slate-400 transition-colors p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-slate-700">
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform duration-300">
                <Bitcoin className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-orange-600 transition-colors">
                  Kanz.
                </h1>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                  Wealth
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 justify-end">
            <button onClick={toggleDarkMode} className="text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-all hover:rotate-12 p-2">
              <Moon className="w-5 h-5" />
            </button>

            <button className="relative text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-all hover:scale-110 p-2">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white dark:border-slate-800"></span>
            </button>

            <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center focus:outline-none hover:scale-105 transition-transform"
              >
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl w-10 h-10 flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-500/20 border border-emerald-400/50">
                  {userInitials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                  <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{userName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                  </div>
                  
                  <div className="p-2">
                    <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                      <UserIcon className="w-4 h-4 mr-3" /> Profil Saya
                    </Link>
                    
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-3" /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* ==========================================
          2. SIDEBAR & KONTEN BAWAH
          ========================================== */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-4">
        
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* SIDEBAR WRAPPER: Menyusut jadi 0px kalau ditutup! */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out h-full
          ${isMobileMenuOpen ? 'translate-x-4 w-[260px]' : '-translate-x-[150%] lg:translate-x-0'}
          ${isSidebarCollapsed ? 'lg:w-0 lg:opacity-0 lg:mr-0 lg:pointer-events-none' : 'lg:w-[260px] lg:mr-4 lg:opacity-100'}
        `}>
          
          {/* Inner Sidebar: Lebar tetap 260px biar isinya nggak gepeng pas animasi menyusut */}
          <aside className="w-[260px] h-full bg-white dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm flex flex-col overflow-hidden transition-colors">
            
            <div className="lg:hidden p-4 flex justify-end border-b border-slate-100 dark:border-slate-700">
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-orange-600 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 px-3 flex flex-col hide-scrollbar">
              
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Menu Navigasi</p>
              
              <ul className="space-y-1.5">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon
                  
                  if (item.subItems) {
                    const isOpen = openMenus[item.name]
                    
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className={`w-full flex items-center justify-between px-3 py-3 rounded-xl font-semibold transition-all group relative overflow-hidden
                            ${isOpen ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-orange-600'}
                          `}
                        >
                          {isOpen && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full"></div>
                          )}
                          <div className="flex items-center">
                            <Icon className={`w-5 h-5 mr-3 relative z-10 ${isOpen ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="relative z-10">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.badge && (
                              <span className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 py-0.5 px-2 rounded-md text-[10px] font-bold">
                                {item.badge}
                              </span>
                            )}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        
                        <div 
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
                        >
                           <div className="space-y-1 py-1">
                             {item.subItems.map(subItem => {
                               // Fix bug: only exactly match the path to avoid /portfolios/transactions highlighting /portfolios too.
                               const isSubActive = pathname === subItem.path
                               return (
                                 <Link
                                   key={subItem.path}
                                   href={subItem.path}
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className={`block px-3 pl-12 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                     isSubActive 
                                       ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' 
                                       : 'text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                   }`}
                                 >
                                   {subItem.name}
                                 </Link>
                               )
                             })}
                           </div>
                        </div>
                      </li>
                    )
                  }

                  // Normal Link rendering (No SubItems)
                  const isActive = pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link href={item.path as string} onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-3 rounded-xl font-semibold transition-all group relative overflow-hidden
                          ${isActive 
                            ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-orange-600'
                          }
                        `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full"></div>
                        )}
                        
                        <Icon className={`w-5 h-5 mr-3 relative z-10 ${isActive ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} />
                        
                        <span className="relative z-10">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 py-0.5 px-2 rounded-md text-[10px] font-bold">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-8 mb-3">Sistem</p>
              
              <ul className="space-y-1.5">
                <li>
                  <Link href="/settings" className="flex items-center px-3 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-orange-600 rounded-xl transition-all font-semibold group">
                    <Settings className="w-5 h-5 mr-3 group-hover:rotate-90 transition-all duration-300" />
                    <span>Pengaturan</span>
                  </Link>
                </li>
              </ul>

              <div className="mt-auto pt-8">
                <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 relative overflow-hidden group hover:border-orange-300 dark:hover:border-orange-500/50 transition-colors shadow-sm">
                  <Leaf className="absolute -right-3 -top-3 w-16 h-16 text-emerald-500/10 dark:text-emerald-400/5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 relative z-10 leading-relaxed">
                    "Kekayaan sejati adalah waktu luangmu."
                  </p>
                </div>
              </div>

            </div>
          </aside>
        </div>

        {/* KONTEN UTAMA */}
        {/* Background putih bersih dengan shadow lembut di mode terang! */}
        <main className="flex-1 overflow-y-auto rounded-2xl bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors">
          <div className="p-4 sm:p-6 lg:p-8 h-full">
            {children}
          </div>
        </main>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}