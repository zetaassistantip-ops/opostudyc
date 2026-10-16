'use client';

import React, { useEffect, useRef } from 'react';
import { Drawer } from 'vaul';
import ReactMarkdown from 'react-markdown';
import { X, BookOpen, BookmarkCheck, AlertCircle } from 'lucide-react';
import { SeccionTemario } from '@/lib/types';

interface TemarioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  seccion?: SeccionTemario | null;
  citaExacta: string;
  tituloTema?: string;
  numeroTema?: number;
}

export default function TemarioDrawer({
  isOpen,
  onClose,
  seccion,
  citaExacta,
  tituloTema,
  numeroTema,
}: TemarioDrawerProps) {
  const markRef = useRef<HTMLDivElement | HTMLElement | null>(null);

  // Auto-scroll suave directo a la frase subrayada en cuanto abre el drawer
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (markRef.current) {
          markRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 350); // Tiempo para que la animación de Vaul se complete

      return () => clearTimeout(timer);
    }
  }, [isOpen, citaExacta]);

  // Si no hay sección disponible, mostramos placeholder útil
  const contenido = seccion?.contenido_markdown || '';

  // Función para inyectar el mark con cita_exacta
  const renderContenidoConCita = () => {
    if (!contenido) {
      return (
        <div className="py-12 text-center text-zinc-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <p className="text-sm">Contenido del temario no disponible para este epígrafe.</p>
        </div>
      );
    }

    if (!citaExacta || citaExacta.trim().length === 0) {
      return (
        <div className="prose prose-invert prose-red max-w-none text-sm text-zinc-300">
          <ReactMarkdown>{contenido}</ReactMarkdown>
        </div>
      );
    }

    // Buscamos la cita exacta de forma insensible a mayúsculas/minúsculas y saltos de línea suaves
    const regex = new RegExp(`(${citaExacta.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'i');
    const partes = contenido.split(regex);

    if (partes.length > 1) {
      return (
        <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
          {partes.map((parte, idx) => {
            if (parte.toLowerCase() === citaExacta.toLowerCase()) {
              return (
                <mark
                  key={idx}
                  ref={(el) => {
                    markRef.current = el;
                  }}
                  id="cita-resaltada"
                  className="bg-yellow-500/25 text-yellow-200 border-l-4 border-yellow-400 font-semibold px-2 py-1 rounded inline-block shadow-xs shadow-yellow-500/10 transition-all duration-300 ring-2 ring-yellow-400/40 my-1"
                >
                  <span className="flex items-center gap-1.5 text-xs text-yellow-400 uppercase tracking-wider mb-0.5 font-bold">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    Punto clave preguntado:
                  </span>
                  {parte}
                </mark>
              );
            }
            return (
              <span key={idx} className="inline prose prose-invert prose-red text-sm">
                <ReactMarkdown>{parte}</ReactMarkdown>
              </span>
            );
          })}
        </div>
      );
    }

    // Si no coincide exactamente al 100%, mostramos banner con la cita y luego el markdown completo
    return (
      <div className="space-y-4">
        <div
          ref={(el) => {
            markRef.current = el;
          }}
          id="cita-resaltada"
          className="bg-yellow-500/20 border-l-4 border-yellow-400 p-3 rounded-r-lg text-yellow-200 text-xs font-medium leading-relaxed"
        >
          <div className="flex items-center gap-1.5 text-yellow-400 font-bold mb-1 uppercase tracking-wider">
            <BookmarkCheck className="w-4 h-4" />
            Cita literal del Tribunal:
          </div>
          &ldquo;{citaExacta}&rdquo;
        </div>
        <div className="prose prose-invert prose-red max-w-none text-sm text-zinc-300 leading-relaxed">
          <ReactMarkdown>{contenido}</ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 transition-opacity" />
        <Drawer.Content className="bg-zinc-900 border-t border-zinc-800 text-zinc-100 fixed bottom-0 left-0 right-0 max-h-[88dvh] h-[88dvh] rounded-t-[22px] flex flex-col z-50 focus:outline-hidden">
          
          {/* Asa de arrastre táctil */}
          <div className="pt-3 pb-2 flex-shrink-0 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-zinc-700/80 active:bg-zinc-500 cursor-grab" />
          </div>

          {/* Encabezado fijo del Drawer */}
          <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="p-1.5 rounded-lg bg-red-950/60 border border-red-800/50 text-red-400 flex-shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wide block truncate">
                  {numeroTema ? `Tema ${numeroTema}` : 'Temario Oficial'}
                  {tituloTema ? ` · ${tituloTema}` : ''}
                </span>
                <h3 className="text-sm font-bold text-zinc-100 truncate">
                  {seccion?.epigrafe || 'Consulta de Temario'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all flex-shrink-0"
              aria-label="Cerrar temario"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader informativo: aviso de verificación rápida */}
          <div className="bg-zinc-950/60 px-4 py-1.5 border-b border-zinc-800/40 text-[11px] text-zinc-400 flex items-center justify-between flex-shrink-0">
            <span>⚡ Verificación literal de respuesta oficial</span>
            <span className="text-yellow-400 font-medium">Subrayado automático</span>
          </div>

          {/* Contenido scrolleable del temario */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
            {renderContenidoConCita()}

            {/* Datos críticos de la sección si existen */}
            {seccion?.datos_criticos && seccion.datos_criticos.length > 0 && (
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span>⚡</span> Chuleta Express de este epígrafe
                </h4>
                <div className="grid gap-2">
                  {seccion.datos_criticos.map((dc, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{dc.concepto}</span>
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {dc.valor_exacto}
                        </span>
                      </div>
                      {dc.trampa_habitual && (
                        <p className="text-[11px] text-zinc-400">
                          <span className="text-red-400 font-medium">Trampa: </span>
                          {dc.trampa_habitual}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-10" />
          </div>

          {/* Botón inferior para reanudar el test sin perder el hilo */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/95 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-100 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Volver a la Pregunta</span>
            </button>
          </div>

        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
