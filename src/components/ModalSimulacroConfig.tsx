'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Target,
  CheckCircle2,
  ListFilter,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  ChevronRight,
  Flame,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { Tema, Pregunta } from '@/lib/types';
import { solicitarGeneracionMotorTema } from '@/lib/supabase';

interface ModalSimulacroConfigProps {
  abierto: boolean;
  onCerrar: () => void;
  temas: Tema[];
  preguntas?: Pregunta[];
  temaInicial?: number | null;
}

export default function ModalSimulacroConfig({
  abierto,
  onCerrar,
  temas,
  preguntas = [],
  temaInicial = null,
}: ModalSimulacroConfigProps) {
  const router = useRouter();

  const [tipoAmbito, setTipoAmbito] = useState<'todos' | 'personalizado'>('todos');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [modoPreguntas, setModoPreguntas] = useState<'nuevas' | 'falladas' | 'mixtas'>('mixtas');
  const [limitePreguntas, setLimitePreguntas] = useState<number>(15);
  const [busquedaTema, setBusquedaTema] = useState<string>('');
  const [generandoIA, setGenerandoIA] = useState(false);

  // Inicializar según si viene de un tema individual o de simulacro global
  useEffect(() => {
    if (abierto) {
      if (temaInicial) {
        setTipoAmbito('personalizado');
        setTemasSeleccionados([temaInicial]);
      } else {
        setTipoAmbito('todos');
        setTemasSeleccionados(temas.map((t) => t.id));
      }
    }
  }, [abierto, temaInicial, temas]);

  const temaUnicoObj = useMemo(() => {
    if (temaInicial) return temas.find((t) => t.id === temaInicial);
    if (tipoAmbito === 'personalizado' && temasSeleccionados.length === 1) {
      return temas.find((t) => t.id === temasSeleccionados[0]);
    }
    return null;
  }, [temaInicial, tipoAmbito, temasSeleccionados, temas]);

  // Contadores para el ámbito seleccionado
  const estadisticasAmbito = useMemo(() => {
    const ids =
      tipoAmbito === 'todos' ? temas.map((t) => t.id) : temasSeleccionados;
    const pregs = preguntas.filter((p) => ids.includes(p.tema_id));

    const nuevas = pregs.filter((p) => p.ultima_vez_vista === null).length;
    const falladas = pregs.filter(
      (p) => p.fallos_totales > 0 || (p.caja_leitner <= 1 && p.ultima_vez_vista !== null)
    ).length;
    const total = pregs.length;

    return { nuevas, falladas, total };
  }, [tipoAmbito, temasSeleccionados, preguntas, temas]);

  const handleCambiarAmbito = (tipo: 'todos' | 'personalizado') => {
    setTipoAmbito(tipo);
    if (tipo === 'personalizado' && temasSeleccionados.length === 0) {
      setTemasSeleccionados(temas.map((t) => t.id));
    }
  };

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

  const temasFiltrados = useMemo(() => {
    return temas.filter(
      (t) =>
        busquedaTema === '' ||
        t.titulo.toLowerCase().includes(busquedaTema.toLowerCase()) ||
        t.id.toString() === busquedaTema.trim()
    );
  }, [temas, busquedaTema]);

  const puedeEmpezar =
    tipoAmbito === 'todos' || temasSeleccionados.length > 0;

  const handleEmpezarTest = () => {
    if (!puedeEmpezar) return;

    onCerrar();

    if (tipoAmbito === 'personalizado' && temasSeleccionados.length === 1) {
      const idTema = temasSeleccionados[0];
      router.push(
        `/jugar?modo=tema&temaId=${idTema}&filtro=${modoPreguntas}&limite=${limitePreguntas}`
      );
    } else {
      const paramTemas =
        tipoAmbito === 'todos' ? 'all' : temasSeleccionados.join(',');
      router.push(
        `/jugar?modo=general&temas=${paramTemas}&filtro=${modoPreguntas}&limite=${limitePreguntas}`
      );
    }
  };

  // Generar con IA directo si en Solo Nuevas quedan 0
  const handleGenerarPreguntasYEmpezar = async () => {
    const idTema = temaUnicoObj?.id || (temasSeleccionados.length === 1 ? temasSeleccionados[0] : null);
    if (!idTema) return;

    setGenerandoIA(true);
    try {
      const res = await solicitarGeneracionMotorTema(idTema, true);
      if (res.ok) {
        onCerrar();
        router.push(`/jugar?modo=tema&temaId=${idTema}&filtro=nuevas&limite=${limitePreguntas}`);
      } else {
        alert(res.error || 'No se pudieron generar más preguntas en este momento.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el motor de temas.');
    } finally {
      setGenerandoIA(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl border-2 border-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Cabecera */}
        <header className="p-4 sm:p-5 border-b-2 border-slate-900 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 border-2 border-slate-900 flex items-center justify-center text-violet-800 shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {temaUnicoObj
                  ? `Configurar Test: Tema ${temaUnicoObj.id}`
                  : 'Configurador de Test / Simulacro'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium truncate max-w-xs">
                {temaUnicoObj
                  ? temaUnicoObj.titulo
                  : 'Elige los temas y el tipo de preguntas'}
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 flex items-center justify-center text-slate-800 transition-colors cursor-pointer shadow-2xs"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. SELECCIÓN DE MODO DE PREGUNTAS (OBLIGATORIO) */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
              1. Modo de Preguntas
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* Opción 1: Solo Nuevas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('nuevas')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modoPreguntas === 'nuevas'
                    ? 'bg-amber-100/80 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    🆕 Solo Nuevas
                  </span>
                  {modoPreguntas === 'nuevas' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </div>
                <span className="text-[10px] text-slate-600 mt-1 font-mono font-semibold">
                  {estadisticasAmbito.nuevas} inéditas
                </span>
              </button>

              {/* Opción 2: Solo Falladas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('falladas')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modoPreguntas === 'falladas'
                    ? 'bg-rose-100/80 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    ❌ Solo Falladas
                  </span>
                  {modoPreguntas === 'falladas' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-700" />
                  )}
                </div>
                <span className="text-[10px] text-slate-600 mt-1 font-mono font-semibold">
                  {estadisticasAmbito.falladas} por corregir
                </span>
              </button>

              {/* Opción 3: Mixtas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('mixtas')}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  modoPreguntas === 'mixtas'
                    ? 'bg-violet-100/80 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    🔄 Mixtas
                  </span>
                  {modoPreguntas === 'mixtas' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-700" />
                  )}
                </div>
                <span className="text-[10px] text-slate-600 mt-1 font-mono font-semibold">
                  {estadisticasAmbito.total} disponibles
                </span>
              </button>
            </div>

            {/* Aviso si eligió Solo Nuevas y no quedan preguntas */}
            {modoPreguntas === 'nuevas' && estadisticasAmbito.nuevas === 0 && (
              <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">
                    No te quedan preguntas inéditas en esta selección.
                  </span>
                </div>
                {temaUnicoObj && (
                  <button
                    onClick={handleGenerarPreguntasYEmpezar}
                    disabled={generandoIA}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition-all active:scale-95 disabled:opacity-60"
                  >
                    {generandoIA ? 'Generando...' : '⚡ Generar +6 con IA'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. ÁMBITO DE TEMAS (SI NO VIENE CON UN TEMA FORZADO) */}
          {!temaInicial && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                2. Ámbito de temas
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCambiarAmbito('todos')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipoAmbito === 'todos'
                      ? 'bg-violet-50 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white border-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Todos los Temas
                    </span>
                    {tipoAmbito === 'todos' && (
                      <CheckCircle2 className="w-4 h-4 text-violet-700" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono mt-1">
                    Examen Global (35 temas)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCambiarAmbito('personalizado')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipoAmbito === 'personalizado'
                      ? 'bg-violet-50 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white border-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Seleccionar Temas
                    </span>
                    {tipoAmbito === 'personalizado' && (
                      <CheckCircle2 className="w-4 h-4 text-violet-700" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono mt-1">
                    {temasSeleccionados.length} seleccionados
                  </span>
                </button>
              </div>

              {/* Selector detallado con checkboxes */}
              {tipoAmbito === 'personalizado' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Elige uno, varios o todos:
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={handleMarcarTodos}
                        className="text-violet-700 hover:underline font-bold cursor-pointer"
                      >
                        Marcar todos
                      </button>
                      <span className="text-slate-400">·</span>
                      <button
                        type="button"
                        onClick={handleDesmarcarTodos}
                        className="text-slate-600 hover:underline font-bold cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Buscador de temas */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={busquedaTema}
                      onChange={(e) => setBusquedaTema(e.target.value)}
                      placeholder="Buscar tema por título o número..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-400 font-medium"
                    />
                  </div>

                  {/* Lista con checkboxes */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {temasFiltrados.map((t) => {
                      const marcado = temasSeleccionados.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                            marcado
                              ? 'bg-violet-100/90 border-violet-400 text-violet-950 font-semibold'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-300 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {t.id}
                            </span>
                            <span className="truncate">{t.titulo}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => handleToggleTema(t.id)}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-400 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-slate-500 text-right font-mono font-medium">
                    {temasSeleccionados.length} de {temas.length} temas seleccionados
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. NÚMERO DE PREGUNTAS */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
              {temaInicial ? '2' : '3'}. Longitud del test
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 35].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLimitePreguntas(num)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border-2 border-slate-900 ${
                    limitePreguntas === num
                      ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white text-slate-800 hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px]'
                  }`}
                >
                  {num} pregs
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con botón CTA */}
        <footer className="p-4 sm:p-5 border-t-2 border-slate-900 bg-slate-50 flex flex-col gap-2">
          {modoPreguntas === 'nuevas' && estadisticasAmbito.nuevas === 0 && temaUnicoObj ? (
            <button
              onClick={handleGenerarPreguntasYEmpezar}
              disabled={generandoIA}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                {generandoIA
                  ? 'Generando preguntas con IA...'
                  : '⚡ Generar +6 preguntas con IA y empezar'}
              </span>
            </button>
          ) : (
            <button
              onClick={handleEmpezarTest}
              disabled={!puedeEmpezar}
              className="w-full py-3.5 bg-violet-700 hover:bg-violet-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                🚀 Empezar Test (
                {modoPreguntas === 'nuevas'
                  ? 'Solo Nuevas'
                  : modoPreguntas === 'falladas'
                  ? 'Solo Falladas'
                  : 'Mixtas'}
                ) · {limitePreguntas} pregs
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
