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
  ChevronUp,
  ChevronDown,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Layers,
  HelpCircle,
  FileText,
  Filter,
} from 'lucide-react';
import { Tema, FichaTecnica, UsuarioFichaSRS } from '@/lib/types';
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
} from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import { useAuth } from '@/context/AuthContext';

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

  // Si contiene tabla en formato Markdown con pipes (|)
  const lineas = texto.split('\n');
  const esTablaMarkdown = lineas.some((l) => l.includes('|') && l.trim().startsWith('|'));

  if (esTablaMarkdown) {
    const lineasTabla = lineas.filter((l) => l.trim().startsWith('|'));
    const lineasFuera = lineas.filter((l) => !l.trim().startsWith('|') && l.trim().length > 0);

    // Separar encabezado, separador y filas
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
                <p key={i} className={l.includes('⚠️') ? 'text-amber-900 font-bold bg-amber-50 p-2 rounded-lg border border-amber-300' : ''}>
                  {l}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  // Texto normal con formato
  return (
    <div className="text-sm font-semibold text-slate-950 whitespace-pre-line leading-relaxed">
      {texto}
    </div>
  );
}

/**
 * Modal Lightbox con Pinch-to-Zoom y Pan para inspeccionar esquemas e imágenes técnicas
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
    e.preventDefault();
    setScale((prev) => Math.min(4, Math.max(1, prev + (e.deltaY < 0 ? 0.2 : -0.2))));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-md animate-in fade-in select-none"
      onClick={onCerrar}
    >
      {/* Controles de Zoom superiores */}
      <div
        className="flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 bg-slate-900/90 text-white px-3 py-1.5 rounded-xl border border-white/20">
          <button
            onClick={() => setScale((s) => Math.max(1, s - 0.3))}
            className="p-1 hover:text-amber-400 cursor-pointer"
            title="Alejar (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="font-mono text-xs font-bold w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(4, s + 0.3))}
            className="p-1 hover:text-amber-400 cursor-pointer"
            title="Acercar (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setScale(1);
              setPos({ x: 0, y: 0 });
            }}
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 ml-1 cursor-pointer font-mono"
          >
            Reset
          </button>
        </div>

        <button
          onClick={onCerrar}
          className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
          aria-label="Cerrar visor"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenedor con soporte táctil de zoom y arrastre */}
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
          className="max-h-[82vh] max-w-full object-contain rounded-xl transition-transform duration-75 cursor-grab active:cursor-grabbing"
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

  // Meta diaria y cola de estudio
  const [metaDiaria, setMetaDiaria] = useState<number>(20);
  const [colaEstudio, setColaEstudio] = useState<FichaTecnica[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [estaGirada, setEstaGirada] = useState(false);
  const [sesionTerminada, setSesionTerminada] = useState(false);

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

  // Nota mnemotécnica
  const [notaTexto, setNotaTexto] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Coordenadas táctiles para gestos (Swipes)
  const touchStartCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // 1. Cargar meta diaria, temas y fichas
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [meta, listaTemas, listaFichas] = await Promise.all([
        getMetaFichasDiarias(),
        getTemas(),
        getFichasTecnicas(),
      ]);

      setMetaDiaria(meta);
      setTemas(listaTemas);
      setTodasFichas(listaFichas);

      construirColaDiaria(listaFichas, meta);
    } catch (e) {
      console.error('Error cargando fichas:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // 2. Algoritmo inteligente de mezcla Anki (70% Repaso / 30% Nuevas)
  const construirColaDiaria = (fichas: FichaTecnica[], meta: number, agregarMas: number = 0) => {
    const ahora = Date.now();

    // Fichas ya vistas
    const vistas = fichas.filter(
      (f) => f.usuarioSRS && (f.usuarioSRS.repeticiones > 0 || f.usuarioSRS.ultima_revision)
    );

    // Fichas pendientes de repaso (proximo_repaso <= now)
    const pendientesRepaso = vistas
      .filter((f) => f.usuarioSRS && new Date(f.usuarioSRS.proximo_repaso).getTime() <= ahora)
      .sort((a, b) => {
        const facA = a.usuarioSRS?.factor_facilidad ?? 2.5;
        const facB = b.usuarioSRS?.factor_facilidad ?? 2.5;
        return facA - facB; // Priorizar las más difíciles
      });

    // Fichas nuevas (nunca vistas)
    const nuevas = fichas
      .filter((f) => !f.usuarioSRS || (f.usuarioSRS.repeticiones === 0 && !f.usuarioSRS.ultima_revision))
      .sort(() => Math.random() - 0.5);

    const totalCupo = meta + agregarMas;
    const cupoRepaso = Math.round(totalCupo * 0.7);
    const cupoNuevas = totalCupo - cupoRepaso;

    let seleccionRepaso = pendientesRepaso.slice(0, cupoRepaso);
    let seleccionNuevas = nuevas.slice(0, cupoNuevas);

    // Rellenar si faltan de un tipo con el otro
    if (seleccionRepaso.length < cupoRepaso) {
      const faltantes = cupoRepaso - seleccionRepaso.length;
      const extrasNuevas = nuevas.slice(cupoNuevas, cupoNuevas + faltantes);
      seleccionNuevas = [...seleccionNuevas, ...extrasNuevas];
    } else if (seleccionNuevas.length < cupoNuevas) {
      const faltantes = cupoNuevas - seleccionNuevas.length;
      const extrasRepaso = pendientesRepaso.slice(cupoRepaso, cupoRepaso + faltantes);
      seleccionRepaso = [...seleccionRepaso, ...extrasRepaso];
    }

    // Si aún quedan huecos, añadir del resto de fichas vistas
    let colaFinal = [...seleccionRepaso, ...seleccionNuevas];
    if (colaFinal.length < totalCupo) {
      const idsYa = new Set(colaFinal.map((f) => f.id));
      const restantes = fichas.filter((f) => !idsYa.has(f.id)).slice(0, totalCupo - colaFinal.length);
      colaFinal = [...colaFinal, ...restantes];
    }

    // Barajar ligeramente para alternar repaso y nuevas
    const colaMezclada = [...colaFinal].sort(() => Math.random() - 0.5);

    setColaEstudio(colaMezclada);
    setIndiceActual(0);
    setEstaGirada(false);
    setSesionTerminada(colaMezclada.length === 0);
  };

  // Cambiar meta diaria
  const handleCambiarMeta = async (nuevaMeta: number) => {
    setMetaDiaria(nuevaMeta);
    await guardarMetaFichasDiarias(nuevaMeta);
    construirColaDiaria(todasFichas, nuevaMeta);
  };

  const fichaActual = colaEstudio[indiceActual];

  // Sincronizar nota y explicación de la ficha actual
  useEffect(() => {
    if (fichaActual) {
      setNotaTexto(fichaActual.usuarioSRS?.nota_mnemotecnica || '');
      setExplicacionActual(fichaActual.explicacion_ia || null);
      setEstaGirada(false);
    }
  }, [fichaActual]);

  // Navegación entre fichas
  const avanzarFicha = () => {
    if (indiceActual + 1 < colaEstudio.length) {
      setIndiceActual((prev) => prev + 1);
      setEstaGirada(false);
    } else {
      setSesionTerminada(true);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const retrocederFicha = () => {
    if (indiceActual > 0) {
      setIndiceActual((prev) => prev - 1);
      setEstaGirada(false);
    }
  };

  // GESTOS TÁCTILES (SWIPES):
  // 👉 Swipe derecha: Girar
  // 👆 Swipe arriba: Siguiente
  // 👇 Swipe abajo: Anterior
  // 👈 Swipe izquierda: Descartar / Reportar
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartCoordsRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartCoordsRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartCoordsRef.current.x;
    const deltaY = touchEndY - touchStartCoordsRef.current.y;
    touchStartCoordsRef.current = null;

    const DIST_THRESHOLD = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > DIST_THRESHOLD) {
        // 👉 Deslizar a la derecha: Girar tarjeta
        setEstaGirada((prev) => !prev);
      } else if (deltaX < -DIST_THRESHOLD) {
        // 👈 Deslizar a la izquierda: Modal Descartar / Reportar
        setModalDescartarAbierto(true);
      }
    } else {
      if (deltaY < -DIST_THRESHOLD) {
        // 👆 Deslizar hacia arriba: Siguiente ficha
        avanzarFicha();
      } else if (deltaY > DIST_THRESHOLD) {
        // 👇 Deslizar hacia abajo: Anterior ficha
        retrocederFicha();
      }
    }
  };

  // Evaluación SM-2 (Difícil, Medio, Fácil)
  const handleEvaluacion = async (calificacion: 'dificil' | 'medio' | 'facil') => {
    if (!fichaActual) return;
    const res = await evaluarFichaAnki(fichaActual.id, calificacion, fichaActual.usuarioSRS);
    if (res.ok && res.nuevoSRS) {
      fichaActual.usuarioSRS = res.nuevoSRS;
    }
    avanzarFicha();
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

  // Explicación Profesor IA
  const handleSolicitarExplicacion = async () => {
    if (!fichaActual) return;
    if (explicacionActual) return;

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
      } else {
        alert(res.error || 'No se pudo obtener la explicación del profesor.');
      }
    } finally {
      setCargandoExplicacion(false);
    }
  };

  // Subida de imagen comprimida
  const procesarArchivoImagen = async (file: File | Blob) => {
    try {
      const blobWebp = await comprimirImagenAWebp(file);
      const previewUrl = URL.createObjectURL(blobWebp);
      setModalImagenSubida({ blob: blobWebp, previewUrl });
    } catch (e) {
      console.error(e);
      alert('Error al comprimir la imagen.');
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
      } else {
        alert(res.error || 'Error al guardar imagen privada');
      }
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleProponerImagenPublica = async () => {
    if (!modalImagenSubida || !fichaActual || !user?.email) return;
    setSubiendoFoto(true);
    try {
      const resSubida = await subirImagenMnemotecnica(fichaActual.id, modalImagenSubida.blob);
      if (resSubida.ok && resSubida.url) {
        const resPropuesta = await proponerImagenFicha(fichaActual.id, resSubida.url, user.email);
        if (resPropuesta.ok) {
          fichaActual.imagen_propuesta_url = resSubida.url;
          fichaActual.estado_propuesta = 'pendiente';
          setModalImagenSubida(null);
          alert('¡Imagen enviada al Administrador para revisión y aprobación pública!');
        } else {
          alert(resPropuesta.error || 'Error al registrar propuesta');
        }
      }
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Manejo de pegado con Ctrl+V
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          procesarArchivoImagen(file);
          break;
        }
      }
    }
  };

  // Descartar solo de mazo personal
  const handleEliminarMazoPersonal = async () => {
    if (!fichaActual) return;
    setReportando(true);
    try {
      await eliminarFichaUsuario(fichaActual.id, false);
      setColaEstudio((prev) => prev.filter((f) => f.id !== fichaActual.id));
      setModalDescartarAbierto(false);
    } finally {
      setReportando(false);
    }
  };

  // Reportar ficha defectuosa al Admin
  const handleReportarAdmin = async () => {
    if (!fichaActual) return;
    setReportando(true);
    try {
      const res = await reportarFichaEliminar(fichaActual.id);
      if (res.ok) {
        alert('Ficha reportada al Administrador para revisión de borrado.');
        // También ocultar del mazo local
        await eliminarFichaUsuario(fichaActual.id, false);
        setColaEstudio((prev) => prev.filter((f) => f.id !== fichaActual.id));
        setModalDescartarAbierto(false);
      } else {
        alert(res.error || 'Error al reportar');
      }
    } finally {
      setReportando(false);
    }
  };

  // Si el Admin decide borrar definitivamente de la BD
  const handleBorrarDefinitivoAdmin = async () => {
    if (!fichaActual || !esAdmin) return;
    if (!confirm('¿Eliminar DEFINITIVAMENTE esta ficha de la base de datos para todos?')) return;
    setReportando(true);
    try {
      await eliminarFichaUsuario(fichaActual.id, true);
      setColaEstudio((prev) => prev.filter((f) => f.id !== fichaActual.id));
      setModalDescartarAbierto(false);
    } finally {
      setReportando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh]">
        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-slate-600 mt-3">
          Cargando cola inteligente Anki SM-2...
        </span>
      </div>
    );
  }

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn select-none focus:outline-hidden"
    >
      {/* 1. CABECERA: META DIARIA CONFIGURABLE Y PROGRESO */}
      <header className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 transition-colors cursor-pointer shadow-xs"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Selector de Meta Diaria */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-300">
            <span className="text-[10px] font-mono font-bold text-slate-600 px-1.5">
              Meta/día:
            </span>
            {[10, 20, 30, 50].map((num) => (
              <button
                key={num}
                onClick={() => handleCambiarMeta(num)}
                className={`px-2 py-0.5 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  metaDiaria === num
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>

          <UserAuthButton />
        </div>

        {/* Indicador de progreso de la cola */}
        {!sesionTerminada && colaEstudio.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                Ficha {indiceActual + 1} de {colaEstudio.length}
              </span>
              <span className="text-[10px] text-slate-500">
                {Math.round(((indiceActual + 1) / colaEstudio.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-900/40">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${((indiceActual + 1) / colaEstudio.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* 2. PANTALLA DE FELICITACIÓN AL TERMINAR EL CUPO DIARIO */}
      {sesionTerminada || !fichaActual ? (
        <main className="my-auto py-8 text-center space-y-4 max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center text-amber-700 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-950">
              ¡Meta diaria completada!
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Has revisado tu cupo de {metaDiaria} fichas. Tu memoria a largo plazo está consolidada para hoy.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => construirColaDiaria(todasFichas, metaDiaria, 10)}
              className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-white font-extrabold text-sm rounded-xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#f59e0b] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>➕ Cargar 10 fichas más hoy</span>
            </button>

            <Link
              href="/"
              className="w-full py-3 bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-bold text-xs rounded-xl block transition-all"
            >
              Volver al Temario
            </Link>
          </div>
        </main>
      ) : (
        /* 3. VISOR DE 1 EN 1 CON GESTOS TÁCTILES Y DOBLE CARA */
        <main
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex-1 flex flex-col justify-between my-auto space-y-3"
        >
          {/* TARJETA CENTRADA */}
          <article
            onClick={() => setEstaGirada(!estaGirada)}
            className={`p-5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] transition-all cursor-pointer min-h-[360px] flex flex-col justify-between ${
              estaGirada ? 'bg-amber-50/60' : 'bg-white hover:border-slate-950'
            }`}
          >
            {/* CARA A: PREGUNTA / RETO */}
            {!estaGirada ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Etiqueta de tema y categoría */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-xs">
                      Tema {fichaActual.tema_id}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                      {fichaActual.tipo_ficha === 'tabla' ? '📊 Tabla Oficial' : fichaActual.categoria_dato || 'Concepto'}
                    </span>
                  </div>

                  {/* Enunciado de la Pregunta frontal */}
                  <div className="py-4 space-y-2 text-center sm:text-left">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 block">
                      Pregunta de Examen:
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-snug">
                      {fichaActual.frente_pregunta || fichaActual.concepto}
                    </h3>
                  </div>
                </div>

                {/* Pie de la tarjeta frontal con sugerencia de gesto */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px] font-mono">
                  <span>👉 Toca o desliza derecha para girar</span>
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            ) : (
              /* CARA B: REVERSO CON PREGUNTA SIEMPRE VISIBLE ARRIBA + SOLUCIÓN + EXPLICACIÓN IA */
              <div
                className="flex-1 flex flex-col justify-between space-y-4 animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  {/* PREGUNTA SIEMPRE VISIBLE ARRIBA */}
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                      Pregunta:
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {fichaActual.frente_pregunta || fichaActual.concepto}
                    </p>
                  </div>

                  {/* SOLUCIÓN TÉCNICA OFICIAL (TABLA O DATO CONTEXTUALIZADO) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Solución Técnica Oficial:
                    </span>
                    <div className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-2xs">
                      <FormatoDorsoAnki texto={fichaActual.dorso_respuesta || fichaActual.valor_exacto} />
                    </div>
                  </div>

                  {/* IMAGEN DE LA FICHA (OFICIAL O PRIVADA) CON PINCH-TO-ZOOM */}
                  {(fichaActual.imagen_oficial_url || fichaActual.usuarioSRS?.imagen_url) && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                          Esquema Técnico (Toca para Zoom):
                        </span>
                        {fichaActual.imagen_oficial_url && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                            Oficial Global
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() =>
                          setLightboxUrl(
                            fichaActual.imagen_oficial_url || fichaActual.usuarioSRS?.imagen_url || null
                          )
                        }
                        className="rounded-xl border-2 border-slate-900 overflow-hidden bg-black/5 cursor-zoom-in relative group max-h-48 flex items-center justify-center p-1"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={fichaActual.imagen_oficial_url || fichaActual.usuarioSRS?.imagen_url || ''}
                          alt="Esquema técnico"
                          className="max-h-44 object-contain rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn className="w-4 h-4" />
                          <span>Pellizcar / Ampliar</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ZONA DE NOTA PERSONALIZADA PRIVADA */}
                  <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                      <span>💡 Tu Regla Mnemotécnica Privada:</span>
                      <button
                        onClick={handleGuardarNota}
                        disabled={guardandoNota}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-white font-mono cursor-pointer"
                      >
                        {guardandoNota ? '...' : 'Guardar'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={notaTexto}
                      onChange={(e) => setNotaTexto(e.target.value)}
                      onBlur={handleGuardarNota}
                      placeholder="Escribe tu truco mnemotécnico o mnemotecnia..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-medium focus:outline-hidden focus:border-slate-900"
                    />
                  </div>

                  {/* BOTÓN DESPLEGABLE: [🧠 Explicación del Profesor (IA)] */}
                  <div className="space-y-1.5">
                    {explicacionActual ? (
                      <div className="p-3 rounded-xl bg-sky-50 border-2 border-sky-300 text-xs text-sky-950 space-y-1">
                        <div className="font-extrabold flex items-center gap-1.5 text-sky-900">
                          <Sparkles className="w-4 h-4 text-sky-600" />
                          <span>Explicación del Profesor Veterano:</span>
                        </div>
                        <p className="text-[12px] leading-relaxed whitespace-pre-line font-medium text-slate-800">
                          {explicacionActual}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSolicitarExplicacion}
                        disabled={cargandoExplicacion}
                        className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] text-slate-900 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {cargandoExplicacion ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            <span>Consultando al profesor veterano con IA...</span>
                          </>
                        ) : (
                          <>
                            <span>🧠 Explicación del Profesor (IA)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 BOTONES DE CURVA DEL OLVIDO (ANKI SM-2) */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>¿Cómo la recuerdas? (Anki SM-2):</span>
                    {fichaActual.usuarioSRS?.intervalo_dias && (
                      <span className="font-mono text-[10px] text-slate-500">
                        Intervalo: {fichaActual.usuarioSRS.intervalo_dias}d
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleEvaluacion('dificil')}
                      className="py-2.5 px-1 rounded-xl bg-white hover:bg-rose-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#b91c1c] active:translate-x-[1px] active:translate-y-[1px] text-rose-950 font-extrabold text-xs flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                      <span>🔴 Difícil</span>
                      <span className="text-[9px] font-mono text-rose-700">&lt; 1 día</span>
                    </button>

                    <button
                      onClick={() => handleEvaluacion('medio')}
                      className="py-2.5 px-1 rounded-xl bg-white hover:bg-amber-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#d97706] active:translate-x-[1px] active:translate-y-[1px] text-amber-950 font-extrabold text-xs flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                      <span>🟡 Medio</span>
                      <span className="text-[9px] font-mono text-amber-700">3 - 4 días</span>
                    </button>

                    <button
                      onClick={() => handleEvaluacion('facil')}
                      className="py-2.5 px-1 rounded-xl bg-white hover:bg-emerald-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#047857] active:translate-x-[1px] active:translate-y-[1px] text-emerald-950 font-extrabold text-xs flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                      <span>🟢 Fácil</span>
                      <span className="text-[9px] font-mono text-emerald-700">7+ días</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>

          {/* 4. BARRA DE APOYO Y BOTONES DE ACCIÓN RÁPIDA (SUBIR FOTO, GESTOS, DESCARTAR) */}
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              onClick={retrocederFicha}
              disabled={indiceActual === 0}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Ficha anterior (o desliza hacia abajo 👇)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Botón para subir o pegar imagen mnemotécnica */}
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              title="Añadir imagen mnemotécnica (o pega con Ctrl+V)"
            >
              <Upload className="w-4 h-4 text-amber-600" />
              <span>Añadir foto</span>
            </button>

            {/* Botón Descartar / Reportar (Swipe izquierda 👈) */}
            <button
              onClick={() => setModalDescartarAbierto(true)}
              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#b91c1c] text-rose-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
              title="Descartar o reportar ficha defectuosa"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Descartar</span>
            </button>

            <button
              onClick={avanzarFicha}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]"
              title="Siguiente ficha (o desliza hacia arriba 👆)"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      )}

      {/* MODAL 1: LIGHTBOX CON PINCH-TO-ZOOM */}
      {lightboxUrl && (
        <LightboxModal imagenUrl={lightboxUrl} onCerrar={() => setLightboxUrl(null)} />
      )}

      {/* MODAL 2: ELEGIR DESTINO DE LA IMAGEN ("Solo para mí" o "Proponer a todos") */}
      {modalImagenSubida && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl border-2 border-slate-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                Guardar Imagen Mnemotécnica
              </h3>
              <button
                onClick={() => setModalImagenSubida(null)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vista previa comprimida */}
            <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-50 p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={modalImagenSubida.previewUrl}
                alt="Vista previa"
                className="max-h-40 object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center font-mono">
              Comprimida en navegador a WebP ({Math.round(modalImagenSubida.blob.size / 1024)} KB)
            </p>

            <div className="space-y-2 pt-1">
              {/* Opción 1: Privada */}
              <button
                onClick={handleGuardarImagenPrivada}
                disabled={subiendoFoto}
                className="w-full py-3 px-3 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 text-left">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="block font-extrabold text-slate-950">
                      🔒 Guardar solo en mi ficha privada
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      Visible únicamente en tu cuenta
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Opción 2: Compartir con todos */}
              <button
                onClick={handleProponerImagenPublica}
                disabled={subiendoFoto}
                className="w-full py-3 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#d97706] text-amber-950 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 text-left">
                  <Globe className="w-4 h-4 text-amber-700" />
                  <div>
                    <span className="block font-extrabold text-amber-950">
                      🌍 Proponer imagen para todos
                    </span>
                    <span className="block text-[10px] text-amber-800">
                      El Administrador la revisará para la comunidad
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DESCARTAR O REPORTAR FICHA DEFECTUOSA */}
      {modalDescartarAbierto && fichaActual && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl border-2 border-slate-900 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Descartar o Reportar Ficha</span>
              </div>
              <button
                onClick={() => setModalDescartarAbierto(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              ¿Qué deseas hacer con la ficha <strong className="text-slate-950">{fichaActual.frente_pregunta || fichaActual.concepto}</strong>?
            </p>

            <div className="space-y-2 pt-1">
              {/* Opción 1: Solo mazo personal */}
              <button
                onClick={handleEliminarMazoPersonal}
                disabled={reportando}
                className="w-full py-3 px-3 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 text-left">
                  <EyeOff className="w-4 h-4 text-slate-700" />
                  <div>
                    <span className="block font-extrabold text-slate-950">
                      🙈 Eliminar solo de mi mazo personal
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      No volverá a salirte en tus repasos
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Opción 2: Reportar al Admin */}
              <button
                onClick={handleReportarAdmin}
                disabled={reportando}
                className="w-full py-3 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#b91c1c] text-rose-950 font-bold text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="block font-extrabold text-rose-950">
                      🚩 Reportar ficha defectuosa al Admin
                    </span>
                    <span className="block text-[10px] text-rose-800">
                      Pedir que se borre para todos tras revisión
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-600" />
              </button>

              {/* Opción 3 (SOLO ADMIN): Borrar definitivamente de la BD */}
              {esAdmin && (
                <button
                  onClick={handleBorrarDefinitivoAdmin}
                  disabled={reportando}
                  className="w-full py-2.5 px-3 rounded-xl bg-red-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>👑 Borrar globalmente de la BD (Admin)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior */}
      <BottomNav />
    </div>
  );
}
