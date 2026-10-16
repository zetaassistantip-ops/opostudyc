'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function BotonInstalarApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [esStandalone, setEsStandalone] = useState(false);
  const [modalGuiaAbierto, setModalGuiaAbierto] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [instaladaExito, setInstaladaExito] = useState(false);

  useEffect(() => {
    // Detectar si ya está ejecutándose como PWA instalada
    const checkStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setEsStandalone(Boolean(checkStandalone));

    // Detectar si es dispositivo iOS (iPhone / iPad)
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setEsIOS(isAppleDevice);

    // Capturar el evento de instalación de Chromium
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setInstaladaExito(true);
      setTimeout(() => setEsStandalone(true), 2500);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Si ya está abierta en modo standalone (App nativa instalada), no hace falta mostrar el botón
  if (esStandalone) {
    return null;
  }

  const handleInstalarClick = async () => {
    if (deferredPrompt) {
      // Disparador nativo de Chrome / Android / Edge
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstaladaExito(true);
      }
      setDeferredPrompt(null);
    } else {
      // Si el navegador no soporta o no ha disparado el prompt automático (iOS Safari o Desktop), abrir guía
      setModalGuiaAbierto(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstalarClick}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 active:scale-95 border border-slate-200/90 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        title="Instalar OpostudyC como App en tu móvil o PC"
      >
        <Download className="w-3.5 h-3.5 text-slate-700" />
        <span className="hidden xs:inline">Descargar App</span>
        <span className="xs:hidden">App</span>
      </button>

      {/* Modal explicativo si el navegador no admite prompt directo (iOS Safari / Firefox) */}
      {modalGuiaAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Instalar OpostudyC
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Úsala a pantalla completa y sin conexión
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalGuiaAbierto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {esIOS ? (
              // Instrucciones para iOS Safari
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Para instalar en tu iPhone o iPad:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Share className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      1. Pulsa el botón <strong>Compartir</strong> en la barra de Safari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                      <PlusSquare className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      2. Baja y pulsa <strong>"Añadir a la pantalla de inicio"</strong>.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Instrucciones para Android / PC
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Para instalar en Android o PC:
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pulsa el menú de 3 puntos de tu navegador (Chrome / Edge) y selecciona{' '}
                  <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.
                </p>
              </div>
            )}

            <button
              onClick={() => setModalGuiaAbierto(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Banner rápido si se instaló con éxito */}
      {instaladaExito && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-700 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>¡App instalada correctamente en tu dispositivo!</span>
        </div>
      )}
    </>
  );
}
