'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone, Share, MoreVertical, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop';
type InstallState = 'idle' | 'installing' | 'installed' | 'guide';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function PWAInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installState, setInstallState] = useState<InstallState>('idle');

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[MyKanz SW] Failed:', err));
    }

    // Sudah di-install?
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setInstallState('installed');
      return;
    }

    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);

    // Tangkap native install prompt (Android Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstallState('installed'));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Native install Chrome/Edge — langsung trigger dialog
      setInstallState('installing');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallState('installed');
      } else {
        setInstallState('idle');
      }
      setDeferredPrompt(null);
    } else {
      // Tidak ada native prompt → tampilkan panduan manual
      setInstallState('guide');
    }
  };

  // Sudah terinstall
  if (installState === 'installed') {
    return (
      <div className="pwa-section-installed">
        <div className="pwa-section-installed-icon">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <p className="pwa-section-installed-title">MyKanz Sudah Terinstall!</p>
          <p className="pwa-section-installed-desc">
            Kamu sudah bisa membuka MyKanz langsung dari homescreen HP-mu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-section">
      {/* Info card */}
      <div className="pwa-section-info">
        <div className="pwa-section-icon-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="MyKanz" className="pwa-section-app-icon" width={48} height={48} />
        </div>
        <div>
          <p className="pwa-section-app-name">MyKanz</p>
          <p className="pwa-section-app-sub">Wealth Management App</p>
        </div>
        <div className="pwa-section-badge">
          <Smartphone size={12} />
          <span>PWA</span>
        </div>
      </div>

      {/* Feature bullets */}
      <div className="pwa-section-features">
        {[
          { emoji: '⚡', text: 'Buka langsung dari homescreen, tanpa browser' },
          { emoji: '📴', text: 'Tampilan full-screen seperti native app' },
          { emoji: '🔔', text: 'Akses cepat ke dashboard keuanganmu' },
        ].map((f) => (
          <div key={f.text} className="pwa-section-feature-item">
            <span>{f.emoji}</span>
            <span>{f.text}</span>
          </div>
        ))}
      </div>

      {/* State: idle — tombol install */}
      {installState === 'idle' && (
        <button
          id="pwa-settings-install-btn"
          className="pwa-section-btn"
          onClick={handleInstall}
        >
          <Download size={16} />
          {platform === 'ios' ? 'Cara Install di iPhone' : 'Install ke HP'}
        </button>
      )}

      {/* State: installing */}
      {installState === 'installing' && (
        <button className="pwa-section-btn pwa-section-btn--loading" disabled>
          <span className="pwa-section-spinner" />
          Menginstall...
        </button>
      )}

      {/* State: guide — muncul setelah klik install tapi tidak ada native prompt */}
      {installState === 'guide' && (
        <div className="pwa-section-guide">
          <p className="pwa-section-guide-title">
            {platform === 'ios' ? '📱 Install di iPhone / iPad' : '📱 Install di Android'}
          </p>

          {platform === 'ios' ? (
            <div className="pwa-section-steps">
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">1</span>
                <span>
                  Tap ikon{' '}
                  <strong className="pwa-section-highlight">
                    <Share size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Bagikan
                  </strong>{' '}
                  di toolbar bawah Safari
                </span>
              </div>
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">2</span>
                <span>
                  Scroll ke bawah, pilih{' '}
                  <strong className="pwa-section-highlight">"Tambahkan ke Layar Utama"</strong>
                </span>
              </div>
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">3</span>
                <span>Tap <strong className="pwa-section-highlight">"Tambahkan"</strong> di pojok kanan atas</span>
              </div>
            </div>
          ) : (
            <div className="pwa-section-steps">
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">1</span>
                <span>
                  Tap menu{' '}
                  <strong className="pwa-section-highlight">
                    <MoreVertical size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> (titik tiga)
                  </strong>{' '}
                  di pojok kanan atas Chrome
                </span>
              </div>
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">2</span>
                <span>
                  Pilih{' '}
                  <strong className="pwa-section-highlight">"Tambahkan ke layar utama"</strong>{' '}
                  atau <strong className="pwa-section-highlight">"Install App"</strong>
                </span>
              </div>
              <div className="pwa-section-step">
                <span className="pwa-section-step-num">3</span>
                <span>Tap <strong className="pwa-section-highlight">"Tambahkan"</strong> untuk konfirmasi</span>
              </div>
            </div>
          )}

          <button
            className="pwa-section-btn pwa-section-btn--secondary"
            onClick={() => setInstallState('idle')}
          >
            Kembali
          </button>
        </div>
      )}

      <p className="pwa-section-note">
        Tersedia untuk Android (Chrome) dan iPhone (Safari). Tidak memerlukan Play Store atau App Store.
      </p>
    </div>
  );
}
