'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share, MoreVertical, ChevronDown } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[MyKanz SW] Registered:', reg.scope))
        .catch((err) => console.warn('[MyKanz SW] Registration failed:', err));
    }

    // Jika sudah di-install (standalone / TWA), sembunyikan saja
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Kalau sudah pernah dismiss, jangan tampil lagi
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) return;

    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);

    // Desktop: hanya tampil kalau ada native prompt
    if (currentPlatform === 'desktop') {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setTimeout(() => setShowBanner(true), 2000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setShowBanner(false);
      });
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    // Mobile (Android & iOS): selalu tampil setelah 3 detik
    // Sambil tetap menangkap deferredPrompt kalau browser mau kasih
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
    });

    const timer = setTimeout(() => setShowBanner(true), 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Browser support native install → langsung trigger
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setIsInstalling(false);
      setDeferredPrompt(null);
    } else {
      // Tidak ada native prompt → tampilkan panduan manual
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const hasNativePrompt = !!deferredPrompt;

  return (
    <>
      {/* Overlay backdrop */}
      <div className="pwa-overlay" onClick={handleDismiss} aria-hidden="true" />

      {/* Banner utama */}
      <div className="pwa-banner" role="dialog" aria-label="Install MyKanz" aria-modal="true">
        {/* Tombol tutup */}
        <button id="pwa-dismiss-btn" className="pwa-close-btn" onClick={handleDismiss} aria-label="Tutup">
          <X size={16} />
        </button>

        {/* Icon app */}
        <div className="pwa-icon-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="MyKanz Icon" className="pwa-app-icon" width={52} height={52} />
          <div className="pwa-icon-badge">
            <Smartphone size={12} />
          </div>
        </div>

        {/* Konten teks */}
        <div className="pwa-content">
          <p className="pwa-title">Install MyKanz</p>

          {/* iOS: instruksi Share */}
          {isIOS && (
            <p className="pwa-desc">
              Tap <strong className="pwa-desc-strong">
                <Share size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
                Bagikan
              </strong>{' '}→{' '}
              <strong className="pwa-desc-strong">"Tambahkan ke Layar Utama"</strong>
            </p>
          )}

          {/* Android dengan native prompt */}
          {isAndroid && hasNativePrompt && (
            <p className="pwa-desc">Akses dashboard keuanganmu langsung dari homescreen.</p>
          )}

          {/* Android tanpa native prompt — tampilkan panduan manual kalau sudah diklik */}
          {isAndroid && !hasNativePrompt && !showManualGuide && (
            <p className="pwa-desc">Tambahkan ke homescreen HP-mu — akses langsung tanpa buka browser.</p>
          )}

          {/* Panduan manual Android */}
          {isAndroid && !hasNativePrompt && showManualGuide && (
            <div className="pwa-manual-guide">
              <p className="pwa-guide-step">
                <span className="pwa-step-num">1</span>
                Tap ikon menu{' '}
                <strong className="pwa-desc-strong">
                  <MoreVertical size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </strong>{' '}
                di pojok kanan atas browser
              </p>
              <p className="pwa-guide-step">
                <span className="pwa-step-num">2</span>
                Pilih <strong className="pwa-desc-strong">"Tambahkan ke layar utama"</strong> atau <strong className="pwa-desc-strong">"Install App"</strong>
              </p>
            </div>
          )}
        </div>

        {/* Tombol aksi */}
        {!isIOS && (
          <button
            id="pwa-install-btn"
            className={`pwa-install-btn${showManualGuide ? ' pwa-install-btn--done' : ''}`}
            onClick={showManualGuide ? handleDismiss : handleInstallClick}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <span className="pwa-spinner" />
            ) : showManualGuide ? (
              <>
                <ChevronDown size={15} />
                Mengerti
              </>
            ) : (
              <>
                <Download size={15} />
                Install
              </>
            )}
          </button>
        )}

        {/* iOS tombol */}
        {isIOS && (
          <button id="pwa-ios-ok-btn" className="pwa-install-btn" onClick={handleDismiss}>
            Mengerti
          </button>
        )}
      </div>
    </>
  );
}
