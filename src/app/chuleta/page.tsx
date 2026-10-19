'use client';

import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Zap,
  ArrowLeft,
  Search,
  CheckCircle2,
  Sparkles,
  Trash2,
  ChevronDown,
  X,
  Filter,
  RotateCcw,
  BookOpen,
  Image as ImageIcon,
  Upload,
  Calendar,
  Flame,
  Clock,
  HelpCircle,
  FileText,
  AlertTriangle,
  Smile,
  ShieldAlert,
} from 'lucide-react';
import { Tema, FichaTecnica, UsuarioFichaSRS } from '@/lib/types';
import {
  getTemas,
  getFichasTecnicas,
  solicitarGeneracionFichas,
  evaluarFichaAnki,
  guardarNotaMnemotecnica,
  subirImagenMnemotecnica,
  eliminarImagenMnemotecnica,
  eliminarFichaUsuario,
} from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import { useAuth } from '@/context/AuthContext';

/**
 * Comprime cualquier archivo o blob de imagen en el cliente usando HTML5 Canvas a formato WebP
 * (Máximo 800px de lado, calidad 0.7, reduciendo el tamaño a unos ~30-40 KB)
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
        if (!ctx) {
          return reject(new Error('No se pudo inicializar canvas para compresión'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Fallo en la compresión a formato WebP'));
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

function TarjetaAnki({
  ficha,
  onEvaluacionSRS,
  onEliminarFicha,
  esAdmin,
}: {
  ficha: FichaTecnica;
  onEvaluacionSRS: (fichaId: string, calificacion: 'dificil' | 'medio' | 'facil') => Promise<void>;
  onEliminarFicha: (fichaId: string, esAdminDefinitivo: boolean) => Promise<void>;
  esAdmin: boolean;
}) {
  const [estaGirada, setEstaGirada] = useState(false);
  const [notaTexto, setNotaTexto] = useState(ficha.usuarioSRS?.nota_mnemotecnica || '');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotaTexto(ficha.usuarioSRS?.nota_mnemotecnica || '');
  }, [ficha.usuarioSRS?.nota_mnemotecnica]);

  // Manejar guardado de nota
  const handleGuardarNota = async () => {
    setGuardandoNota(true);
    try {
      await guardarNotaMnemotecnica(ficha.id, notaTexto);
      if (ficha.usuarioSRS) {
        ficha.usuarioSRS.nota_mnemotecnica = notaTexto;
      }
    } finally {
      setGuardandoNota(false);
    }
  };

  // Manejar subida y compresión de imagen
  const procesarYSubirImagen = async (file: File | Blob) => {
    setSubiendoFoto(true);
    try {
      const blobWebp = await comprimirImagenAWebp(file);
      const res = await subirImagenMnemotecnica(ficha.id, blobWebp);
      if (res.ok && res.url) {
        if (!ficha.usuarioSRS) {
          ficha.usuarioSRS = {
            user_id: '',
            ficha_id: ficha.id,
            intervalo_dias: 1,
            factor_facilidad: 2.5,
            repeticiones: 0,
            proximo_repaso: new Date().toISOString(),
          };
        }
        ficha.usuarioSRS.imagen_url = res.url;
        ficha.usuarioSRS.imagen_bytes = res.bytes || blobWebp.size;
      } else {
        alert(res.error || 'Error al subir la imagen');
      }
    } catch (e: unknown) {
      console.error(e);
      alert('Error comprimiendo o subiendo la imagen.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Manejador Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && files[0].type.startsWith('image/')) {
      procesarYSubirImagen(files[0]);
    }
  };

  // Manejador Pegar con Ctrl+V dentro de la tarjeta
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          procesarYSubirImagen(file);
          break;
        }
      }
    }
  };

  // Manejador Eliminar Foto
  const handleEliminarFoto = async () => {
    if (!ficha.usuarioSRS?.imagen_url) return;
    if (!confirm('¿Eliminar esta imagen mnemotécnica?')) return;
    const url = ficha.usuarioSRS.imagen_url;
    const bytes = ficha.usuarioSRS.imagen_bytes || 0;
    await eliminarImagenMnemotecnica(ficha.id, url, bytes);
    ficha.usuarioSRS.imagen_url = null;
    ficha.usuarioSRS.imagen_bytes = 0;
  };

  const frenteTexto = ficha.frente_pregunta || ficha.concepto;
  const dorsoTexto =
    ficha.dorso_respuesta ||
    `${ficha.valor_exacto}.${ficha.trampa_habitual ? `\n\n⚠️ Ojo con la trampa: ${ficha.trampa_habitual}` : ''}`;

  const proximoRepasoFecha = ficha.usuarioSRS?.proximo_repaso
    ? new Date(ficha.usuarioSRS.proximo_repaso)
    : null;
  const esPendienteHoy =
    !proximoRepasoFecha || proximoRepasoFecha.getTime() <= Date.now();

  return (
    <article
      onPaste={handlePaste}
      tabIndex={0}
      className={`rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] transition-all overflow-hidden flex flex-col justify-between ${
        estaGirada ? 'bg-amber-50/40' : 'bg-white'
      }`}
    >
      {/* 1. CARA A: FRENTE DE LA FICHA (PREGUNTA / RETO) */}
      {!estaGirada ? (
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px]">
                Tema {ficha.tema_id}
              </span>
              <div className="flex items-center gap-1.5">
                {ficha.categoria_dato && (
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 font-mono">
                    {ficha.categoria_dato}
                  </span>
                )}
                {esPendienteHoy && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 font-mono flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                    Repasar hoy
                  </span>
                )}
              </div>
            </div>

            {/* Pregunta / Reto Frontal */}
            <div className="py-2 text-center sm:text-left space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 block">
                Pregunta Oficial de Examen:
              </span>
              <p className="text-base sm:text-lg font-black text-slate-950 leading-snug">
                {frenteTexto}
              </p>
            </div>
          </div>

          {/* Botón para dar la vuelta */}
          <button
            onClick={() => setEstaGirada(true)}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>🔄 Dar la vuelta / Ver solución</span>
          </button>
        </div>
      ) : (
        /* 2. CARA B: DORSO DE LA FICHA (SOLUCIÓN + PERSONALIZACIÓN PRIVADA + 3 BOTONES ANKI) */
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4 animate-fadeIn">
          {/* Cabecera Dorso */}
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <span className="text-[11px] font-bold font-mono text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Solución Técnica Oficial
            </span>
            <button
              onClick={() => setEstaGirada(false)}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              <span>↩️ Ver pregunta</span>
            </button>
          </div>

          {/* Solución Técnica */}
          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-xs leading-relaxed space-y-1.5">
              <div className="text-xs sm:text-sm font-extrabold text-slate-950 whitespace-pre-line">
                {dorsoTexto}
              </div>
            </div>
          </div>

          {/* ZONA DE PERSONALIZACIÓN PRIVADA POR USUARIO */}
          <div className="p-3.5 rounded-xl bg-amber-100/60 border-2 border-amber-300/80 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                Mi Zona de Personalización Privada
              </span>
              <span className="text-[10px] text-amber-800 font-mono font-medium">
                Solo visible para ti
              </span>
            </div>

            {/* Input de Nota / Regla mnemotécnica */}
            <div className="space-y-1">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  onBlur={handleGuardarNota}
                  placeholder="Escribe tu regla mnemotécnica o truco mental..."
                  className="flex-1 bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-hidden"
                />
                <button
                  onClick={handleGuardarNota}
                  disabled={guardandoNota}
                  className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                >
                  {guardandoNota ? '...' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Imagen Mnemotécnica (Arrastrar, Pegar Ctrl+V o Subir) */}
            <div className="space-y-1.5">
              {ficha.usuarioSRS?.imagen_url ? (
                <div className="relative rounded-xl border-2 border-slate-900 bg-white p-2 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ficha.usuarioSRS.imagen_url}
                      alt="Foto mnemotécnica"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-300 flex-shrink-0"
                    />
                    <div className="min-w-0 text-left">
                      <span className="block text-[11px] font-bold text-slate-900 truncate">
                        Imagen mnemotécnica (WebP)
                      </span>
                      <span className="block text-[10px] font-mono text-slate-500">
                        {Math.round((ficha.usuarioSRS.imagen_bytes || 35000) / 1024)} KB
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleEliminarFoto}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-300 transition-all cursor-pointer flex-shrink-0"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center space-y-1 ${
                    dragOver
                      ? 'border-amber-600 bg-amber-50'
                      : 'border-slate-400/80 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) procesarYSubirImagen(file);
                    }}
                  />
                  <div className="flex items-center justify-center gap-1.5 text-slate-700 text-xs font-bold">
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      {subiendoFoto
                        ? 'Comprimiendo WebP y subiendo (~35KB)...'
                        : 'Subir foto, arrastrar o pegar con Ctrl+V'}
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-500">
                    Compresión automática en navegador a 800px WebP para no gastar espacio.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3 BOTONES DE CURVA DEL OLVIDO (ANKI SM-2) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
              <span>¿Cómo la recuerdas? (Anki SM-2):</span>
              {ficha.usuarioSRS?.intervalo_dias && (
                <span className="font-mono text-[10px] text-slate-500">
                  Intervalo: {ficha.usuarioSRS.intervalo_dias}d
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onEvaluacionSRS(ficha.id, 'dificil')}
                className="py-2 px-1 rounded-xl bg-white hover:bg-rose-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#b91c1c] active:scale-95 text-rose-950 font-extrabold text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer"
              >
                <span>🔴 Difícil</span>
                <span className="text-[9px] font-mono font-medium text-rose-700 mt-0.5">
                  &lt; 1 día
                </span>
              </button>

              <button
                onClick={() => onEvaluacionSRS(ficha.id, 'medio')}
                className="py-2 px-1 rounded-xl bg-white hover:bg-amber-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#d97706] active:scale-95 text-amber-950 font-extrabold text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer"
              >
                <span>🟡 Medio</span>
                <span className="text-[9px] font-mono font-medium text-amber-700 mt-0.5">
                  3 - 4 días
                </span>
              </button>

              <button
                onClick={() => onEvaluacionSRS(ficha.id, 'facil')}
                className="py-2 px-1 rounded-xl bg-white hover:bg-emerald-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#047857] active:scale-95 text-emerald-950 font-extrabold text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer"
              >
                <span>🟢 Fácil</span>
                <span className="text-[9px] font-mono font-medium text-emerald-700 mt-0.5">
                  7+ días
                </span>
              </button>
            </div>
          </div>

          {/* Botón Eliminar Ficha */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => {
                if (esAdmin) {
                  const opcion = confirm(
                    '¿Deseas borrar esta ficha DEFINITIVAMENTE de la base de datos para TODOS los opositores?\n(Aceptar = Borrar global | Cancelar = Ocultar solo para mí)'
                  );
                  onEliminarFicha(ficha.id, opcion);
                } else {
                  if (confirm('¿Ocultar esta ficha técnica de tu temario?')) {
                    onEliminarFicha(ficha.id, false);
                  }
                }
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{esAdmin ? 'Eliminar / Ocultar ficha' : 'Ocultar esta ficha'}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ChuletaContent() {
  const searchParams = useSearchParams();
  const temaIdParam = searchParams.get('temaId') || searchParams.get('tema');
  const initialTemaId = temaIdParam ? parseInt(temaIdParam, 10) : undefined;

  const { esAdmin, effectiveUserId } = useAuth();

  const [temas, setTemas] = useState<Tema[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros
  const [filtroCurva, setFiltroCurva] = useState<'pendientes' | 'todas'>('todas');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [dropdownTemasAbierto, setDropdownTemasAbierto] = useState(false);
  const [busquedaTemaDropdown, setBusquedaTemaDropdown] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');

  // Modal selector para generar fichas con IA
  const [modalGenerarAbierto, setModalGenerarAbierto] = useState(false);
  const [temaIdParaGenerar, setTemaIdParaGenerar] = useState<number>(1);
  const [generandoIA, setGenerandoIA] = useState(false);

  // Carga inicial
  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [listaTemas, listaFichas] = await Promise.all([
          getTemas(),
          getFichasTecnicas(),
        ]);
        setTemas(listaTemas);
        setFichas(listaFichas);

        if (initialTemaId && !isNaN(initialTemaId)) {
          setTemasSeleccionados([initialTemaId]);
          setTemaIdParaGenerar(initialTemaId);
        } else {
          setTemasSeleccionados(listaTemas.map((t) => t.id));
        }
      } catch (err) {
        console.error('Error cargando fichas técnicas:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [initialTemaId, effectiveUserId]);

  const handleToggleTema = (id: number) => {
    setTemasSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleMarcarTodos = () => {
    setTemasSeleccionados(temas.map((t) => t.id));
  };

  const handleDesmarcarTodos = () => {
    setTemasSeleccionados([]);
  };

  // Filtrado de fichas
  const fichasFiltradas = useMemo(() => {
    const ahora = Date.now();
    return fichas.filter((f) => {
      // Filtro tema
      if (!temasSeleccionados.includes(f.tema_id)) return false;

      // Filtro curva Anki
      if (filtroCurva === 'pendientes') {
        const proximo = f.usuarioSRS?.proximo_repaso
          ? new Date(f.usuarioSRS.proximo_repaso).getTime()
          : 0;
        if (proximo > ahora) return false;
      }

      // Filtro texto
      if (busquedaTexto.trim() !== '') {
        const q = busquedaTexto.toLowerCase();
        const frente = (f.frente_pregunta || f.concepto).toLowerCase();
        const dorso = (f.dorso_respuesta || f.valor_exacto).toLowerCase();
        const trampa = (f.trampa_habitual || '').toLowerCase();
        const nota = (f.usuarioSRS?.nota_mnemotecnica || '').toLowerCase();
        if (!frente.includes(q) && !dorso.includes(q) && !trampa.includes(q) && !nota.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [fichas, temasSeleccionados, filtroCurva, busquedaTexto]);

  const pendientesHoyCount = useMemo(() => {
    const ahora = Date.now();
    return fichas.filter(
      (f) =>
        !f.usuarioSRS?.proximo_repaso ||
        new Date(f.usuarioSRS.proximo_repaso).getTime() <= ahora
    ).length;
  }, [fichas]);

  // Manejador Evaluación Anki SM-2
  const handleEvaluacionSRS = async (
    fichaId: string,
    calificacion: 'dificil' | 'medio' | 'facil'
  ) => {
    const ficha = fichas.find((f) => f.id === fichaId);
    if (!ficha) return;

    const res = await evaluarFichaAnki(fichaId, calificacion, ficha.usuarioSRS);
    if (res.ok && res.nuevoSRS) {
      setFichas((prev) =>
        prev.map((f) => (f.id === fichaId ? { ...f, usuarioSRS: res.nuevoSRS } : f))
      );
    }
  };

  // Manejador Eliminar Ficha
  const handleEliminarFicha = async (fichaId: string, esAdminDefinitivo: boolean) => {
    setFichas((prev) => prev.filter((f) => f.id !== fichaId));
    await eliminarFichaUsuario(fichaId, esAdminDefinitivo);
  };

  // Generar nuevas fichas oficiales con IA
  const handleGenerarLoteIA = async () => {
    setGenerandoIA(true);
    try {
      const res = await solicitarGeneracionFichas(temaIdParaGenerar);
      if (res.ok && res.fichas.length > 0) {
        setFichas((prev) => {
          const nuevas = res.fichas.filter((nf) => !prev.some((pf) => pf.id === nf.id));
          return [...nuevas, ...prev];
        });
        setModalGenerarAbierto(false);
      } else {
        alert(res.error || 'No se pudieron generar fichas en este momento.');
      }
    } catch {
      alert('Error conectando con el motor de fichas.');
    } finally {
      setGenerandoIA(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. CABECERA EDITORIAL */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border-2 border-slate-900 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shadow-[2px_2px_0px_0px_#0f172a]"
            aria-label="Volver al temario"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Fichas Técnicas 2.0 (Anki)</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Doble cara 3D · Mnemotecnia personal · Curva SM-2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalGenerarAbierto(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer active:scale-95"
            title="Generar 10 nuevas fichas con IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generar con IA</span>
          </button>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. PESTAÑAS DE FILTRO: PENDIENTES HOY VS TODAS */}
      <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-100 p-1 gap-1">
        <button
          onClick={() => setFiltroCurva('pendientes')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filtroCurva === 'pendientes'
              ? 'bg-amber-400 text-slate-950 shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-700 fill-amber-600" />
          <span>🔥 Pendientes de repaso hoy ({pendientesHoyCount})</span>
        </button>

        <button
          onClick={() => setFiltroCurva('todas')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filtroCurva === 'todas'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📚 Todas las fichas ({fichas.length})</span>
        </button>
      </div>

      {/* 3. FILTROS RÁPIDOS: TEMAS Y BÚSQUEDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Desplegable de selección de temas */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownTemasAbierto(!dropdownTemasAbierto)}
            className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-between cursor-pointer"
          >
            <span className="truncate">
              Temas: {temasSeleccionados.length === temas.length ? 'Todos (35)' : `${temasSeleccionados.length} seleccionados`}
            </span>
            <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0" />
          </button>

          {dropdownTemasAbierto && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border-2 border-slate-900 rounded-xl p-3 shadow-xl space-y-2 animate-in fade-in duration-100">
              <div className="flex items-center justify-between text-[11px]">
                <button
                  onClick={handleMarcarTodos}
                  className="text-amber-700 font-bold hover:underline cursor-pointer"
                >
                  Marcar todos
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={handleDesmarcarTodos}
                  className="text-slate-600 font-bold hover:underline cursor-pointer"
                >
                  Limpiar
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                {temas.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center justify-between p-1.5 rounded-lg text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="truncate text-slate-800">
                      T{t.id}: {t.titulo}
                    </span>
                    <input
                      type="checkbox"
                      checked={temasSeleccionados.includes(t.id)}
                      onChange={() => handleToggleTema(t.id)}
                      className="w-4 h-4 rounded text-amber-600 border-slate-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busquedaTexto}
            onChange={(e) => setBusquedaTexto(e.target.value)}
            placeholder="Buscar concepto, cifra o mnemotecnia..."
            className="w-full bg-white border-2 border-slate-900 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 font-medium shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden"
          />
        </div>
      </div>

      {/* 4. LISTADO DE FICHAS ANKI */}
      {cargando ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Cargando tus Fichas Técnicas Anki...</p>
        </div>
      ) : fichasFiltradas.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border-2 border-slate-900 text-center space-y-3 shadow-[3px_3px_0px_0px_#0f172a]">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            {filtroCurva === 'pendientes'
              ? '¡Al día! No tienes fichas pendientes de repaso hoy'
              : 'No hay fichas para los filtros seleccionados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {filtroCurva === 'pendientes'
              ? 'Has consolidado tus repasos Anki. Cambia a "Todas las fichas" si quieres seguir estudiando.'
              : 'Prueba generando un lote nuevo de 10 fichas con IA.'}
          </p>
          <button
            onClick={() => setFiltroCurva('todas')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Ver todas las fichas
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-[11px] font-mono text-slate-500 font-bold flex items-center justify-between px-1">
            <span>Mostrando {fichasFiltradas.length} fichas</span>
            <span>Estilo Anki SM-2</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {fichasFiltradas.map((ficha) => (
              <TarjetaAnki
                key={ficha.id}
                ficha={ficha}
                onEvaluacionSRS={handleEvaluacionSRS}
                onEliminarFicha={handleEliminarFicha}
                esAdmin={esAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {/* MODAL GENERADOR DE FICHAS CON IA */}
      {modalGenerarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-2xl border-2 border-slate-900 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Generar 10 Fichas con IA</h3>
              </div>
              <button
                onClick={() => setModalGenerarAbierto(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Selecciona el tema a destripar:
              </label>
              <select
                value={temaIdParaGenerar}
                onChange={(e) => setTemaIdParaGenerar(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-hidden"
              >
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tema {t.id}: {t.titulo.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerarLoteIA}
              disabled={generandoIA}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generandoIA ? 'Generando 10 fichas con IA...' : '⚡ Generar Lote Oficial'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Navegación móvil inferior */}
      <BottomNav />
    </div>
  );
}

export default function PaginaFichasAnki() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChuletaContent />
    </Suspense>
  );
}
