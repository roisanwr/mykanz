'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

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

    // Cek apakah user sudah pernah dismiss banner ini
    const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
    if (dismissed) return;

    // Tangkap beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay sedikit biar tidak langsung muncul saat load
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect kalau sudah di-install dari luar
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
    });

    return () => {
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
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Overlay blur */}
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
            width={56}
            height={56}
          />
          <div className="pwa-icon-badge">
            <Smartphone size={12} />
          </div>
        </div>

        {/* Text content */}
        <div className="pwa-content">
          <p className="pwa-title">Install MyKanz</p>
          <p className="pwa-desc">
            Akses dashboard keuanganmu langsung dari homescreen — tanpa buka browser.
          </p>
        </div>

        {/* Action button */}
        <button
          id="pwa-install-btn"
          className="pwa-install-btn"
          onClick={handleInstall}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <span className="pwa-spinner" />
          ) : (
            <Download size={15} />
          )}
          {isInstalling ? 'Menginstall...' : 'Install'}
        </button>
      </div>
    </>
  );
}
