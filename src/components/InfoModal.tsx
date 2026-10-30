'use client';

import React, { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

interface InfoModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export default function InfoModal({ abierto, onCerrar }: InfoModalProps) {
  // Manejar tecla Escape y bloqueo de scroll en el body
  useEffect(() => {
    if (!abierto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] sm:shadow-[6px_6px_0px_0px_#0f172a] overflow-hidden flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <header className="p-4 sm:p-5 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/80 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="OpostudyC Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-[#182029] p-0.5 border border-slate-300 shadow-2xs flex-shrink-0"
            />
            <div>
              <h2
                id="info-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight"
              >
                ¿Qué es OpoStudyC?
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                Filosofía y funcionamiento colaborativo
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contenido scrolleable con tipografía limpia y buen espaciado */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
          <p className="text-slate-800 font-medium">
            OpoStudyC es una herramienta pensada para estudiar y repasar el temario de la oposición sin depender de los típicos bancos de preguntas fijos que acabas aprendiéndote de memoria.
          </p>

          <p className="font-semibold text-slate-900 pt-1">
            El funcionamiento es sencillo y se apoya en el trabajo en equipo:
          </p>

          <div className="space-y-2.5">
            {/* Punto 1: Preguntas enfocadas al examen */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-slate-800">
              <p>
                🎯 <strong className="font-bold text-slate-900">Preguntas enfocadas al examen:</strong> El sistema intenta escanear los temas buscando lo que le gusta preguntar a un tribunal: tablas normativas, plazos exactos, cifras técnicas y excepciones.
              </p>
            </div>

            {/* Punto 2: Banco de preguntas compartido */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-sky-50/60 border border-sky-200/80 text-slate-800">
              <p>
                🌍 <strong className="font-bold text-slate-900">Un banco de preguntas compartido:</strong> La aplicación es colaborativa. Cada vez que generas una tanda de preguntas nuevas, se guardan en un banco común. Cuanto más la usamos, más amplio y variado es el repertorio para todos.
              </p>
            </div>

            {/* Punto 3: Filtro de la comunidad */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-slate-800">
              <p>
                ⚖️ <strong className="font-bold text-slate-900">El filtro de la comunidad:</strong> Para evitar preguntas dudosas o con erratas, cualquiera puede valorarlas. Si una pregunta está mal formulada, se puntúa negativo para cribarla y que solo queden las que de verdad sirven.
              </p>
            </div>

            {/* Punto 4: Repaso inteligente */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 text-slate-800">
              <p>
                🧠 <strong className="font-bold text-slate-900">Repaso inteligente:</strong> En vez de hacer test al azar, el sistema registra tus aciertos y fallos para programar repasos automáticos, insistiendo en los conceptos que más se te atragantan.
              </p>
            </div>
          </div>

          <p className="pt-1 text-slate-700 italic border-t border-slate-100">
            Al final, es simplemente una herramienta práctica para ayudarnos entre compañeros a machacar el temario y llegar al examen oficial con los datos frescos.
          </p>
        </div>

        {/* Pie con botón claro de cerrar */}
        <footer className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Entendido / Cerrar</span>
          </button>
        </footer>
      </div>
    </div>
  );
}

