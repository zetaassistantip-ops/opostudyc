'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Target,
  CheckCircle2,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  ChevronRight,
  Flame,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { Tema, Pregunta } from '@/lib/types';
import { solicitarGeneracionMotorTema } from '@/lib/supabase';

interface ModalSimulacroConfigProps {
  abierto: boolean;
  onCerrar: () => void;
  temas: Tema[];
  preguntas?: Pregunta[];
  temaInicial?: number | null;
  temasIniciales?: number[];
}

export default function ModalSimulacroConfig({
  abierto,
  onCerrar,
  temas,
  preguntas = [],
  temaInicial = null,
  temasIniciales = [],
}: ModalSimulacroConfigProps) {
  const router = useRouter();

  const [tipoAmbito, setTipoAmbito] = useState<'todos' | 'personalizado'>('todos');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [modoPreguntas, setModoPreguntas] = useState<'nuevas' | 'falladas' | 'mixtas'>('mixtas');
  const [limitePreguntas, setLimitePreguntas] = useState<number>(20);
  const [busquedaTema, setBusquedaTema] = useState<string>('');
  const [generandoIA, setGenerandoIA] = useState(false);

  // Inicializar según si viene de temas marcados en el dashboard, tema individual o general
  useEffect(() => {
    if (abierto) {
      if (temaInicial) {
        setTipoAmbito('personalizado');
        setTemasSeleccionados([temaInicial]);
      } else if (temasIniciales && temasIniciales.length > 0) {
        setTipoAmbito('personalizado');
        setTemasSeleccionados(temasIniciales);
      } else {
        setTipoAmbito('todos');
        setTemasSeleccionados(temas.map((t) => t.id));
      }
    }
  }, [abierto, temaInicial, temasIniciales, temas]);

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
      const res = await solicitarGeneracionMotorTema(idTema, true, 6);
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
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col min-h-[100dvh] overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col justify-between bg-white border-x-2 border-slate-900 shadow-2xl min-h-[100dvh]">
        {/* Cabecera Pantalla Completa */}
        <header className="p-4 sm:p-5 border-b-2 border-slate-900 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onCerrar}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 transition-colors cursor-pointer shadow-xs"
              aria-label="Volver"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {temaUnicoObj
                  ? `Configurar Test: Tema ${temaUnicoObj.id}`
                  : `Configurar Test (${tipoAmbito === 'todos' ? 'Todos los Temas' : `${temasSeleccionados.length} Temas`})`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium truncate max-w-xs">
                {temaUnicoObj
                  ? temaUnicoObj.titulo
                  : 'Personaliza modo de preguntas y longitud'}
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 border-2 border-slate-900 flex items-center justify-center text-slate-800 transition-colors cursor-pointer shadow-xs"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contenido scrolleable de configuración */}
        <div className="flex-1 p-4 sm:p-5 space-y-5">
          {/* 1. SELECCIÓN DE MODO DE PREGUNTAS */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
              1. Modo de Preguntas
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Opción 1: Solo Nuevas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('nuevas')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                  modoPreguntas === 'nuevas'
                    ? 'bg-amber-100/90 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      🆕 Solo Nuevas (Inéditas para ti)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Preguntas que aún no has respondido nunca en esta selección ({estadisticasAmbito.nuevas} disponibles)
                  </p>
                </div>
                {modoPreguntas === 'nuevas' && (
                  <CheckCircle2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
                )}
              </button>

              {/* Opción 2: Solo Falladas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('falladas')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                  modoPreguntas === 'falladas'
                    ? 'bg-rose-100/90 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      ❌ Solo Falladas
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Entrenamiento intensivo en preguntas erradas o en observación ({estadisticasAmbito.falladas} pendientes)
                  </p>
                </div>
                {modoPreguntas === 'falladas' && (
                  <CheckCircle2 className="w-5 h-5 text-rose-700 flex-shrink-0" />
                )}
              </button>

              {/* Opción 3: Mixtas */}
              <button
                type="button"
                onClick={() => setModoPreguntas('mixtas')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                  modoPreguntas === 'mixtas'
                    ? 'bg-emerald-100/90 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]'
                    : 'bg-white border-slate-900 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      🔄 Mixtas (Nuevas + Repaso)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Batería equilibrada combinando inéditas y repaso espaciado ({estadisticasAmbito.total} totales)
                  </p>
                </div>
                {modoPreguntas === 'mixtas' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                )}
              </button>
            </div>

            {/* Aviso si eligió Solo Nuevas y no quedan preguntas */}
            {modoPreguntas === 'nuevas' && estadisticasAmbito.nuevas === 0 && (
              <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs mt-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">
                    No te quedan preguntas inéditas en esta selección. El sistema generará preguntas nuevas con IA al comenzar.
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

          {/* 2. ÁMBITO DE TEMAS (SI HAY VARIOS TEMAS O SELECCIÓN) */}
          {!temaInicial && (
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
                2. Temas a Evaluar
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCambiarAmbito('todos')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipoAmbito === 'todos'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Todos los Temas
                    </span>
                    {tipoAmbito === 'todos' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <span className={`text-[11px] font-mono mt-1 ${tipoAmbito === 'todos' ? 'text-slate-300' : 'text-slate-600'}`}>
                    35 temas oficiales
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCambiarAmbito('personalizado')}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipoAmbito === 'personalizado'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      Selección Personalizada
                    </span>
                    {tipoAmbito === 'personalizado' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <span className={`text-[11px] font-mono mt-1 ${tipoAmbito === 'personalizado' ? 'text-slate-300' : 'text-slate-600'}`}>
                    {temasSeleccionados.length} tema(s)
                  </span>
                </button>
              </div>

              {/* Selector detallado con checkboxes */}
              {tipoAmbito === 'personalizado' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Temas seleccionados ({temasSeleccionados.length}):
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleMarcarTodos}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-slate-400">|</span>
                      <button
                        type="button"
                        onClick={handleDesmarcarTodos}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Buscador dentro del selector */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={busquedaTema}
                      onChange={(e) => setBusquedaTema(e.target.value)}
                      placeholder="Filtrar temas..."
                      className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 font-medium"
                    />
                  </div>

                  {/* Lista con checkboxes */}
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {temasFiltrados.map((t) => {
                      const marcado = temasSeleccionados.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all border ${
                            marcado
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className={`w-5 h-5 rounded-md border font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                              marcado ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}>
                              {t.id}
                            </span>
                            <span className="truncate">{t.titulo}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => handleToggleTema(t.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-400 cursor-pointer"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. NÚMERO DE PREGUNTAS (LONGITUD) */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider block">
              {temaInicial ? '2' : '3'}. Cantidad de preguntas (Longitud)
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLimitePreguntas(num)}
                  className={`py-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border-2 border-slate-900 flex flex-col items-center justify-center ${
                    limitePreguntas === num
                      ? 'bg-slate-950 text-amber-400 shadow-[3px_3px_0px_0px_#0f172a]'
                      : 'bg-white text-slate-800 hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px]'
                  }`}
                >
                  <span className="text-base font-black">{num}</span>
                  <span className="text-[10px] uppercase font-sans">preguntas</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer fijo con botón de arranque */}
        <footer className="p-4 sm:p-5 border-t-2 border-slate-900 bg-slate-50 sticky bottom-0 z-10 flex flex-col gap-2">
          <button
            onClick={handleEmpezarTest}
            disabled={!puedeEmpezar}
            className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 text-white font-extrabold text-sm sm:text-base rounded-xl transition-all border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              🎯 Empezar Test ({limitePreguntas} preguntas)
            </span>
            <ChevronRight className="w-5 h-5 text-red-500" />
          </button>
        </footer>
      </div>
    </div>
  );
}
