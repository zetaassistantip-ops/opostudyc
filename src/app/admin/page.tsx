'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldAlert,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  ThumbsDown,
  ThumbsUp,
  Meh,
  Sparkles,
} from 'lucide-react';
import { Pregunta, Tema } from '@/lib/types';
import { getTemas, getPreguntas, eliminarPregunta, resetearVotosPregunta, supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

type PestañaFiltro = 'malas' | 'regulares' | 'buenas' | 'todas';

export default function AdminPage() {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pestaña, setPestaña] = useState<PestañaFiltro>('malas');
  const [temaSeleccionado, setTemaSeleccionado] = useState<number | 'all'>('all');
  const [busqueda, setBusqueda] = useState('');
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeToast, setMensajeToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      try {
        const [listaTemas, listaPreguntas] = await Promise.all([
          getTemas(),
          getPreguntas(),
        ]);
        setTemas(listaTemas);
        setPreguntas(listaPreguntas);
      } catch (err) {
        console.error('Error cargando preguntas en admin:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setMensajeToast({ tipo, texto });
    setTimeout(() => setMensajeToast(null), 3000);
  };

  // Filtrado de preguntas según pestaña y tema
  const preguntasFiltradas = useMemo(() => {
    return preguntas
      .filter((p) => {
        // Filtro por pestaña
        if (pestaña === 'malas') {
          if ((p.votos_mala || 0) <= 0) return false;
        } else if (pestaña === 'regulares') {
          if ((p.votos_regular || 0) <= 0) return false;
        } else if (pestaña === 'buenas') {
          if ((p.votos_buena || 0) <= 0) return false;
        }

        // Filtro por tema
        if (temaSeleccionado !== 'all') {
          if (p.tema_id !== temaSeleccionado) return false;
        }

        // Búsqueda por texto
        if (busqueda.trim() !== '') {
          const q = busqueda.toLowerCase();
          const matchEnunciado = p.enunciado.toLowerCase().includes(q);
          const matchExplicacion = p.explicacion_profesor.toLowerCase().includes(q);
          if (!matchEnunciado && !matchExplicacion) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (pestaña === 'malas') {
          return (b.votos_mala || 0) - (a.votos_mala || 0);
        }
        if (pestaña === 'regulares') {
          return (b.votos_regular || 0) - (a.votos_regular || 0);
        }
        if (pestaña === 'buenas') {
          return (b.votos_buena || 0) - (a.votos_buena || 0);
        }
        return (b.tema_id - a.tema_id);
      });
  }, [preguntas, pestaña, temaSeleccionado, busqueda]);

  // Contadores para métricas superiores
  const contadores = useMemo(() => {
    let malas = 0;
    let regulares = 0;
    let buenas = 0;
    preguntas.forEach((p) => {
      if ((p.votos_mala || 0) > 0) malas++;
      if ((p.votos_regular || 0) > 0) regulares++;
      if ((p.votos_buena || 0) > 0) buenas++;
    });
    return { total: preguntas.length, malas, regulares, buenas };
  }, [preguntas]);

  // Manejador: Eliminar pregunta con Supabase
  const handleEliminarPregunta = async (id: string, enunciado: string) => {
    const seguro = window.confirm(
      `¿Seguro que deseas eliminar definitivamente esta pregunta?\n\n"${enunciado.slice(0, 80)}..."`
    );
    if (!seguro) return;

    setAccionEnCurso(id);
    try {
      // 1. Quitar de la lista en memoria al instante para feedback inmediato
      setPreguntas((prev) => prev.filter((p) => p.id !== id));

      // 2. Ejecutar borrado en Supabase
      const res = await eliminarPregunta(id);
      if (res.ok) {
        mostrarToast('Pregunta eliminada de la base de datos.');
      } else {
        mostrarToast(res.error || 'No se pudo eliminar la pregunta.', 'error');
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error al eliminar pregunta.', 'error');
    } finally {
      setAccionEnCurso(null);
    }
  };

  // Manejador: Resetear votos a cero
  const handleResetearVotos = async (id: string) => {
    setAccionEnCurso(id);
    try {
      // 1. Actualización optimista local
      setPreguntas((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, votos_buena: 0, votos_regular: 0, votos_mala: 0 } : p
        )
      );

      // 2. Ejecutar en Supabase
      const res = await resetearVotosPregunta(id);
      if (res.ok) {
        mostrarToast('Votos reseteados a 0.');
      } else {
        mostrarToast(res.error || 'Error reseteando votos.', 'error');
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error al resetear votos.', 'error');
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. CABECERA ADMIN */}
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
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Panel de Moderación Admin</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Control de calidad y valoraciones del banco oficial
            </p>
          </div>
        </div>

        <Link
          href="/admin/ingesta"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-amber-700" />
          <span>Ingesta</span>
        </Link>
      </header>

      {/* 2. BARRA DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
          <span className="text-base font-black text-rose-600">{contadores.malas}</span>
          <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            👎 Malas
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
          <span className="text-base font-black text-amber-600">{contadores.regulares}</span>
          <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            😐 Regulares
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
          <span className="text-base font-black text-emerald-600">{contadores.buenas}</span>
          <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            👍 Buenas
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
          <span className="text-base font-black text-slate-900">{contadores.total}</span>
          <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
            Total
          </span>
        </div>
      </div>

      {/* 3. PESTAÑAS DE FILTRO RÁPIDO */}
      <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-100 p-1 gap-1">
        <button
          onClick={() => setPestaña('malas')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            pestaña === 'malas'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>Malas ({contadores.malas})</span>
        </button>

        <button
          onClick={() => setPestaña('regulares')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            pestaña === 'regulares'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Meh className="w-3.5 h-3.5" />
          <span>Regulares ({contadores.regulares})</span>
        </button>

        <button
          onClick={() => setPestaña('buenas')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            pestaña === 'buenas'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Buenas ({contadores.buenas})</span>
        </button>

        <button
          onClick={() => setPestaña('todas')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            pestaña === 'todas'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Todas ({contadores.total})</span>
        </button>
      </div>

      {/* 4. FILTROS SECUNDARIOS: TEMA Y BÚSQUEDA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Selector de tema */}
        <div className="relative">
          <select
            value={temaSeleccionado}
            onChange={(e) =>
              setTemaSeleccionado(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
            }
            className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden cursor-pointer"
          >
            <option value="all">📚 Todos los Temas (1 al 35)</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                Tema {t.id}: {t.titulo.slice(0, 35)}...
              </option>
            ))}
          </select>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en preguntas o respuestas..."
            className="w-full bg-white border-2 border-slate-900 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 font-medium shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden"
          />
        </div>
      </div>

      {/* 5. AVISO TOAST FLOTANTE */}
      {mensajeToast && (
        <div
          className={`p-3 rounded-xl border-2 border-slate-900 text-xs font-bold flex items-center gap-2 shadow-[3px_3px_0px_0px_#0f172a] animate-in fade-in duration-150 ${
            mensajeToast.tipo === 'exito'
              ? 'bg-emerald-100 text-emerald-950 border-emerald-900'
              : 'bg-rose-100 text-rose-950 border-rose-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* 6. LISTA DE PREGUNTAS */}
      {cargando ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Cargando preguntas de Supabase...</p>
        </div>
      ) : preguntasFiltradas.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border-2 border-slate-900 text-center space-y-2 shadow-[3px_3px_0px_0px_#0f172a]">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            {pestaña === 'malas'
              ? '¡Ninguna pregunta reportada como mala!'
              : 'No hay preguntas con este criterio'}
          </h3>
          <p className="text-xs text-slate-500">
            {pestaña === 'malas'
              ? 'El banco de preguntas no tiene reportes negativos pendientes.'
              : 'Prueba cambiando de pestaña o seleccionando otro tema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[11px] font-mono text-slate-500 font-bold flex items-center justify-between px-1">
            <span>
              Mostrando {preguntasFiltradas.length} preguntas
            </span>
            {pestaña === 'malas' && (
              <span className="text-red-600">Ordenadas por más votos negativos</span>
            )}
          </div>

          {preguntasFiltradas.map((pregunta) => {
            const temaObj =
              pregunta.tema || temas.find((t) => t.id === pregunta.tema_id);

            return (
              <article
                key={pregunta.id}
                className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3 text-xs"
              >
                {/* Cabecera de la tarjeta: Badges de Tema y Votos */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px]">
                      Tema {pregunta.tema_id}
                    </span>
                    <span className="text-slate-600 font-semibold truncate max-w-[200px] text-[11px]">
                      {temaObj?.titulo}
                    </span>
                  </div>

                  {/* Badges de votos */}
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                        (pregunta.votos_mala || 0) > 0
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-black'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                      title="Votos Negativos / Malas"
                    >
                      👎 {pregunta.votos_mala || 0}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                        (pregunta.votos_regular || 0) > 0
                          ? 'bg-amber-100 text-amber-800 border-amber-300 font-black'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                      title="Votos Regulares"
                    >
                      😐 {pregunta.votos_regular || 0}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${
                        (pregunta.votos_buena || 0) > 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                      title="Votos Positivos / Buenas"
                    >
                      👍 {pregunta.votos_buena || 0}
                    </span>
                  </div>
                </div>

                {/* Enunciado */}
                <div>
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                    {pregunta.enunciado}
                  </p>
                </div>

                {/* 4 Opciones (marcando la correcta en verde) */}
                <div className="space-y-1.5 pt-1">
                  {(pregunta.opciones || []).map((opc, idx) => {
                    const letra = ['A', 'B', 'C', 'D'][idx] || '';
                    const esCorrecta = idx === pregunta.respuesta_correcta;

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border flex items-start gap-2 ${
                          esCorrecta
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                            esCorrecta
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {letra}
                        </span>
                        <span className="flex-1 text-[11px] leading-relaxed">{opc}</span>
                        {esCorrecta && (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-100 flex-shrink-0">
                            Correcta
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explicación pedagógica */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Explicación del Profesor:
                  </span>
                  <div
                    className="text-[11px] text-slate-800 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: (pregunta.explicacion_profesor || '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-950">$1</strong>')
                        .replace(/\n/g, '<br/>'),
                    }}
                  />
                </div>

                {/* BOTONES DE ACCIÓN: ELIMINAR PREGUNTA Y RESETEAR VOTOS */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    onClick={() => handleResetearVotos(pregunta.id)}
                    disabled={accionEnCurso === pregunta.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    <span>🧹 Resetear votos</span>
                  </button>

                  <button
                    onClick={() => handleEliminarPregunta(pregunta.id, pregunta.enunciado)}
                    disabled={accionEnCurso === pregunta.id}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>🗑️ Eliminar pregunta</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Navegación inferior móvil */}
      <BottomNav />
    </div>
  );
}
