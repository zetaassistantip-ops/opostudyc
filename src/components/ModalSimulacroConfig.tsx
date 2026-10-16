'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Tema } from '@/lib/types';

interface ModalSimulacroConfigProps {
  abierto: boolean;
  onCerrar: () => void;
  temas: Tema[];
}

export default function ModalSimulacroConfig({
  abierto,
  onCerrar,
  temas,
}: ModalSimulacroConfigProps) {
  const router = useRouter();

  const [tipoAmbito, setTipoAmbito] = useState<'todos' | 'personalizado'>('todos');
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [limitePreguntas, setLimitePreguntas] = useState<number>(20);
  const [busquedaTema, setBusquedaTema] = useState<string>('');

  // Inicializar todos los temas seleccionados por defecto cuando pasa a personalizado
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

  const handleEmpezarSimulacro = () => {
    if (!puedeEmpezar) return;

    const paramTemas =
      tipoAmbito === 'todos' ? 'all' : temasSeleccionados.join(',');

    onCerrar();
    router.push(`/jugar?modo=general&temas=${paramTemas}&limite=${limitePreguntas}`);
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl border-2 border-slate-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Cabecera */}
        <header className="p-4 sm:p-5 border-b-2 border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border-2 border-slate-900 flex items-center justify-center text-violet-700 shadow-2xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Simulacro / Test General
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Batería aleatoria multitema de examen oficial
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-900 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Selector de Ámbito */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              1. Ámbito de temas del examen
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
                    Temas Específicos
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
          </div>

          {/* Desplegable si es personalizado */}
          {tipoAmbito === 'personalizado' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Selecciona qué temas mezclar:
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleMarcarTodos}
                    className="text-violet-700 hover:underline font-semibold cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={handleDesmarcarTodos}
                    className="text-slate-500 hover:underline font-semibold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Buscador de temas en el modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={busquedaTema}
                  onChange={(e) => setBusquedaTema(e.target.value)}
                  placeholder="Buscar tema por nombre o número..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-violet-400 focus:ring-1 focus:ring-violet-300"
                />
              </div>

              {/* Lista scrolleable de temas con checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {temasFiltrados.map((t) => {
                  const marcado = temasSeleccionados.includes(t.id);
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                        marcado
                          ? 'bg-violet-100/70 text-violet-950 font-medium'
                          : 'bg-white hover:bg-slate-100/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-5 h-5 rounded-md bg-white border border-slate-200 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {t.id}
                        </span>
                        <span className="truncate">{t.titulo}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => handleToggleTema(t.id)}
                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-500 text-right">
                {temasSeleccionados.length} de {temas.length} temas seleccionados
              </div>
            </div>
          )}

          {/* 2. Selector de Número de Preguntas */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              2. Longitud del simulacro
            </label>

            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 35, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setLimitePreguntas(num)}
                  className={`py-2.5 rounded-lg text-xs font-mono font-bold transition-transform duration-75 cursor-pointer border-2 border-slate-900 ${
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
        <footer className="p-4 sm:p-5 border-t-2 border-slate-900 bg-slate-50/50">
          <button
            onClick={handleEmpezarSimulacro}
            disabled={!puedeEmpezar}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-transform duration-75 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🚀 Empezar Test General ({limitePreguntas} preguntas)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}
