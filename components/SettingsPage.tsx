'use client'

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Lock, Download, Trash2, Save, Eye, EyeOff,
  ShieldAlert, FileDown, CheckCircle2, Loader2, Mail, Bot, Copy, ExternalLink,
  MessageCircle, Camera, Type
} from 'lucide-react';
import { useFeedback } from '@/components/FeedbackProvider';

type Section = 'profile' | 'password' | 'export' | 'telegram' | 'gmail' | 'danger';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string | null;
}

interface GmailStatus {
  connected: boolean;
  email: string | null;
  needs_reauth: boolean;
}

export default function SettingsPage({
  user,
  gmailStatus,
}: {
  user: UserData;
  gmailStatus: GmailStatus;
}) {
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // ── Profile ──────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user.name ?? '');
  const [profileLoading, setProfileLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await res.json();
      if (!res.ok) { showFeedback(data.error || 'Gagal menyimpan profil.', 'error'); }
      else { showFeedback('Profil berhasil diperbarui!', 'success'); router.refresh(); }
    } catch { showFeedback('Gagal terhubung ke server.', 'error'); }
    setProfileLoading(false);
  };

  // ── Password ─────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { showFeedback('Konfirmasi password tidak cocok.', 'error'); return; }
    if (newPw.length < 8) { showFeedback('Password baru minimal 8 karakter.', 'error'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { showFeedback(data.error || 'Gagal mengganti password.', 'error'); }
      else {
        showFeedback('Password berhasil diubah!', 'success');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      }
    } catch { showFeedback('Gagal terhubung ke server.', 'error'); }
    setPwLoading(false);
  };

  // ── Export ────────────────────────────────────────────────
  const [exportingType, setExportingType] = useState<string | null>(null);

  const handleExport = async (type: 'transaksi' | 'investasi') => {
    setExportingType(type);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) { showFeedback('Gagal mengekspor data.', 'error'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mykanz_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback(`Export ${type} berhasil!`, 'success');
    } catch { showFeedback('Gagal mengekspor data.', 'error'); }
    setExportingType(null);
  };

  // ── Delete Account ────────────────────────────────────────
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePw, setShowDeletePw] = useState(false);
  const DELETE_CONFIRM_PHRASE = 'HAPUS AKUN SAYA';

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== DELETE_CONFIRM_PHRASE) {
      showFeedback('Ketik frasa konfirmasi dengan benar.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) { showFeedback(data.error || 'Gagal menghapus akun.', 'error'); }
      else {
        showFeedback('Akun berhasil dihapus. Sampai jumpa!', 'success');
        // Sign out and redirect
        await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
        router.push('/login');
      }
    } catch { showFeedback('Gagal terhubung ke server.', 'error'); }
    setDeleteLoading(false);
  };

  // ── Telegram Bot ──────────────────────────────────────────
  const [tgConnected, setTgConnected] = useState(false);
  const [tgToken, setTgToken] = useState('');
  const [tgCopied, setTgCopied] = useState(false);

  const handleCopyCommand = (token: string) => {
    navigator.clipboard.writeText(`/connect ${token}`);
    setTgCopied(true);
    setTimeout(() => setTgCopied(false), 2000);
  };
  const [tgLoading, setTgLoading] = useState(true);

  useEffect(() => {
    fetch('/api/telegram/status')
      .then(res => res.json())
      .then(data => { setTgConnected(data.connected); setTgLoading(false); })
      .catch(() => setTgLoading(false));
  }, []);

  const handleGenerateTgToken = async () => {
    setTgLoading(true);
    try {
      const res = await fetch('/api/telegram/generate-token', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setTgToken(data.token);
      else showFeedback('Gagal generate token', 'error');
    } catch {
      showFeedback('Gagal terhubung ke server', 'error');
    }
    setTgLoading(false);
  };

  const handleDisconnectTg = async () => {
    setTgLoading(true);
    try {
      const res = await fetch('/api/telegram/status', { method: 'DELETE' });
      if (res.ok) {
        setTgConnected(false);
        setTgToken('');
        showFeedback('Koneksi Telegram diputus', 'success');
      } else {
        showFeedback('Gagal memutuskan koneksi', 'error');
      }
    } catch {
      showFeedback('Gagal terhubung ke server', 'error');
    }
    setTgLoading(false);
  };

  // ── Gmail Connect ─────────────────────────────────────────
  const [gmailConnected, setGmailConnected] = useState(gmailStatus.connected);
  const [gmailEmail, setGmailEmail] = useState(gmailStatus.email);
  const [gmailNeedsReauth, setGmailNeedsReauth] = useState(gmailStatus.needs_reauth);
  const [gmailLoading, setGmailLoading] = useState(false);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnectGmail = async () => {
    setGmailLoading(true);
    try {
      const res = await fetch('/api/gmail/status', { method: 'DELETE' });
      if (res.ok) {
        setGmailConnected(false);
        setGmailEmail(null);
        setGmailNeedsReauth(false);
        showFeedback('Gmail berhasil diputuskan.', 'success');
      } else {
        showFeedback('Gagal memutuskan koneksi Gmail.', 'error');
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setGmailLoading(false);
  };

  // Deteksi URL param dari Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');
    if (gmailParam === 'connected') {
      showFeedback('Gmail berhasil dihubungkan! 🎉', 'success');
      setGmailConnected(true);
      setActiveSection('gmail');
      // Bersihkan URL param
      window.history.replaceState({}, '', '/settings');
    } else if (gmailParam === 'error') {
      const details = params.get('details');
      showFeedback(`Gagal menghubungkan Gmail: ${details ? decodeURIComponent(details) : 'Coba lagi.'}`, 'error');
      setActiveSection('gmail');
      window.history.replaceState({}, '', '/settings');
    } else if (gmailParam === 'denied') {
      showFeedback('Kamu membatalkan koneksi Gmail.', 'error');
      setActiveSection('gmail');
      window.history.replaceState({}, '', '/settings');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Nav Items ─────────────────────────────────────────────
  const navItems: { id: Section; label: string; icon: React.ElementType; danger?: boolean }[] = [
    { id: 'profile', label: 'Edit Profil', icon: User },
    { id: 'password', label: 'Ganti Password', icon: Lock },
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'telegram', label: 'Telegram Bot', icon: Bot },
    { id: 'gmail', label: 'Gmail Connect', icon: Mail },
    { id: 'danger', label: 'Hapus Akun', icon: Trash2, danger: true },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pengaturan</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Kelola akun dan preferensi kamu di sini.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <nav className="md:w-56 shrink-0">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold transition-all border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${
                    isActive
                      ? item.danger
                        ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : item.danger
                        ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1">

          {/* ── Edit Profil ── */}
          {activeSection === 'profile' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" /> Edit Profil
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Perbarui nama tampilan kamu.</p>
              </div>

              <form onSubmit={handleProfileSave} className="p-6 space-y-5">
                {/* Avatar initial */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-emerald-500/20">
                    {(profileName || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{profileName || 'Belum ada nama'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Member sejak {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    placeholder="Masukkan nama kamu"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={user.email ?? ''}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Email tidak dapat diubah.</p>
                </div>

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/25"
                >
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </form>
            </div>
          )}

          {/* ── Ganti Password ── */}
          {activeSection === 'password' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-500" /> Ganti Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Password baru minimal 8 karakter.</p>
              </div>

              <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password Saat Ini</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Min. 8 karakter"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {newPw.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1,2,3,4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                            newPw.length >= i * 3
                              ? i <= 2 ? 'bg-red-400' : i === 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`} />
                        ))}
                      </div>
                      <p className={`text-xs mt-1 font-medium ${
                        newPw.length < 6 ? 'text-red-500' : newPw.length < 10 ? 'text-yellow-500' : 'text-emerald-500'
                      }`}>
                        {newPw.length < 6 ? 'Terlalu pendek' : newPw.length < 10 ? 'Cukup' : 'Kuat'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                      placeholder="Ulangi password baru"
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                        confirmPw && confirmPw !== newPw
                          ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500/50'
                          : confirmPw && confirmPw === newPw
                            ? 'border-emerald-300 dark:border-emerald-500/50 focus:ring-emerald-500/50'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-orange-500/50'
                      } bg-white dark:bg-slate-900`}
                    />
                    {confirmPw && confirmPw === newPw && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  {confirmPw && confirmPw !== newPw && (
                    <p className="text-xs text-red-500 mt-1">Password tidak cocok.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/25"
                >
                  {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {pwLoading ? 'Menyimpan...' : 'Ubah Password'}
                </button>
              </form>
            </div>
          )}

          {/* ── Export Data ── */}
          {activeSection === 'export' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-orange-500" /> Export Data
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Download seluruh data kamu dalam format CSV.</p>
              </div>

              <div className="p-6 space-y-4">
                {[
                  {
                    type: 'transaksi' as const,
                    title: 'Transaksi Keuangan',
                    desc: 'Semua pemasukan, pengeluaran, dan transfer dari seluruh dompet.',
                    color: 'indigo',
                  },
                  {
                    type: 'investasi' as const,
                    title: 'Transaksi Investasi',
                    desc: 'Semua transaksi beli/jual dari seluruh portofolio aset investasi.',
                    color: 'emerald',
                  },
                ].map(({ type, title, desc, color }) => (
                  <div key={type} className={`flex items-center justify-between p-4 rounded-xl border ${
                    color === 'indigo'
                      ? 'border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10'
                      : 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        color === 'indigo'
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <FileDown className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(type)}
                      disabled={exportingType === type}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 ml-3 ${
                        color === 'indigo'
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                      } disabled:opacity-50`}
                    >
                      {exportingType === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {exportingType === type ? 'Mengekspor...' : 'Download CSV'}
                    </button>
                  </div>
                ))}

                <p className="text-xs text-slate-400 dark:text-slate-500 pt-2">
                  💡 File CSV dapat dibuka dengan Microsoft Excel, Google Sheets, atau aplikasi spreadsheet lainnya.
                </p>
              </div>
            </div>
          )}

          {/* ── Telegram Bot ── */}
          {activeSection === 'telegram' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-orange-500" /> Integrasi Telegram
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Catat transaksi lebih cepat via bot Telegram @mykanz_bot.</p>
              </div>

              <div className="p-6 space-y-6">
                {tgLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                ) : tgConnected ? (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-1">Akun Terhubung!</h3>
                    <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4">Kamu sudah bisa mencatat transaksi lewat Telegram.</p>
                    <button onClick={handleDisconnectTg} className="text-sm font-semibold text-red-500 hover:text-red-600 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-red-100 dark:border-red-900/30">
                      Putuskan Koneksi
                    </button>
                  </div>
                ) : (
                  <div>
                    {!tgToken ? (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center">
                        <Bot className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">Hubungkan Telegram</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Dapatkan token untuk menghubungkan akun MyKanz dengan Telegram.</p>
                        <button onClick={handleGenerateTgToken} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all">
                          Generate Token
                        </button>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl p-5 text-center">
                        <h3 className="font-bold text-orange-800 dark:text-orange-400 mb-2">Token Berhasil Dibuat</h3>
                        <p className="text-sm text-orange-600 dark:text-orange-500 mb-4">Buka bot Telegram @mykanz_bot dan kirimkan perintah ini:</p>
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 py-3 px-4 rounded-lg border border-orange-100 dark:border-orange-900/30">
                          <code className="font-mono text-slate-900 dark:text-white font-bold text-sm">/connect {tgToken}</code>
                          <button onClick={() => handleCopyCommand(tgToken)} className="shrink-0 p-1.5 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                            {tgCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-orange-500" />}
                          </button>
                        </div>
                        <p className="text-xs text-orange-500/70 mt-3">⏰ Token ini akan hangus dalam 5 menit.</p>
                        <a href="https://t.me/mykanz_bot" target="_blank" rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-500 hover:text-sky-600">
                          Buka @mykanz_bot <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {/* Panduan Penggunaan */}
                <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">📖 Cara Pakai Bot</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <Camera className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kirim foto struk</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">AI akan membaca struk dan membantu kamu mencatat pengeluaran.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <Type className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ketik langsung</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Contoh: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">beli kopi 35000</code> atau <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">terima gaji 5000000</code></p>
                      </div>
                    </div>
                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Perintah bot</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400"><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">/help</code> — daftar perintah · <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">/status</code> — cek koneksi akun</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Gmail Connect ── */}
          {activeSection === 'gmail' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-500" /> Gmail Connect
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Catat transaksi otomatis dari email notifikasi bank &amp; e-wallet.
                </p>
              </div>

              <div className="p-6 space-y-6">
                {gmailLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
                ) : gmailConnected && !gmailNeedsReauth ? (
                  // ── Status: Connected ──
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-400 mb-1">Gmail Terhubung!</h3>
                    {gmailEmail && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-500 mb-1 font-mono">{gmailEmail}</p>
                    )}
                    <p className="text-sm text-emerald-600 dark:text-emerald-500 mb-4">
                      Transaksi dari email akan dicatat otomatis ke dashboard kamu.
                    </p>
                    <button
                      onClick={handleDisconnectGmail}
                      className="text-sm font-semibold text-red-500 hover:text-red-600 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-red-100 dark:border-red-900/30"
                    >
                      Putuskan Koneksi
                    </button>
                  </div>
                ) : gmailNeedsReauth ? (
                  // ── Status: Needs Re-auth ──
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mb-3">
                      <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Diperlukan Reconnect</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-500 mb-4">
                      Akses Gmail kamu sudah tidak valid. Silakan hubungkan ulang.
                    </p>
                    <button
                      onClick={handleConnectGmail}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                    >
                      Hubungkan Ulang Gmail
                    </button>
                  </div>
                ) : (
                  // ── Status: Not connected ──
                  <div className="space-y-4">
                    {/* Penjelasan cara kerja */}
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { icon: '📧', title: 'Auto-detect transaksi', desc: 'Baca email BCA, GoPay, OVO, Mandiri, Tokopedia, Shopee.' },
                        { icon: '🔒', title: 'Privasi terjaga', desc: 'MyKanz hanya membaca notifikasi transaksi — tidak pernah mengirim email.' },
                        { icon: '⚡', title: 'Real-time', desc: 'Transaksi tercatat dalam hitungan detik setelah email masuk.' },
                      ].map((item) => (
                        <div key={item.title} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <span className="text-xl shrink-0">{item.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Warning Unverified App */}
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-semibold mb-1">⚠️ Catatan penting</p>
                      <p className="text-xs leading-relaxed">
                        Google akan menampilkan layar <strong>&quot;Unverified App&quot;</strong> saat pertama kali connect.
                        Klik <strong>Advanced → Proceed to MyKanz (unsafe)</strong> untuk melanjutkan.
                        Ini normal — MyKanz belum melewati proses verifikasi Google yang membutuhkan waktu berbulan-bulan.
                        Data kamu tetap aman, MyKanz hanya <strong>membaca</strong> email notifikasi transaksi.
                      </p>
                    </div>

                    <button
                      id="btn-connect-gmail"
                      onClick={handleConnectGmail}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      Hubungkan Gmail
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Hapus Akun ── */}
          {activeSection === 'danger' && (
            <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10">
                <h2 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Zona Berbahaya — Hapus Akun
                </h2>
                <p className="text-xs text-red-500 dark:text-red-400/70 mt-1">Aksi ini <strong>tidak bisa dibatalkan</strong>. Semua data akan terhapus permanen.</p>
              </div>

              <div className="p-6">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 mb-6">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">Yang akan dihapus permanen:</p>
                  <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                    <li>Semua data dompet &amp; transaksi keuangan</li>
                    <li>Semua portofolio &amp; transaksi investasi</li>
                    <li>Semua anggaran, target, dan kategori</li>
                    <li>Profil akun kamu</li>
                  </ul>
                </div>

                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Konfirmasi dengan mengetik: <span className="text-red-500 font-mono">{DELETE_CONFIRM_PHRASE}</span>
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={DELETE_CONFIRM_PHRASE}
                      className={`w-full px-4 py-2.5 rounded-xl border font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                        deleteConfirmText === DELETE_CONFIRM_PHRASE
                          ? 'border-red-400 dark:border-red-500/50 focus:ring-red-500/50 bg-red-50 dark:bg-red-900/10'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-red-500/50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Password Kamu</label>
                    <div className="relative">
                      <input
                        type={showDeletePw ? 'text' : 'password'}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                        placeholder="Masukkan password untuk konfirmasi"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      />
                      <button type="button" onClick={() => setShowDeletePw(!showDeletePw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showDeletePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={deleteLoading || deleteConfirmText !== DELETE_CONFIRM_PHRASE || !deletePassword}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-colors shadow-lg shadow-red-500/25"
                  >
                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    {deleteLoading ? 'Menghapus...' : 'Hapus Akun Permanen'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
