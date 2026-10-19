'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Flame,
  Zap,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Globe,
  Lock,
  Layers,
  HelpCircle,
  FileText,
  Filter,
  Brain,
  Target,
  Dices,
  Search,
  BookOpen,
  Check,
  Eye,
} from 'lucide-react';
import { Tema, FichaTecnica } from '@/lib/types';
import {
  getTemas,
  getFichasTecnicas,
  evaluarFichaAnki,
  guardarNotaMnemotecnica,
  subirImagenMnemotecnica,
  eliminarImagenMnemotecnica,
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

  // 2. Respuesta es solo un número suelto sin contexto (ej. "15 años", "25", "3.5 bar")
  const soloNumeroOFragmento = /^[\d.,\s/-]+(\s*(años?|meses?|d[ií]as?|horas?|minutos?|segundos?|m|cm|mm|kg|bar|l|litros?|%))?$/i.test(dorso);
  if (soloNumeroOFragmento && dorso.length < 15) return true;

  if (dorso.length < 5) return true;

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
          <div className="overflow-x-auto rounded-xl border-2 border-slate-900 shadow-xs">
            <table className="w-full text-xs text-left border-collapse bg-white">
              <thead className="bg-slate-900 text-white font-mono uppercase text-[10px]">
                <tr>
                  {header.map((h, i) => (
                    <th key={i} className="p-2 border border-slate-700 font-extrabold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filas.map((fila, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {fila.map((celda, j) => (
                      <td key={j} className="p-2 border border-slate-200 font-medium text-slate-900">
                        {celda}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lineasFuera.length > 0 && (
            <div className="text-xs text-slate-800 space-y-1 font-medium">
              {lineasFuera.map((l, i) => (
                <p
                  key={i}
                  className={
                    l.includes('⚠️')
                      ? 'text-amber-950 font-bold bg-amber-50 p-2.5 rounded-xl border-2 border-amber-300'
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
      <div className="text-sm font-semibold text-slate-950 whitespace-pre-line leading-relaxed">
        {partes[0]}
      </div>
      {partes[1] && (
        <div className="text-xs text-amber-950 font-bold bg-amber-50 p-3 rounded-xl border-2 border-amber-300 whitespace-pre-line leading-relaxed">
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
      className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn"
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

export default function FichasPage() {
  const { user, esAdmin } = useAuth();
  const [todasFichas, setTodasFichas] = useState<FichaTecnica[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modos de estudio: 'curva' (SM-2) | 'temas' | 'aleatorio'
  const [modoMazo, setModoMazo] = useState<'curva' | 'temas' | 'aleatorio'>('curva');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [modalSelectorTemasAbierto, setModalSelectorTemasAbierto] = useState(false);
  const [busquedaTema, setBusquedaTema] = useState('');

  // Meta diaria y cola de estudio
  const [metaDiaria, setMetaDiaria] = useState<number>(20);
  const [colaEstudio, setColaEstudio] = useState<FichaTecnica[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [estaGirada, setEstaGirada] = useState(false);
  const [sesionTerminada, setSesionTerminada] = useState(false);

  // FÍSICA TINDER REAL (dragX, dragY, exitDirection)
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Explicación IA y lightbox
  const [explicacionActual, setExplicacionActual] = useState<string | null>(null);
  const [cargandoExplicacion, setCargandoExplicacion] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal para proponer o guardar imagen
  const [modalImagenSubida, setModalImagenSubida] = useState<{
    blob: Blob;
    previewUrl: string;
  } | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Modal para descartar o reportar ficha
  const [modalDescartarAbierto, setModalDescartarAbierto] = useState(false);
  const [reportando, setReportando] = useState(false);

  // Modal Admin reset total
  const [modalResetAdminAbierto, setModalResetAdminAbierto] = useState(false);
  const [reseteandoAdmin, setReseteandoAdmin] = useState(false);

  // Generador IA
  const [generandoIA, setGenerandoIA] = useState(false);

  // Nota mnemotécnica
  const [notaTexto, setNotaTexto] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // AUTOLIMPIEZA DE FICHAS DEFECTUOSAS / CORRUPTAS
      const corruptas = listaFichasRaw.filter(esFichaCorrupta);
      let listaValidas = listaFichasRaw.filter((f) => !esFichaCorrupta(f));

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
      setIndiceActual(0);
      setEstaGirada(false);
      setSesionTerminada(false);
      return;
    }

    if (modoMazo === 'temas') {
      // Filtrar por temas seleccionados
      const temasValidos = temasSeleccionados.length > 0 ? temasSeleccionados : [todasFichas[0]?.tema_id || 1];
      const filtradas = todasFichas.filter((f) => temasValidos.includes(f.tema_id));
      setColaEstudio(filtradas);
      setIndiceActual(0);
      setEstaGirada(false);
      setSesionTerminada(filtradas.length === 0);
      return;
    }

    if (modoMazo === 'aleatorio') {
      const barajadas = [...todasFichas].sort(() => Math.random() - 0.5);
      setColaEstudio(barajadas);
      setIndiceActual(0);
      setEstaGirada(false);
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
    setIndiceActual(0);
    setEstaGirada(false);
    setSesionTerminada(colaMezclada.length === 0);
  }, [todasFichas, modoMazo, temasSeleccionados, metaDiaria]);

  const fichaActual = colaEstudio[indiceActual];
  const fichaAbajo = indiceActual + 1 < colaEstudio.length ? colaEstudio[indiceActual + 1] : null;

  // Sincronizar nota y explicación de la ficha actual
  useEffect(() => {
    if (fichaActual) {
      setNotaTexto(fichaActual.usuarioSRS?.nota_mnemotecnica || '');
      setExplicacionActual(fichaActual.explicacion_ia || null);
      setEstaGirada(false);
      setDragX(0);
      setDragY(0);
      setExitDirection(null);
    }
  }, [fichaActual]);

  // Navegación entre fichas
  const avanzarFicha = useCallback(() => {
    if (indiceActual + 1 < colaEstudio.length) {
      setIndiceActual((prev) => prev + 1);
      setEstaGirada(false);
    } else {
      setSesionTerminada(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  }, [indiceActual, colaEstudio.length]);

  const retrocederFicha = useCallback(() => {
    if (indiceActual > 0) {
      setIndiceActual((prev) => prev - 1);
      setEstaGirada(false);
    }
  }, [indiceActual]);

  // MOTOR FÍSICO POINTER EVENTS (DRAG EN TIEMPO REAL TINDER)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Si la tarjeta está girada a la Cara B y el clic fue dentro de la respuesta scrollable, no arrastrar
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) return;
    if (estaGirada && target.closest('.scrollable-cara-b')) return;

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setDragX(deltaX);
    setDragY(deltaY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);
    dragStartRef.current = null;

    const THRESHOLD = 85;

    if (Math.abs(dragX) > Math.abs(dragY)) {
      if (dragX > THRESHOLD) {
        // 👉 DERECHA: Girar tarjeta
        setDragX(0);
        setDragY(0);
        setEstaGirada((prev) => !prev);
      } else if (dragX < -THRESHOLD) {
        // 👈 IZQUIERDA: Descartar / Reportar
        setExitDirection('left');
        setTimeout(() => {
          setModalDescartarAbierto(true);
          setExitDirection(null);
          setDragX(0);
          setDragY(0);
        }, 220);
      } else {
        setDragX(0);
        setDragY(0);
      }
    } else {
      if (dragY < -THRESHOLD) {
        // 👆 ARRIBA: Siguiente ficha
        setExitDirection('up');
        setTimeout(() => {
          avanzarFicha();
          setExitDirection(null);
          setDragX(0);
          setDragY(0);
        }, 220);
      } else if (dragY > THRESHOLD) {
        // 👇 ABAJO: Anterior ficha
        setExitDirection('down');
        setTimeout(() => {
          retrocederFicha();
          setExitDirection(null);
          setDragX(0);
          setDragY(0);
        }, 220);
      } else {
        setDragX(0);
        setDragY(0);
      }
    }
  };

  // Evaluación SM-2 (Difícil, Medio, Fácil)
  const handleEvaluacion = async (calificacion: 'dificil' | 'medio' | 'facil') => {
    if (!fichaActual) return;
    setExitDirection('up');
    const res = await evaluarFichaAnki(fichaActual.id, calificacion, fichaActual.usuarioSRS);
    if (res.ok && res.nuevoSRS) {
      fichaActual.usuarioSRS = res.nuevoSRS;
    }
    setTimeout(() => {
      avanzarFicha();
      setExitDirection(null);
      setDragX(0);
      setDragY(0);
    }, 220);
  };

  // Generación IA bajo demanda
  const handleGenerarFichasIA = async () => {
    const temaIdObjetivo =
      modoMazo === 'temas' && temasSeleccionados.length > 0
        ? temasSeleccionados[0]
        : fichaActual?.tema_id || 1;

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
        setIndiceActual(0);
        setEstaGirada(false);
        setSesionTerminada(false);
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
        setIndiceActual(0);
        setModalResetAdminAbierto(false);
      } else {
        alert('Error reseteando el banco de fichas.');
      }
    } finally {
      setReseteandoAdmin(false);
    }
  };

  // Explicación Profesor IA
  const handleSolicitarExplicacion = async () => {
    if (!fichaActual || explicacionActual) return;
    setCargandoExplicacion(true);
    try {
      const res = await solicitarExplicacionIA(
        fichaActual.id,
        fichaActual.frente_pregunta || fichaActual.concepto,
        fichaActual.dorso_respuesta || fichaActual.valor_exacto,
        fichaActual.tema_id
      );
      if (res.ok && res.explicacion) {
        setExplicacionActual(res.explicacion);
        fichaActual.explicacion_ia = res.explicacion;
      }
    } finally {
      setCargandoExplicacion(false);
    }
  };

  // Guardar nota mnemotécnica
  const handleGuardarNota = async () => {
    if (!fichaActual) return;
    setGuardandoNota(true);
    try {
      await guardarNotaMnemotecnica(fichaActual.id, notaTexto);
      if (fichaActual.usuarioSRS) {
        fichaActual.usuarioSRS.nota_mnemotecnica = notaTexto;
      }
    } finally {
      setGuardandoNota(false);
    }
  };

  // Subida de imagen comprimida
  const procesarArchivoImagen = async (file: File | Blob) => {
    try {
      const blobWebp = await comprimirImagenAWebp(file);
      const previewUrl = URL.createObjectURL(blobWebp);
      setModalImagenSubida({ blob: blobWebp, previewUrl });
    } catch {
      alert('Error al comprimir la imagen a WebP.');
    }
  };

  const handleGuardarImagenPrivada = async () => {
    if (!modalImagenSubida || !fichaActual) return;
    setSubiendoFoto(true);
    try {
      const res = await subirImagenMnemotecnica(fichaActual.id, modalImagenSubida.blob);
      if (res.ok && res.url) {
        if (!fichaActual.usuarioSRS) {
          fichaActual.usuarioSRS = {
            user_id: user?.id || '',
            ficha_id: fichaActual.id,
            intervalo_dias: 1,
            factor_facilidad: 2.5,
            repeticiones: 0,
            proximo_repaso: new Date().toISOString(),
          };
        }
        fichaActual.usuarioSRS.imagen_url = res.url;
        setModalImagenSubida(null);
      }
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleProponerImagenPublica = async () => {
    if (!modalImagenSubida || !fichaActual) return;
    setSubiendoFoto(true);
    try {
      const subida = await subirImagenMnemotecnica(fichaActual.id, modalImagenSubida.blob);
      if (!subida.ok || !subida.url) {
        alert('Error al subir la imagen para proponer');
        return;
      }
      const res = await proponerImagenFicha(
        fichaActual.id,
        subida.url,
        user?.email || 'opositor@opostudyc.es'
      );
      if (res.ok) {
        setModalImagenSubida(null);
        alert('✨ Imagen propuesta al Administrador para compartir con todos.');
      }
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Descartar solo de mi mazo
  const handleDescartarMazoPersonal = async () => {
    if (!fichaActual) return;
    await eliminarFichaUsuario(fichaActual.id);
    setModalDescartarAbierto(false);
    setColaEstudio((prev) => prev.filter((_, idx) => idx !== indiceActual));
    if (indiceActual >= colaEstudio.length - 1) {
      setIndiceActual(Math.max(0, colaEstudio.length - 2));
    }
  };

  // Reportar al Administrador
  const handleReportarAdmin = async () => {
    if (!fichaActual) return;
    setReportando(true);
    try {
      await reportarFichaEliminar(fichaActual.id);
      setModalDescartarAbierto(false);
      setColaEstudio((prev) => prev.filter((_, idx) => idx !== indiceActual));
      if (indiceActual >= colaEstudio.length - 1) {
        setIndiceActual(Math.max(0, colaEstudio.length - 2));
      }
      alert('🚩 Ficha reportada al Administrador para su revisión y borrado.');
    } finally {
      setReportando(false);
    }
  };

  // Calcular estilo de arrastre de la tarjeta activa
  const obtenerTransformActiva = () => {
    if (exitDirection === 'left') {
      return 'translate3d(-120vw, 0px, 0px) rotate(-25deg)';
    }
    if (exitDirection === 'up') {
      return 'translate3d(0px, -120vh, 0px) rotate(0deg)';
    }
    if (exitDirection === 'down') {
      return 'translate3d(0px, 120vh, 0px) rotate(0deg)';
    }
    if (isDragging) {
      return `translate3d(${dragX}px, ${dragY}px, 0px) rotate(${dragX * 0.05}deg)`;
    }
    return 'translate3d(0px, 0px, 0px) rotate(0deg)';
  };

  // Opacidades de los sellos visuales Tinder
  const opacidadSelloDerecha = Math.max(0, Math.min(1, (dragX - 20) / 65));
  const opacidadSelloIzquierda = Math.max(0, Math.min(1, (-dragX - 20) / 65));
  const opacidadSelloArriba = Math.max(0, Math.min(1, (-dragY - 20) / 65));
  const opacidadSelloAbajo = Math.max(0, Math.min(1, (dragY - 20) / 65));

  // Temas filtrados para selector modal
  const temasFiltradosSelector = useMemo(() => {
    return temas.filter(
      (t) =>
        busquedaTema === '' ||
        t.titulo.toLowerCase().includes(busquedaTema.toLowerCase()) ||
        t.id.toString() === busquedaTema.trim()
    );
  }, [temas, busquedaTema]);

  const temaFichaActual = useMemo(() => {
    if (!fichaActual) return null;
    return temas.find((t) => t.id === fichaActual.tema_id);
  }, [fichaActual, temas]);

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-3 select-none">
      {/* 1. CABECERA PRINCIPAL */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 transition-colors cursor-pointer shadow-xs"
            aria-label="Volver al temario"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <span>🃏 Mazo de Fichas Clave</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">
              Cifras, Tablas y Trampas de Tribunal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {esAdmin && (
            <button
              onClick={() => setModalResetAdminAbierto(true)}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border-2 border-slate-900 text-rose-700 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1"
              title="Resetear todo el banco de fichas"
            >
              <span>🧨 Reset Banco</span>
            </button>
          )}
          <UserAuthButton />
        </div>
      </header>

      {/* 2. SELECTOR DE MODO DE MAZO (3 PESTAÑAS) + GENERADOR IA */}
      <section className="bg-white rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] p-3 space-y-2.5">
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-900 text-[11px] font-bold font-mono">
          <button
            onClick={() => setModoMazo('curva')}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              modoMazo === 'curva'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span>Curva SRS</span>
          </button>

          <button
            onClick={() => {
              setModoMazo('temas');
              if (temasSeleccionados.length === 0 && todasFichas.length > 0) {
                setTemasSeleccionados([todasFichas[0]?.tema_id || 1]);
              }
            }}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              modoMazo === 'temas'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Por Temas</span>
          </button>

          <button
            onClick={() => setModoMazo('aleatorio')}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
              modoMazo === 'aleatorio'
                ? 'bg-slate-950 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Dices className="w-3.5 h-3.5 text-sky-400" />
            <span>Aleatorio</span>
          </button>
        </div>

        {/* Barra de configuración contextual según el modo */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          {modoMazo === 'curva' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-500 font-bold">Meta diaria:</span>
              <div className="flex items-center gap-1">
                {[10, 20, 30, 50].map((meta) => (
                  <button
                    key={meta}
                    onClick={() => {
                      setMetaDiaria(meta);
                      guardarMetaFichasDiarias(meta);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                      metaDiaria === meta
                        ? 'bg-slate-950 text-white border-slate-950'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {meta}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modoMazo === 'temas' && (
            <button
              onClick={() => setModalSelectorTemasAbierto(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-slate-900 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>
                {temasSeleccionados.length === 0
                  ? 'Elegir temas'
                  : temasSeleccionados.length === 1
                  ? `Tema ${temasSeleccionados[0]}`
                  : `${temasSeleccionados.length} temas`}
              </span>
            </button>
          )}

          {modoMazo === 'aleatorio' && (
            <span className="text-[11px] font-mono text-slate-500">
              Barajando {todasFichas.length} fichas de todos los temas
            </span>
          )}

          {/* Botón Generador IA bajo demanda */}
          <button
            onClick={handleGenerarFichasIA}
            disabled={generandoIA}
            className="py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            title="Generar nuevas fichas para este ámbito con IA"
          >
            {generandoIA ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>+ 5 Fichas IA</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 3. ZONA DE ESTUDIO TINDER: PILA DE CARTAS (DECK STACK) */}
      <main className="flex-1 flex flex-col justify-center items-center relative min-h-[460px] sm:min-h-[500px]">
        {cargando ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <div className="w-8 h-8 border-3 border-slate-900 border-t-red-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-700 font-mono">Cargando mazo inteligente...</p>
          </div>
        ) : sesionTerminada || colaEstudio.length === 0 ? (
          /* Estado Vacío / Sesión completada */
          <div className="w-full bg-white rounded-2xl border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-slate-900 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8 fill-amber-500" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {colaEstudio.length === 0 ? 'Sin fichas en este mazo' : '¡Objetivo de Fichas Cumplido!'}
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                {colaEstudio.length === 0
                  ? 'No hay fichas generadas aún para esta selección. Pulsa el botón inferior para que el Tribunal IA genere la primera tanda de examen.'
                  : 'Has completado tu cupo del día. Tu memoria a largo plazo está afianzada contra la curva del olvido.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleGenerarFichasIA}
                disabled={generandoIA}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {generandoIA ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generando 5 fichas críticas con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Generar 5 Fichas con Tribunal IA</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setMetaDiaria((m) => m + 10);
                  setSesionTerminada(false);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-xs rounded-xl border-2 border-slate-900 transition-all cursor-pointer"
              >
                <span>➕ Cargar 10 fichas más hoy</span>
              </button>
            </div>
          </div>
        ) : fichaActual ? (
          /* PILA DE CARTAS FÍSICA */
          <div className="relative w-full h-[460px] sm:h-[500px]" style={{ perspective: '1200px' }}>
            {/* TARJETA DE FONDO (ASOMANDO CON SCALE Y TRANSLATE) */}
            {fichaAbajo && (
              <div
                className="absolute inset-0 rounded-2xl bg-white border-3 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] p-5 pointer-events-none transition-all duration-200 flex flex-col justify-between"
                style={{
                  transform: `scale(${0.95 + Math.min(0.04, Math.hypot(dragX, dragY) / 1000)}) translateY(${
                    12 - Math.min(10, Math.hypot(dragX, dragY) / 20)
                  }px)`,
                  opacity: 0.6 + Math.min(0.35, Math.hypot(dragX, dragY) / 250),
                  zIndex: 1,
                }}
              >
                <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5 text-xs text-slate-400 font-mono font-bold">
                  <span>Siguiente Ficha</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Tema {fichaAbajo.tema_id}
                  </span>
                </div>
                <div className="text-center text-xs text-slate-400 font-medium">
                  {fichaAbajo.concepto}
                </div>
                <div className="h-8" />
              </div>
            )}

            {/* TARJETA ACTIVA EN PRIMER PLANO (CON SEGUIMIENTO TINDER Y GIRO 3D) */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 rounded-2xl cursor-grab active:cursor-grabbing select-none"
              style={{
                zIndex: 10,
                transform: obtenerTransformActiva(),
                transition:
                  isDragging || exitDirection !== null
                    ? exitDirection
                      ? 'transform 0.22s ease-out, opacity 0.22s ease-out'
                      : 'none'
                    : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                touchAction: 'none',
              }}
            >
              {/* CONTENEDOR 3D FLIP */}
              <div
                className="relative w-full h-full rounded-2xl transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: estaGirada ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* ============================================================== */}
                {/* CARA A (FRONTAL - RETO GUIADO) */}
                {/* ============================================================== */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] p-5 flex flex-col justify-between overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  {/* SELLOS TINDER SUPERPUESTOS */}
                  {opacidadSelloDerecha > 0 && (
                    <div
                      className="absolute top-6 left-6 z-30 px-3 py-1.5 rounded-xl border-3 border-emerald-600 bg-emerald-100/90 text-emerald-800 font-black text-sm font-mono tracking-wider -rotate-12 pointer-events-none shadow-md"
                      style={{ opacity: opacidadSelloDerecha }}
                    >
                      🔄 VER SOLUCIÓN
                    </div>
                  )}

                  {opacidadSelloIzquierda > 0 && (
                    <div
                      className="absolute top-6 right-6 z-30 px-3 py-1.5 rounded-xl border-3 border-rose-600 bg-rose-100/90 text-rose-800 font-black text-sm font-mono tracking-wider rotate-12 pointer-events-none shadow-md"
                      style={{ opacity: opacidadSelloIzquierda }}
                    >
                      🗑️ DESCARTAR
                    </div>
                  )}

                  {opacidadSelloArriba > 0 && (
                    <div
                      className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-xl border-3 border-indigo-600 bg-indigo-100/90 text-indigo-900 font-black text-sm font-mono tracking-wider pointer-events-none shadow-md"
                      style={{ opacity: opacidadSelloArriba }}
                    >
                      ⬆️ SIGUIENTE
                    </div>
                  )}

                  {opacidadSelloAbajo > 0 && (
                    <div
                      className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-xl border-3 border-amber-600 bg-amber-100/90 text-amber-900 font-black text-sm font-mono tracking-wider pointer-events-none shadow-md"
                      style={{ opacity: opacidadSelloAbajo }}
                    >
                      ⬇️ ANTERIOR
                    </div>
                  )}

                  {/* Cabecera de la Cara A */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                    <div className="space-y-0.5 max-w-[75%]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                          {fichaActual.tema_id}
                        </span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {temaFichaActual?.titulo || `Tema ${fichaActual.tema_id}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold block truncate">
                        {fichaActual.tipo_ficha === 'tabla' ? '📊 Tabla Normativa' : (fichaActual.categoria_dato || '🎯 Concepto Clave')}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-amber-50 text-slate-900 border border-slate-900">
                        {indiceActual + 1} / {colaEstudio.length}
                      </span>
                      {fichaActual.tipo_ficha === 'tabla' ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                          📊 Tabla
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-300">
                          🎯 Concepto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo de la Cara A: RETO GUIADO */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-3 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border-2 border-slate-900 text-amber-800 flex items-center justify-center">
                      <Zap className="w-5 h-5 fill-amber-500 text-amber-700" />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                        Reto Guiado del Tribunal
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight">
                        {fichaActual.frente_pregunta || fichaActual.concepto}
                      </h2>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium max-w-xs">
                      Recita mentalmente los datos exactos antes de comprobar la respuesta.
                    </p>
                  </div>

                  {/* Pie de la Cara A */}
                  <div className="border-t-2 border-slate-900 pt-3 flex items-center justify-between text-[11px] font-mono text-slate-600 font-bold">
                    <span className="flex items-center gap-1 text-slate-400">
                      👈 Descartar
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEstaGirada(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ver Solución</span>
                    </button>
                    <span className="flex items-center gap-1 text-slate-400">
                      Girar 👉
                    </span>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* CARA B (REVERSO - SOLUCIÓN, TABLAS, EXPLICACIÓN IA) */}
                {/* ============================================================== */}
                <div
                  className="absolute inset-0 w-full h-full rounded-2xl bg-white border-3 border-slate-900 shadow-[5px_5px_0px_0px_#0f172a] p-4 flex flex-col justify-between overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {/* Cabecera del Reverso con Pregunta Pinned Visible */}
                  <div className="border-b-2 border-slate-900 pb-2 space-y-1.5 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                        🎯 Pregunta / Reto
                      </span>
                      <button
                        type="button"
                        onClick={() => setEstaGirada(false)}
                        className="text-[10px] font-mono font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Voltear a pregunta</span>
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                      {fichaActual.frente_pregunta || fichaActual.concepto}
                    </p>
                  </div>

                  {/* Cuerpo del Reverso con Scroll Vertical cómodo (no arrastra el swipe) */}
                  <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3 scrollable-cara-b text-left">
                    {/* Solución maquetada */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <FormatoDorsoAnki
                        texto={
                          fichaActual.dorso_respuesta ||
                          `${fichaActual.valor_exacto}${
                            fichaActual.trampa_habitual ? `\n\n⚠️ Trampa de examen: ${fichaActual.trampa_habitual}` : ''
                          }`
                        }
                      />
                    </div>

                    {/* Imagen oficial global (si existe) */}
                    {fichaActual.imagen_oficial_url && (
                      <div className="rounded-xl border-2 border-slate-900 overflow-hidden relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fichaActual.imagen_oficial_url}
                          alt="Esquema oficial"
                          className="w-full max-h-40 object-cover cursor-pointer"
                          onClick={() => setLightboxUrl(fichaActual.imagen_oficial_url || null)}
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(fichaActual.imagen_oficial_url || null)}
                          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white font-mono text-[10px] flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Ampliar</span>
                        </button>
                      </div>
                    )}

                    {/* Explicación del Profesor con Ejemplo (IA) */}
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={handleSolicitarExplicacion}
                        disabled={cargandoExplicacion}
                        className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-slate-900 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
                      >
                        <span className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-amber-700" />
                          <span>Explicación del Profesor con Ejemplo (IA)</span>
                        </span>
                        {cargandoExplicacion && (
                          <div className="w-3.5 h-3.5 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />
                        )}
                      </button>

                      {explicacionActual && (
                        <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-300 text-xs text-amber-950 font-medium leading-relaxed whitespace-pre-line">
                          {explicacionActual}
                        </div>
                      )}
                    </div>

                    {/* Imagen privada del usuario y subida */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Mi Imagen Privada / Chuleta</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-[10px] font-mono cursor-pointer flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Subir</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) procesarArchivoImagen(file);
                          }}
                        />
                      </div>

                      {fichaActual.usuarioSRS?.imagen_url && (
                        <div className="relative rounded-lg border border-slate-300 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fichaActual.usuarioSRS.imagen_url}
                            alt="Imagen privada"
                            className="w-full max-h-32 object-contain bg-white cursor-pointer"
                            onClick={() => setLightboxUrl(fichaActual.usuarioSRS?.imagen_url || null)}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const imgUrl = fichaActual.usuarioSRS?.imagen_url || '';
                              await eliminarImagenMnemotecnica(fichaActual.id, imgUrl, 0);
                              if (fichaActual.usuarioSRS) fichaActual.usuarioSRS.imagen_url = undefined;
                              setTodasFichas([...todasFichas]);
                            }}
                            className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white cursor-pointer"
                            title="Eliminar imagen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones de Calificación SM-2 Anki (Difícil, Medio, Fácil) */}
                  <div className="border-t-2 border-slate-900 pt-2.5 flex-shrink-0 space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 font-bold block text-center">
                      ¿Cómo recuerdas este dato técnico?
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleEvaluacion('dificil')}
                        className="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border-2 border-slate-900 font-mono text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex flex-col items-center"
                      >
                        <span>🔴 Difícil</span>
                        <span className="text-[9px] text-rose-700 font-medium">Repaso 1d</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEvaluacion('medio')}
                        className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-slate-900 font-mono text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex flex-col items-center"
                      >
                        <span>🟡 Medio</span>
                        <span className="text-[9px] text-amber-700 font-medium">Repaso 3d</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEvaluacion('facil')}
                        className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-2 border-slate-900 font-mono text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex flex-col items-center"
                      >
                        <span>🟢 Fácil</span>
                        <span className="text-[9px] text-emerald-700 font-medium">Repaso 7d</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* 4. BOTONERA DE APOYO RÁPIDO INFERIOR (1 TAP) */}
      <footer className="grid grid-cols-4 gap-2 pt-1 max-w-md mx-auto w-full">
        <button
          type="button"
          onClick={retrocederFicha}
          disabled={indiceActual === 0}
          className="py-2.5 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 active:translate-x-[1px] active:translate-y-[1px]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Ant.</span>
        </button>

        <button
          type="button"
          onClick={() => setModalDescartarAbierto(true)}
          disabled={!fichaActual}
          className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 active:translate-x-[1px] active:translate-y-[1px]"
          title="Descartar o reportar ficha defectuosa"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Descartar</span>
        </button>

        <button
          type="button"
          onClick={() => setEstaGirada((prev) => !prev)}
          disabled={!fichaActual}
          className="py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 active:translate-x-[1px] active:translate-y-[1px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Girar</span>
        </button>

        <button
          type="button"
          onClick={avanzarFicha}
          disabled={!fichaActual}
          className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white border-2 border-slate-950 shadow-[2px_2px_0px_0px_#dc2626] font-mono text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 active:translate-x-[1px] active:translate-y-[1px]"
        >
          <span>Sig.</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>

      {/* MODAL 1: SELECTOR DE TEMAS */}
      {modalSelectorTemasAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-slate-900" />
                <h3 className="text-sm font-black text-slate-900 uppercase">Elegir Temas para el Mazo</h3>
              </div>
              <button
                onClick={() => setModalSelectorTemasAbierto(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={busquedaTema}
                onChange={(e) => setBusquedaTema(e.target.value)}
                placeholder="Buscar tema oficial..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-900 font-medium"
              />
            </div>

            {/* Botones Marcar / Limpiar */}
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setTemasSeleccionados(temas.map((t) => t.id))}
                className="text-slate-600 hover:text-slate-950 underline cursor-pointer"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() => setTemasSeleccionados([])}
                className="text-slate-600 hover:text-slate-950 underline cursor-pointer"
              >
                Limpiar selección
              </button>
            </div>

            {/* Lista de temas con conteo de fichas */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {temasFiltradosSelector.map((t) => {
                const count = todasFichas.filter((f) => f.tema_id === t.id).length;
                const marcado = temasSeleccionados.includes(t.id);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTemasSeleccionados((prev) =>
                        prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                      );
                    }}
                    className={`w-full p-2 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      marcado
                        ? 'bg-amber-50 border-slate-900 font-bold'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {t.id}
                      </span>
                      <span className="truncate">{t.titulo}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {count} fichas
                      </span>
                      {marcado && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setModalSelectorTemasAbierto(false)}
              className="w-full py-2.5 bg-slate-950 text-white rounded-xl font-bold font-mono text-xs cursor-pointer"
            >
              Aplicar ({temasSeleccionados.length} seleccionados)
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: DESCARTAR O REPORTAR FICHA DEFECTUOSA */}
      {modalDescartarAbierto && fichaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-5 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border-2 border-slate-900 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900">¿Qué deseas hacer con esta ficha?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-snug truncate font-medium">
                  {fichaActual.frente_pregunta || fichaActual.concepto}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDescartarMazoPersonal}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-800 text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <span>🙈 Eliminar solo de mi mazo personal</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                disabled={reportando}
                onClick={handleReportarAdmin}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 text-rose-900 text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-50"
              >
                <span>🚩 Reportar ficha defectuosa al Admin</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setModalDescartarAbierto(false)}
              className="w-full py-2 rounded-xl bg-white border border-slate-300 text-slate-600 text-xs font-bold font-mono hover:bg-slate-50 cursor-pointer"
            >
              ↩️ Cancelar y devolver al mazo
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: PROPONER O GUARDAR IMAGEN (PRIVADA VS PÚBLICA) */}
      {modalImagenSubida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-5 space-y-3">
            <h3 className="text-sm font-black text-slate-900">¿Cómo quieres guardar esta imagen?</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalImagenSubida.previewUrl}
              alt="Vista previa comprimida"
              className="w-full max-h-48 object-contain rounded-xl border border-slate-300 bg-slate-50"
            />
            <p className="text-[11px] text-slate-600 font-medium">
              Optimizada en formato WebP (~35 KB) para carga instantánea.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={subiendoFoto}
                onClick={handleGuardarImagenPrivada}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>🔒 Guardar solo en mi ficha privada</span>
              </button>

              <button
                type="button"
                disabled={subiendoFoto}
                onClick={handleProponerImagenPublica}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>🌍 Proponer imagen para todos los usuarios</span>
              </button>

              <button
                type="button"
                onClick={() => setModalImagenSubida(null)}
                className="w-full py-1.5 text-xs text-slate-500 font-bold font-mono hover:underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RESET BANCO DE FICHAS ADMIN */}
      {modalResetAdminAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-rose-700">🧨 ¿Resetear TODO el banco de Fichas?</h3>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Esta acción borrará todas las fichas globales de <strong>fichas_tecnicas</strong> y el progreso de los opositores en Supabase.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={reseteandoAdmin}
                onClick={() => setModalResetAdminAbierto(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-800 text-xs font-bold font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reseteandoAdmin}
                onClick={handleConfirmarResetAdmin}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {reseteandoAdmin ? 'Borrando...' : 'Sí, vaciar banco'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LIGHTBOX PINCH-TO-ZOOM */}
      {lightboxUrl && (
        <LightboxModal imagenUrl={lightboxUrl} onCerrar={() => setLightboxUrl(null)} />
      )}

      {/* Barra de navegación fija inferior */}
      <BottomNav />
    </div>
  );
}
