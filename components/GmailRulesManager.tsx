'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Loader2, Tag, ToggleLeft, ToggleRight,
  ChevronDown, AlertCircle, CheckCircle2, GripVertical, Info,
} from 'lucide-react';
import { useFeedback } from '@/components/FeedbackProvider';

interface Category {
  id: string;
  name: string;
  type: string;
}

interface GmailRule {
  id: string;
  condition_type: string;
  condition_value: string;
  match_type: string;
  priority: number;
  is_active: boolean;
  created_at: string | null;
  categories: Category;
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  RECIPIENT:   'Nama Penerima',
  VA_NUMBER:   'Nomor VA',
  MERCHANT:    'Nama Merchant',
  DESCRIPTION: 'Kata Kunci Deskripsi',
  SOURCE:      'Sumber Bank/Wallet',
};

const CONDITION_TYPE_PLACEHOLDERS: Record<string, string> = {
  RECIPIENT:   'e.g. SPayLater, PLN, Tokopedia',
  VA_NUMBER:   'e.g. 89618039610856197',
  MERCHANT:    'e.g. Indomaret, GrabFood',
  DESCRIPTION: 'e.g. BPJS, gaji, transfer masuk',
  SOURCE:      'e.g. Mandiri, BCA, GoPay',
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  EXACT:       'Sama persis',
  CONTAINS:    'Mengandung',
  STARTS_WITH: 'Diawali dengan',
};

const CONDITION_ICONS: Record<string, string> = {
  RECIPIENT:   '👤',
  VA_NUMBER:   '🔢',
  MERCHANT:    '🏪',
  DESCRIPTION: '🔍',
  SOURCE:      '🏦',
};

export default function GmailRulesManager({
  categories,
}: {
  categories: Category[];
}) {
  const { showFeedback } = useFeedback();
  const [rules, setRules] = useState<GmailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form state
  const [conditionType, setConditionType] = useState('RECIPIENT');
  const [conditionValue, setConditionValue] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [categoryId, setCategoryId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch {
      showFeedback('Gagal memuat aturan.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showFeedback]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Reset match type untuk VA_NUMBER ke EXACT otomatis
  useEffect(() => {
    if (conditionType === 'VA_NUMBER') {
      setMatchType('STARTS_WITH');
    }
  }, [conditionType]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!conditionValue.trim()) {
      setFormError('Nilai kondisi tidak boleh kosong.');
      return;
    }
    if (!categoryId) {
      setFormError('Pilih kategori tujuan.');
      return;
    }
    if (matchType === 'CONTAINS' && conditionValue.trim().length < 4) {
      setFormError('Untuk mode "Mengandung", minimal 4 karakter (hindari false positive).');
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch('/api/gmail/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_type: conditionType,
          condition_value: conditionValue.trim(),
          match_type: matchType,
          category_id: categoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal membuat aturan.');
      } else {
        setRules((prev) => [...prev, data]);
        setConditionValue('');
        setCategoryId('');
        setShowForm(false);
        showFeedback('Aturan berhasil dibuat! ✅', 'success');
      }
    } catch {
      setFormError('Gagal terhubung ke server.');
    }
    setFormLoading(false);
  };

  const handleToggleActive = async (rule: GmailRule) => {
    setSavingId(rule.id);
    try {
      const res = await fetch(`/api/gmail/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r)
        );
      } else {
        showFeedback('Gagal mengubah status aturan.', 'error');
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setSavingId(null);
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Hapus aturan ini?')) return;
    setSavingId(ruleId);
    try {
      const res = await fetch(`/api/gmail/rules/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        showFeedback('Aturan dihapus.', 'success');
      } else {
        showFeedback('Gagal menghapus aturan.', 'error');
      }
    } catch {
      showFeedback('Gagal terhubung ke server.', 'error');
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {rules.length} aturan aktif
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Aturan
        </button>
      </div>

      {/* Info banner */}
      <div className="flex gap-2.5 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Aturan dijalankan sebelum kategorisasi otomatis. Jika ada rule yang cocok,
          transaksi langsung dikategorikan tanpa perlu review. Priority kecil = lebih prioritas.
        </p>
      </div>

      {/* Form Tambah Aturan */}
      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-orange-500" />
            Aturan Baru
          </h3>
          <form onSubmit={handleAddRule} className="space-y-4">
            {/* Kondisi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Jika...
                </label>
                <div className="relative">
                  <select
                    value={conditionType}
                    onChange={(e) => setConditionType(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    {Object.entries(CONDITION_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{CONDITION_ICONS[val]} {label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  Mode Cocok
                </label>
                <div className="relative">
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    disabled={conditionType === 'VA_NUMBER'}
                    className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-60"
                  >
                    {Object.entries(MATCH_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Nilai kondisi */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Nilai
              </label>
              <input
                type={conditionType === 'VA_NUMBER' ? 'number' : 'text'}
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder={CONDITION_TYPE_PLACEHOLDERS[conditionType]}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              {conditionType === 'VA_NUMBER' && (
                <p className="text-xs text-slate-400 mt-1">
                  💡 Bisa prefix saja (e.g. 8961) untuk match semua VA dengan awalan tersebut.
                </p>
              )}
            </div>

            {/* Target kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Gunakan Kategori
              </label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {['PENGELUARAN', 'PEMASUKAN'].map((type) => {
                    const cats = categories.filter((c) => c.type === type);
                    if (cats.length === 0) return null;
                    return (
                      <optgroup key={type} label={type === 'PENGELUARAN' ? '📤 Pengeluaran' : '📥 Pemasukan'}>
                        {cats.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-500/25 text-sm"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {formLoading ? 'Menyimpan...' : 'Simpan Aturan'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); setConditionValue(''); setCategoryId(''); }}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar Rules */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <Tag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada aturan</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Tambah aturan untuk kategorisasi otomatis yang lebih akurat.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                rule.is_active
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-700/50 opacity-60'
              }`}
            >
              {/* Drag handle (visual only) */}
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />

              {/* Kondisi */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Jika</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-xs font-mono font-bold">
                    {CONDITION_ICONS[rule.condition_type]} {CONDITION_TYPE_LABELS[rule.condition_type]}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">
                    {MATCH_TYPE_LABELS[rule.match_type]}
                  </span>
                  <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 rounded-md text-xs font-semibold">
                    &quot;{rule.condition_value}&quot;
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-slate-400 dark:text-slate-500 text-xs">→ Kategori:</span>
                  <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-md text-xs font-semibold">
                    {rule.categories.name}
                  </span>
                  <span className="text-xs text-slate-300 dark:text-slate-600 ml-1">
                    ({rule.categories.type === 'PENGELUARAN' ? '📤' : '📥'})
                  </span>
                </div>
              </div>

              {/* Priority badge */}
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">
                P{rule.priority}
              </span>

              {/* Toggle + Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleActive(rule)}
                  disabled={savingId === rule.id}
                  title={rule.is_active ? 'Nonaktifkan aturan' : 'Aktifkan aturan'}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {savingId === rule.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  ) : rule.is_active ? (
                    <ToggleRight className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={savingId === rule.id}
                  title="Hapus aturan"
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
