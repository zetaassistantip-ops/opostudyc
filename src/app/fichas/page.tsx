'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Flame,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Brain,
  Target,
  Dices,
  BookOpen,
  Check,
  EyeOff,
  Flag,
  FileText,
  Image as ImageIcon,
  Send,
  Trash2,
  Play,
  Upload,
} from 'lucide-react';
import { Tema, FichaTecnica } from '@/lib/types';
import {
  getTemas,
  getFichasTecnicas,
  evaluarFichaAnki,
  guardarNotaMnemotecnica,
  subirImagenMnemotecnica,
  eliminarFichaUsuario,
  reportarFichaEliminar,
  proponerImagenFicha,
  getMetaFichasDiarias,
  guardarMetaFichasDiarias,
  solicitarExplicacionIA,
  solicitarGeneracionFichas,
  purgarFichasDefectuosas,
  resetearBancoFichasAdmin,
} from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import { useAuth } from '@/context/AuthContext';

/**
 * Detector de Fichas Defectuosas / Corruptas
 */
function esFichaCorrupta(f: FichaTecnica): boolean {
  const frente = (f.frente_pregunta || '').trim();
  const dorso = (f.dorso_respuesta || f.valor_exacto || '').trim();
  const concepto = (f.concepto || '').trim();

  // 1. Frente nulo, vacío, menos de 20 caracteres o empieza por "Dato técnico"
  if (!frente || frente.length < 20) return true;
  if (/^dato\s+t[eé]cnico/i.test(frente) || /^dato\s+t[eé]cnico/i.test(concepto)) return true;

  // 2. Respuesta menor a 5 caracteres
  if (!dorso || dorso.length < 5) return true;

  return false;
}

/**
 * Compresión de imagen a WebP (máximo 800px, calidad 0.7, ~30-40 KB)
 */
async function comprimirImagenAWebp(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo inicializar canvas'));

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Fallo en compresión WebP'));
          },
          'image/webp',
          0.7
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Formateador de texto y tablas del reverso de la ficha Anki
 */
function FormatoDorsoAnki({ texto }: { texto: string }) {
  if (!texto) return null;

  const lineas = texto.split('\n');
  const esTablaMarkdown = lineas.some((l) => l.includes('|') && l.trim().startsWith('|'));

  if (esTablaMarkdown) {
    const lineasTabla = lineas.filter((l) => l.trim().startsWith('|'));
    const lineasFuera = lineas.filter((l) => !l.trim().startsWith('|') && l.trim().length > 0);

    if (lineasTabla.length >= 2) {
      const parsearFila = (f: string) =>
        f
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

      const header = parsearFila(lineasTabla[0]);
      const filas = lineasTabla.slice(2).map(parsearFila);

      return (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <table className="w-full text-xs text-left border-collapse bg-white dark:bg-slate-900">
              <thead className="bg-slate-900 dark:bg-slate-800 text-white font-mono uppercase text-[10px]">
                <tr>
                  {header.map((h, i) => (
                    <th key={i} className="p-2 border border-slate-700 dark:border-slate-600 font-extrabold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filas.map((fila, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'}>
                    {fila.map((celda, j) => (
                      <td key={j} className="p-2 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-slate-100">
                        {celda}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lineasFuera.length > 0 && (
            <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1 font-medium">
              {lineasFuera.map((l, i) => (
                <p
                  key={i}
                  className={
                    l.includes('⚠️')
                      ? 'text-amber-950 dark:text-amber-200 font-bold bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800'
                      : ''
                  }
                >
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // Si contiene advertencia de trampa
  const partes = texto.split(/(⚠️\s*Trampa de examen:[\s\S]*)/i);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-950 dark:text-slate-100 whitespace-pre-line leading-relaxed">
        {partes[0]}
      </div>
      {partes[1] && (
        <div className="text-xs text-amber-950 dark:text-amber-200 font-bold bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-300 dark:border-amber-800 whitespace-pre-line leading-relaxed">
          {partes[1]}
        </div>
      )}
    </div>
  );
}

/**
 * Modal Lightbox con Pinch-to-Zoom y Pan
 */
function LightboxModal({
  imagenUrl,
  onCerrar,
}: {
  imagenUrl: string | null;
  onCerrar: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  if (!imagenUrl) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX - pos.x,
        y: e.touches[0].clientY - pos.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      setScale((prev) => Math.min(4, Math.max(1, prev * ratio)));
      touchStartDistRef.current = dist;
    } else if (e.touches.length === 1 && touchStartPosRef.current && scale > 1) {
      setPos({
        x: e.touches[0].clientX - touchStartPosRef.current.x,
        y: e.touches[0].clientY - touchStartPosRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartPosRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY * -0.002;
    setScale((prev) => Math.min(4, Math.max(1, prev + delta)));
  };

  const zoomIn = () => setScale((s) => Math.min(4, s + 0.4));
  const zoomOut = () => setScale((s) => Math.max(1, s - 0.4));
  const resetZoom = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col justify-between bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onCerrar}
    >
      <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-white/10 border border-white/20">
          🔍 Zoom: {Math.round(scale * 100)}%
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold cursor-pointer"
            title="Resetear zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onCerrar}
            className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
            title="Cerrar visor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenUrl}
          alt="Esquema a pantalla completa"
          className="max-h-[82vh] max-w-full object-contain rounded-xl transition-transform duration-75 cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          }}
        />
      </div>

      <div className="text-center text-[11px] text-white/70 font-mono">
        💡 Pellizca con 2 dedos o usa los botones +/- para ampliar tablas y esquemas al detalle.
      </div>
    </div>
  );
}

/**
 * Ficha individual dentro del visor vertical a pantalla completa
 */
function FichaAnkiItem({
  id,
  index,
  total,
  ficha,
  tema,
  onEvaluar,
  onAbrirLightbox,
  user,
}: {
  id: string;
  index: number;
  total: number;
  ficha: FichaTecnica;
  tema?: Tema | null;
  onEvaluar: (calificacion: 'dificil' | 'medio' | 'facil') => void;
  onAbrirLightbox: (url: string) => void;
  user: any;
}) {
  const [estaVolteada, setEstaVolteada] = useState(false);
  const [pildoraAbierta, setPildoraAbierta] = useState<'ninguna' | 'ia' | 'nota' | 'imagen'>('ninguna');

  // Estados nota mnemotécnica
  const [notaTexto, setNotaTexto] = useState(ficha.usuarioSRS?.nota_mnemotecnica || '');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [notaGuardadaOk, setNotaGuardadaOk] = useState(false);

  // Estados explicación IA
  const [explicacion, setExplicacion] = useState<string | null>(ficha.explicacion_ia || null);
  const [cargandoIA, setCargandoIA] = useState(false);

  // Estados imagen
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [imagenUrlLocal, setImagenUrlLocal] = useState<string | null>(
    ficha.usuarioSRS?.imagen_url || ficha.imagen_oficial_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGuardarNota = async () => {
    setGuardandoNota(true);
    try {
      await guardarNotaMnemotecnica(ficha.id, notaTexto);
      if (ficha.usuarioSRS) {
        ficha.usuarioSRS.nota_mnemotecnica = notaTexto;
      }
      setNotaGuardadaOk(true);
      setTimeout(() => setNotaGuardadaOk(false), 2000);
    } finally {
      setGuardandoNota(false);
    }
  };

  const handlePedirExplicacionIA = async () => {
    if (explicacion) {
      setPildoraAbierta(pildoraAbierta === 'ia' ? 'ninguna' : 'ia');
      return;
    }
    setCargandoIA(true);
    setPildoraAbierta('ia');
    try {
      const res = await solicitarExplicacionIA(
        ficha.id,
        ficha.frente_pregunta || ficha.concepto,
        ficha.dorso_respuesta || ficha.valor_exacto,
        ficha.tema_id
      );
      if (res.ok && res.explicacion) {
        setExplicacion(res.explicacion);
        ficha.explicacion_ia = res.explicacion;
      }
    } finally {
      setCargandoIA(false);
    }
  };

  const handleSubirArchivoImagen = async (file: File) => {
    setSubiendoImagen(true);
    try {
      const blobWebp = await comprimirImagenAWebp(file);
      const res = await subirImagenMnemotecnica(ficha.id, blobWebp);
      if (res.ok && res.url) {
        setImagenUrlLocal(res.url);
        if (ficha.usuarioSRS) {
          ficha.usuarioSRS.imagen_url = res.url;
        }
        setPildoraAbierta('ninguna');
      } else {
        alert('Error al subir la imagen');
      }
    } catch {
      alert('Error procesando o comprimiendo imagen WebP');
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleProponerPublica = async (file: File) => {
    setSubiendoImagen(true);
    try {
      const blobWebp = await comprimirImagenAWebp(file);
      const subida = await subirImagenMnemotecnica(ficha.id, blobWebp);
      if (!subida.ok || !subida.url) {
        alert('Error al subir imagen');
        return;
      }
      const res = await proponerImagenFicha(
        ficha.id,
        subida.url,
        user?.email || 'opositor@opostudyc.es'
      );
      if (res.ok) {
        setImagenUrlLocal(subida.url);
        setPildoraAbierta('ninguna');
        alert('✨ Imagen propuesta al Administrador para compartir con todos.');
      }
    } catch {
      alert('Error procesando la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  return (
    <div
      id={id}
      className="h-[calc(100dvh-3rem)] w-full snap-start snap-always flex flex-col justify-between p-4 sm:p-6 overflow-hidden bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80"
    >
      {!estaVolteada ? (
        /* ================= CARA DELANTERA (PREGUNTA) ================= */
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
          {/* Badge de contexto */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>
              {ficha.categoria_dato || ficha.concepto || `Tema ${ficha.tema_id}`}
            </span>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
              {ficha.tipo_ficha === 'tabla' ? '📊 Tabla' : '🎯 Clave'}
            </span>
          </div>

          {/* Pregunta centrada con tipografía de alto impacto */}
          <div
            onClick={() => setEstaVolteada(true)}
            className="flex-1 flex flex-col items-center justify-center text-center px-2 py-6 cursor-pointer group"
          >
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed max-w-xl group-hover:text-red-600 transition-colors">
              {ficha.frente_pregunta || ficha.concepto}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 font-medium flex items-center gap-1.5 animate-pulse">
              <span>Toca la tarjeta o el botón inferior para voltear</span>
            </p>
          </div>

          {/* Botón inferior grande de voltear */}
          <div className="pt-3">
            <button
              type="button"
              onClick={() => setEstaVolteada(true)}
              className="w-full py-4 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <span>🔄 Voltear Ficha</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= CARA TRASERA (SOLUCIÓN) ================= */
        <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn overflow-hidden">
          {/* Cabecera con pregunta compacta y botón de desvoltear */}
          <div>
            <div className="flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="line-clamp-2 font-medium">
                {ficha.frente_pregunta || ficha.concepto}
              </span>
              <button
                type="button"
                onClick={() => setEstaVolteada(false)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex-shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>↩️</span>
              </button>
            </div>
            <hr className="my-2.5 border-slate-100 dark:border-slate-800" />
          </div>

          {/* Centro scrollable con la solución maquetada y complementos */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
            {/* Solución técnica o tabla */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <FormatoDorsoAnki texto={ficha.dorso_respuesta || ficha.valor_exacto} />
            </div>

            {/* Imagen mnemotécnica adjunta */}
            {imagenUrlLocal && (
              <div
                onClick={() => onAbrirLightbox(imagenUrlLocal)}
                className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer group bg-slate-900"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenUrlLocal}
                  alt="Esquema"
                  className="w-full max-h-48 object-contain mx-auto group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-2 right-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded-md font-mono flex items-center gap-1 backdrop-blur-xs">
                  <ZoomIn className="w-3 h-3" /> Ampliar
                </span>
              </div>
            )}

            {/* Nota privada del usuario si existe */}
            {ficha.usuarioSRS?.nota_mnemotecnica && pildoraAbierta !== 'nota' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Mi regla mnemotécnica:
                  </span>
                  <p className="mt-0.5 whitespace-pre-line">
                    {ficha.usuarioSRS.nota_mnemotecnica}
                  </p>
                </div>
              </div>
            )}

            {/* Explicación IA si existe */}
            {explicacion && pildoraAbierta !== 'ia' && (
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-xs text-sky-950 dark:text-sky-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300 text-[11px] uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>Explicación del Profesor IA</span>
                </div>
                <div
                  className="leading-relaxed whitespace-pre-line pt-0.5"
                  dangerouslySetInnerHTML={{
                    __html: explicacion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              </div>
            )}

            {/* Píldoras de acción bajo demanda (despliegan cajones limpios) */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handlePedirExplicacionIA}
                disabled={cargandoIA}
                className={`text-xs py-1.5 px-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  pildoraAbierta === 'ia'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {cargandoIA ? (
                  <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                )}
                <span>✨ Explicación IA</span>
              </button>

              <button
                type="button"
                onClick={() => setPildoraAbierta(pildoraAbierta === 'nota' ? 'ninguna' : 'nota')}
                className={`text-xs py-1.5 px-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  pildoraAbierta === 'nota'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>📝 + Mi nota</span>
              </button>

              <button
                type="button"
                onClick={() => setPildoraAbierta(pildoraAbierta === 'imagen' ? 'ninguna' : 'imagen')}
                className={`text-xs py-1.5 px-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                  pildoraAbierta === 'imagen'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>🖼️ + Imagen</span>
              </button>
            </div>

            {/* Cajón desplegable: Explicación IA en carga o vista */}
            {pildoraAbierta === 'ia' && explicacion && (
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-xs text-sky-950 dark:text-sky-200 space-y-1 animate-fadeIn">
                <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-300 text-[11px] uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    Explicación del Profesor IA
                  </span>
                  <button onClick={() => setPildoraAbierta('ninguna')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div
                  className="leading-relaxed whitespace-pre-line pt-1"
                  dangerouslySetInnerHTML={{
                    __html: explicacion.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                  }}
                />
              </div>
            )}

            {/* Cajón desplegable: Escribir Nota */}
            {pildoraAbierta === 'nota' && (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-300">
                  <span>Regla mnemotécnica o apunte privado:</span>
                  <button onClick={() => setPildoraAbierta('ninguna')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  placeholder="Ej: Para acordarme de 45° y 3 bar pienso en..."
                  rows={2}
                  className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-2">
                  {notaGuardadaOk && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Guardada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleGuardarNota}
                    disabled={guardandoNota}
                    className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {guardandoNota ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              </div>
            )}

            {/* Cajón desplegable: Subir o pegar imagen */}
            {pildoraAbierta === 'imagen' && (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <span>Adjuntar esquema o regla nemotécnica visual:</span>
                  <button onClick={() => setPildoraAbierta('ninguna')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSubirArchivoImagen(f);
                  }}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoImagen}
                    className="py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Solo para mí</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const f = e.target.files?.[0];
                        if (f) handleProponerPublica(f);
                      };
                      input.click();
                    }}
                    disabled={subiendoImagen}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Proponer a todos</span>
                  </button>
                </div>
                {subiendoImagen && (
                  <p className="text-[11px] text-emerald-700 text-center animate-pulse">
                    Comprimiendo y optimizando WebP...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pie fijo inferior: Los 3 Botones de Anki */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onEvaluar('dificil')}
                className="py-3 px-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="font-extrabold">🔴 Difícil</span>
                <span className="text-[10px] text-rose-500 font-mono mt-0.5">&lt; 1 día</span>
              </button>

              <button
                type="button"
                onClick={() => onEvaluar('medio')}
                className="py-3 px-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-95 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="font-extrabold">🟡 Medio</span>
                <span className="text-[10px] text-amber-500 font-mono mt-0.5">3-4 días</span>
              </button>

              <button
                type="button"
                onClick={() => onEvaluar('facil')}
                className="py-3 px-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="font-extrabold">🟢 Fácil</span>
                <span className="text-[10px] text-emerald-500 font-mono mt-0.5">7+ días</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FichasPage() {
  const { user, esAdmin } = useAuth();
  const [todasFichas, setTodasFichas] = useState<FichaTecnica[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [cargando, setCargando] = useState(true);

  // Selector inicial vs Modo Inmersivo
  const [modoInmersivo, setModoInmersivo] = useState(false);

  // Modos de estudio: 'curva' (SM-2) | 'temas' | 'aleatorio'
  const [modoMazo, setModoMazo] = useState<'curva' | 'temas' | 'aleatorio'>('curva');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [modalSelectorTemasAbierto, setModalSelectorTemasAbierto] = useState(false);
  const [busquedaTema, setBusquedaTema] = useState('');

  // Meta diaria y cola de estudio
  const [metaDiaria, setMetaDiaria] = useState<number>(20);
  const [colaEstudio, setColaEstudio] = useState<FichaTecnica[]>([]);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [sesionTerminada, setSesionTerminada] = useState(false);

  // Menús y modals
  const [menuReportarAbierto, setMenuReportarAbierto] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [modalResetAdminAbierto, setModalResetAdminAbierto] = useState(false);
  const [reseteandoAdmin, setReseteandoAdmin] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Cargar meta diaria, temas y fichas (con Autolimpieza de defectuosas)
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [meta, listaTemas, listaFichasRaw] = await Promise.all([
        getMetaFichasDiarias(),
        getTemas(),
        getFichasTecnicas(),
      ]);

      setMetaDiaria(meta);
      setTemas(listaTemas);

      // AUTOLIMPIEZA DE FICHAS DEFECTUOSAS / CORRUPTAS (<20 caracteres o que empiece por "Dato técnico")
      const corruptas = listaFichasRaw.filter(esFichaCorrupta);
      const listaValidas = listaFichasRaw.filter((f) => !esFichaCorrupta(f));

      if (corruptas.length > 0) {
        purgarFichasDefectuosas(corruptas.map((c) => c.id));
      }

      setTodasFichas(listaValidas);
    } catch (e) {
      console.error('Error cargando fichas:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // 2. Construir cola de estudio según el modo activo
  useEffect(() => {
    if (todasFichas.length === 0) {
      setColaEstudio([]);
      setIndiceActivo(0);
      setSesionTerminada(false);
      return;
    }

    if (modoMazo === 'temas') {
      const temasValidos = temasSeleccionados.length > 0 ? temasSeleccionados : [todasFichas[0]?.tema_id || 1];
      const filtradas = todasFichas.filter((f) => temasValidos.includes(f.tema_id));
      setColaEstudio(filtradas);
      setIndiceActivo(0);
      setSesionTerminada(filtradas.length === 0);
      return;
    }

    if (modoMazo === 'aleatorio') {
      const barajadas = [...todasFichas].sort(() => Math.random() - 0.5);
      setColaEstudio(barajadas);
      setIndiceActivo(0);
      setSesionTerminada(barajadas.length === 0);
      return;
    }

    // Modo 'curva' (Algoritmo SM-2 Anki)
    const ahora = Date.now();
    const vistas = todasFichas.filter(
      (f) => f.usuarioSRS && (f.usuarioSRS.repeticiones > 0 || f.usuarioSRS.ultima_revision)
    );
    const pendientesRepaso = vistas
      .filter((f) => f.usuarioSRS && new Date(f.usuarioSRS.proximo_repaso).getTime() <= ahora)
      .sort((a, b) => {
        const facA = a.usuarioSRS?.factor_facilidad ?? 2.5;
        const facB = b.usuarioSRS?.factor_facilidad ?? 2.5;
        return facA - facB;
      });

    const nuevas = todasFichas
      .filter((f) => !f.usuarioSRS || (f.usuarioSRS.repeticiones === 0 && !f.usuarioSRS.ultima_revision))
      .sort(() => Math.random() - 0.5);

    const totalCupo = metaDiaria;
    const cupoRepaso = Math.round(totalCupo * 0.7);
    const cupoNuevas = totalCupo - cupoRepaso;

    let seleccionRepaso = pendientesRepaso.slice(0, cupoRepaso);
    let seleccionNuevas = nuevas.slice(0, cupoNuevas);

    if (seleccionRepaso.length < cupoRepaso) {
      const faltantes = cupoRepaso - seleccionRepaso.length;
      seleccionNuevas = [...seleccionNuevas, ...nuevas.slice(cupoNuevas, cupoNuevas + faltantes)];
    } else if (seleccionNuevas.length < cupoNuevas) {
      const faltantes = cupoNuevas - seleccionNuevas.length;
      seleccionRepaso = [...seleccionRepaso, ...pendientesRepaso.slice(cupoRepaso, cupoRepaso + faltantes)];
    }

    let colaFinal = [...seleccionRepaso, ...seleccionNuevas];
    if (colaFinal.length < totalCupo) {
      const idsYa = new Set(colaFinal.map((f) => f.id));
      const restantes = todasFichas.filter((f) => !idsYa.has(f.id)).slice(0, totalCupo - colaFinal.length);
      colaFinal = [...colaFinal, ...restantes];
    }

    const colaMezclada = colaFinal.sort(() => Math.random() - 0.5);
    setColaEstudio(colaMezclada);
    setIndiceActivo(0);
    setSesionTerminada(colaMezclada.length === 0);
  }, [todasFichas, modoMazo, temasSeleccionados, metaDiaria]);

  // Listener del scroll para actualizar contador de arriba (2 / 20)
  const handleScrollContainer = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    if (clientHeight > 0) {
      const nuevoIndice = Math.round(scrollTop / clientHeight);
      if (nuevoIndice >= 0 && nuevoIndice < colaEstudio.length && nuevoIndice !== indiceActivo) {
        setIndiceActivo(nuevoIndice);
      }
    }
  };

  // Evaluación Anki y auto-scroll a la siguiente ficha
  const handleEvaluarFicha = async (
    ficha: FichaTecnica,
    calificacion: 'dificil' | 'medio' | 'facil',
    index: number
  ) => {
    evaluarFichaAnki(ficha.id, calificacion, ficha.usuarioSRS);

    if (index + 1 < colaEstudio.length) {
      const nextCardEl = document.getElementById(`ficha-${index + 1}`);
      if (nextCardEl) {
        nextCardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setIndiceActivo(index + 1);
    } else {
      setSesionTerminada(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  // Descartar ficha solo de mi mazo
  const handleDescartarDeMiMazo = async () => {
    const ficha = colaEstudio[indiceActivo];
    if (!ficha) return;
    await eliminarFichaUsuario(ficha.id);
    setMenuReportarAbierto(false);

    const nuevaCola = colaEstudio.filter((_, i) => i !== indiceActivo);
    setColaEstudio(nuevaCola);
    if (nuevaCola.length === 0) {
      setSesionTerminada(true);
    }
  };

  // Reportar ficha al admin
  const handleReportarAlAdmin = async () => {
    const ficha = colaEstudio[indiceActivo];
    if (!ficha) return;
    await reportarFichaEliminar(ficha.id);
    setMenuReportarAbierto(false);

    const nuevaCola = colaEstudio.filter((_, i) => i !== indiceActivo);
    setColaEstudio(nuevaCola);
    alert('🚩 Ficha reportada al Administrador para su revisión o borrado.');
    if (nuevaCola.length === 0) {
      setSesionTerminada(true);
    }
  };

  // Generación IA bajo demanda
  const handleGenerarFichasIA = async () => {
    const temaIdObjetivo =
      modoMazo === 'temas' && temasSeleccionados.length > 0
        ? temasSeleccionados[0]
        : colaEstudio[indiceActivo]?.tema_id || 1;

    setGenerandoIA(true);
    try {
      const res = await solicitarGeneracionFichas(temaIdObjetivo);
      if (res.ok && res.fichas.length > 0) {
        const validas = res.fichas.filter((f) => !esFichaCorrupta(f));
        setTodasFichas((prev) => {
          const idsPrev = new Set(prev.map((f) => f.id));
          const nuevas = validas.filter((f) => !idsPrev.has(f.id));
          return [...nuevas, ...prev];
        });
        alert(`⚡ Se han generado ${validas.length} nuevas fichas de examen.`);
      } else {
        alert(res.error || 'No se pudieron generar fichas con IA.');
      }
    } finally {
      setGenerandoIA(false);
    }
  };

  // Reset total del banco por Admin
  const handleConfirmarResetAdmin = async () => {
    setReseteandoAdmin(true);
    try {
      const ok = await resetearBancoFichasAdmin();
      if (ok) {
        setTodasFichas([]);
        setColaEstudio([]);
        setIndiceActivo(0);
        setModalResetAdminAbierto(false);
      } else {
        alert('Error reseteando el banco de fichas.');
      }
    } finally {
      setReseteandoAdmin(false);
    }
  };

  const temasFiltradosSelector = useMemo(() => {
    return temas.filter(
      (t) =>
        busquedaTema === '' ||
        t.titulo.toLowerCase().includes(busquedaTema.toLowerCase()) ||
        t.id.toString() === busquedaTema.trim()
    );
  }, [temas, busquedaTema]);

  const fichaActiva = colaEstudio[indiceActivo];
  const temaFichaActiva = useMemo(() => {
    if (!fichaActiva) return null;
    return temas.find((t) => t.id === fichaActiva.tema_id);
  }, [fichaActiva, temas]);

  // Contadores para el selector previo (calculados en useEffect para evitar Date.now() en prerender)
  const [statsMazo, setStatsMazo] = useState({ pendientes: 0, dominadas: 0, total: 0 });

  useEffect(() => {
    const ahora = Date.now();
    const pendientes = todasFichas.filter(
      (f) =>
        !f.usuarioSRS ||
        new Date(f.usuarioSRS.proximo_repaso).getTime() <= ahora ||
        f.usuarioSRS.repeticiones === 0
    ).length;
    const dominadas = todasFichas.filter((f) => (f.usuarioSRS?.repeticiones || 0) >= 3).length;
    setStatsMazo({ pendientes, dominadas, total: todasFichas.length });
  }, [todasFichas]);

  return (
    <>
      {/* ============================================================== */}
      {/* VISTA 1: MODO INMERSIVO PANTALLA COMPLETA (100dvh)             */}
      {/* ============================================================== */}
      {modoInmersivo ? (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-white dark:bg-slate-950 flex flex-col select-none overflow-hidden">
          {/* Barra superior mínima (h-12) */}
          <header className="h-12 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex-shrink-0 z-10">
            {/* Izquierda: Badge de Tema y Contador */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md">
                {fichaActiva ? `Tema ${fichaActiva.tema_id}` : 'Fichas'}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {colaEstudio.length > 0 ? `${indiceActivo + 1} / ${colaEstudio.length}` : '0 / 0'}
              </span>
            </div>

            {/* Derecha: Descartar / Reportar y Botón X para Salir */}
            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setMenuReportarAbierto((prev) => !prev)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Descartar u ocultar ficha"
              >
                <Flag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Descartar</span>
              </button>

              {/* Menú desplegable Descartar / Reportar */}
              {menuReportarAbierto && (
                <div className="absolute right-10 top-10 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl p-1.5 z-50 text-xs space-y-1 animate-fadeIn">
                  <button
                    onClick={handleDescartarDeMiMazo}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <EyeOff className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="font-bold block">Ocultar de mi mazo</span>
                      <span className="text-[10px] text-slate-400">No volver a verla en mis repasos</span>
                    </div>
                  </button>

                  <button
                    onClick={handleReportarAlAdmin}
                    className="w-full text-left p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-rose-600" />
                    <div>
                      <span className="font-bold block">Reportar al Admin</span>
                      <span className="text-[10px] text-rose-500">Avisar para corregir o borrar</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Botón X de Salida */}
              <button
                type="button"
                onClick={() => setModoInmersivo(false)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Salir a la vista previa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Contenedor de Fichas con Scroll Snap Vertical Estilo Reels */}
          {sesionTerminada || colaEstudio.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                ¡Mazo Completado por Hoy!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                El algoritmo Anki SM-2 ha reprogramado cada ficha según tu memoria a corto y medio plazo.
              </p>
              <div className="pt-2 w-full space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const barajadas = [...todasFichas].sort(() => Math.random() - 0.5);
                    setColaEstudio(barajadas.slice(0, metaDiaria));
                    setIndiceActivo(0);
                    setSesionTerminada(false);
                  }}
                  className="w-full py-3 bg-slate-950 dark:bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Estudiar otra tanda</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoInmersivo(false)}
                  className="w-full py-2.5 text-xs text-slate-500 font-semibold hover:text-slate-800 dark:hover:text-slate-200 block"
                >
                  Salir de pantalla completa
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleScrollContainer}
              className="h-[calc(100dvh-3rem)] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
              style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {colaEstudio.map((ficha, idx) => (
                <FichaAnkiItem
                  key={ficha.id}
                  id={`ficha-${idx}`}
                  index={idx}
                  total={colaEstudio.length}
                  ficha={ficha}
                  tema={temas.find((t) => t.id === ficha.tema_id)}
                  onEvaluar={(calif) => handleEvaluarFicha(ficha, calif, idx)}
                  onAbrirLightbox={(url) => setLightboxUrl(url)}
                  user={user}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* VISTA 2: SELECTOR PREVIO Y CONFIGURACIÓN DEL MAZO             */
        /* ============================================================== */
        <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 select-none">
          {/* Cabecera */}
          <header className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <Link
                href="/"
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 transition-colors cursor-pointer shadow-xs"
                aria-label="Volver al temario"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                  <span>🃏 Fichas Anki Minimalistas</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">
                  Tablas, Cifras y Datos de Tribunal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {esAdmin && (
                <button
                  onClick={() => setModalResetAdminAbierto(true)}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
                  title="Resetear todo el banco de fichas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
              <UserAuthButton />
            </div>
          </header>

          {/* Selector Limpio de los 3 Modos */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 shadow-xs">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Modo de Estudio
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setModoMazo('curva')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modoMazo === 'curva'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-amber-500" />
                <span>Curva SRS</span>
              </button>

              <button
                onClick={() => {
                  setModoMazo('temas');
                  if (temasSeleccionados.length === 0 && todasFichas.length > 0) {
                    setTemasSeleccionados([todasFichas[0]?.tema_id || 1]);
                  }
                }}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modoMazo === 'temas'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-red-500" />
                <span>Por Temas</span>
              </button>

              <button
                onClick={() => setModoMazo('aleatorio')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modoMazo === 'aleatorio'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Dices className="w-3.5 h-3.5 text-blue-500" />
                <span>Aleatorio</span>
              </button>
            </div>

            {/* Selector de Temas desplegable si está en modo Temas */}
            {modoMazo === 'temas' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setModalSelectorTemasAbierto(true)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="truncate">
                    {temasSeleccionados.length === 0
                      ? 'Todos los temas'
                      : temasSeleccionados.length === 1
                      ? `Tema ${temasSeleccionados[0]}: ${temas.find((t) => t.id === temasSeleccionados[0])?.titulo || ''}`
                      : `${temasSeleccionados.length} temas seleccionados`}
                  </span>
                  <span className="text-[11px] text-red-600 font-bold ml-2 flex-shrink-0">
                    Cambiar ▾
                  </span>
                </button>
              </div>
            )}
          </section>

          {/* Selector de Meta Diaria */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Meta Diaria de Repaso
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {metaDiaria} fichas
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setMetaDiaria(num);
                    guardarMetaFichasDiarias(num);
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    metaDiaria === num
                      ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>

          {/* Tarjeta de Estadísticas Rápidas */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {statsMazo.total}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                Total Banco
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <span className="text-lg font-black text-amber-500">
                {statsMazo.pendientes}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                Para Hoy
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
              <span className="text-lg font-black text-emerald-600">
                {statsMazo.dominadas}
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                Afianzadas
              </span>
            </div>
          </div>

          {/* Botón Principal: Entrar a Pantalla Completa */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setIndiceActivo(0);
                setSesionTerminada(false);
                setModoInmersivo(true);
              }}
              disabled={colaEstudio.length === 0}
              className="w-full py-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>▶️ Entrar a estudiar a Pantalla Completa ({colaEstudio.length})</span>
            </button>

            <button
              type="button"
              onClick={handleGenerarFichasIA}
              disabled={generandoIA}
              className="w-full py-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {generandoIA ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extrayendo tablas y datos del temario...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ Generar nuevas fichas IA de este tema</span>
                </>
              )}
            </button>
          </div>

          <BottomNav />
        </div>
      )}

      {/* Modal Pinch-to-Zoom Lightbox */}
      <LightboxModal
        imagenUrl={lightboxUrl}
        onCerrar={() => setLightboxUrl(null)}
      />

      {/* Modal Selección Múltiple de Temas */}
      {modalSelectorTemasAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setModalSelectorTemasAbierto(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Seleccionar Temas
              </h3>
              <button
                onClick={() => setModalSelectorTemasAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <input
                type="text"
                placeholder="Buscar tema o número..."
                value={busquedaTema}
                onChange={(e) => setBusquedaTema(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {temasFiltradosSelector.map((t) => {
                const seleccionado = temasSeleccionados.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (seleccionado) {
                        setTemasSeleccionados((prev) => prev.filter((id) => id !== t.id));
                      } else {
                        setTemasSeleccionados((prev) => [...prev, t.id]);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      seleccionado
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 font-bold border border-red-200 dark:border-red-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate pr-2">
                      <strong className="font-mono mr-1.5">T{t.id}.</strong>
                      {t.titulo}
                    </span>
                    {seleccionado && <Check className="w-4 h-4 text-red-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setTemasSeleccionados([])}
                className="text-xs text-slate-500 font-semibold hover:text-slate-800"
              >
                Limpiar selección
              </button>
              <button
                type="button"
                onClick={() => setModalSelectorTemasAbierto(false)}
                className="py-2 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-xs"
              >
                Listo ({temasSeleccionados.length || 'Todos'})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin Reset Total */}
      {modalResetAdminAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setModalResetAdminAbierto(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-600 p-5 w-full max-w-sm space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>¿Resetear Todo el Banco de Fichas?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Esta acción eliminará todas las fichas de la base de datos de Supabase para poder regenerarlas desde cero con el nuevo motor de 2 capas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalResetAdminAbierto(false)}
                className="py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarResetAdmin}
                disabled={reseteandoAdmin}
                className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {reseteandoAdmin ? 'Borrando...' : 'Sí, vaciar banco'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
