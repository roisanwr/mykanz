'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'other';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[MyKanz SW] Registered:', reg.scope))
        .catch((err) => console.warn('[MyKanz SW] Registration failed:', err));
    }

    // Cek apakah sudah di-install (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Cek apakah user sudah pernah dismiss (simpan di localStorage agar persist)
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) return;

    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);

    // Tangkap beforeinstallprompt (Android Chrome) kalau ada
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect kalau sudah di-install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
    });

    // Banner selalu muncul setelah 3 detik untuk mobile,
    // atau hanya kalau ada deferredPrompt untuk desktop
    const timer = setTimeout(() => {
      if (currentPlatform === 'ios' || currentPlatform === 'android') {
        // Mobile: selalu tampilkan — user mungkin ingin install
        setShowBanner(true);
      }
      // Desktop: hanya tampil kalau ada native install prompt
    }, 3000);

    // Untuk desktop/android dengan native prompt: tampilkan saat event tertangkap
    const checkPromptTimer = setInterval(() => {
      setDeferredPrompt((prev) => {
        if (prev && currentPlatform !== 'ios') {
          setShowBanner(true);
        }
        return prev;
      });
    }, 500);

    // Cleanup
    return () => {
      clearTimeout(timer);
      clearInterval(checkPromptTimer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setIsInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Simpan ke localStorage agar tidak muncul lagi sampai user clear cache
    localStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  const isIOS = platform === 'ios';
  const hasNativePrompt = !!deferredPrompt;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="pwa-overlay"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Banner */}
      <div
        className="pwa-banner"
        role="dialog"
        aria-label="Install MyKanz"
        aria-modal="true"
      >
        {/* Close button */}
        <button
          id="pwa-dismiss-btn"
          className="pwa-close-btn"
          onClick={handleDismiss}
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="pwa-icon-wrapper">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192x192.png"
            alt="MyKanz Icon"
            className="pwa-app-icon"
            width={52}
            height={52}
          />
          <div className="pwa-icon-badge">
            <Smartphone size={12} />
          </div>
        </div>

        {/* Text content — adaptif berdasarkan platform */}
        <div className="pwa-content">
          <p className="pwa-title">Install MyKanz</p>
          {isIOS ? (
            <p className="pwa-desc">
              Tap <strong className="pwa-desc-strong"><Share size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Bagikan</strong> lalu pilih <strong className="pwa-desc-strong">"Tambahkan ke Layar Utama"</strong>
            </p>
          ) : (
            <p className="pwa-desc">
              Akses dashboard keuanganmu langsung dari homescreen — tanpa buka browser.
            </p>
          )}
        </div>

        {/* Action button — hanya tampil kalau bukan iOS atau ada native prompt */}
        {!isIOS && (
          <button
            id="pwa-install-btn"
            className="pwa-install-btn"
            onClick={handleInstall}
            disabled={isInstalling || !hasNativePrompt}
            title={!hasNativePrompt ? 'Buka di Chrome untuk install' : undefined}
          >
            {isInstalling ? (
              <span className="pwa-spinner" />
            ) : (
              <Download size={15} />
            )}
            {isInstalling ? 'Menginstall...' : 'Install'}
          </button>
        )}

        {/* iOS: tombol "Mengerti" */}
        {isIOS && (
          <button
            id="pwa-ios-ok-btn"
            className="pwa-install-btn"
            onClick={handleDismiss}
          >
            Mengerti
          </button>
        )}
      </div>
    </>
  );
}
