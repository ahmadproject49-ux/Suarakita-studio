import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900">
              Pasang sebagai Aplikasi HP
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Jalankan SuaraKita Studio layar penuh (PWA) langsung dari layar utama Android atau iOS.
            </p>
          </div>
        </div>

        {isInstallable ? (
          <button
            type="button"
            onClick={() => void install()}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instal Aplikasi Sekarang</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isIOS ? 'Cara Pasang di iPhone / iPad' : 'Panduan Pasang di HP'}</span>
          </button>
        )}
      </div>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3
                id="pwa-guide-title"
                className="text-base font-semibold text-slate-900"
              >
                Pasang SuaraKita Studio di Perangkat Mobile
              </h3>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Tutup panduan instalasi"
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">
                  Android (Google Chrome / Edge)
                </div>
                <p>
                  1. Buka URL aplikasi di tab penuh browser Chrome.<br />
                  2. Ketuk menu tiga titik (⋮) di pojok kanan atas.<br />
                  3. Pilih <strong>Instal aplikasi (Install app)</strong> atau <strong>Tambahkan ke layar utama</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">
                  iPhone &amp; iPad (Safari)
                </div>
                <p>
                  1. Buka aplikasi di browser Safari.<br />
                  2. Ketuk tombol <strong>Bagikan (Share)</strong> di bilah bawah.<br />
                  3. Pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        Mode Luring (Offline) — Antarmuka tersimpan tetap aktif, namun sintesis suara membutuhkan koneksi internet.
      </span>
    </div>
  );
};
