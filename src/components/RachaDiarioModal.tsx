'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Award,
} from 'lucide-react';
import { SesionEstudio } from '@/lib/types';

interface RachaDiarioModalProps {
  abierto: boolean;
  onCerrar: () => void;
  rachaDias: number;
  sesiones: SesionEstudio[];
}

export default function RachaDiarioModal({
  abierto,
  onCerrar,
  rachaDias,
  sesiones,
}: RachaDiarioModalProps) {
  // Offset de semanas respecto a la actual (0 = actual, -1 = semana pasada, etc.)
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [fechaHoy, setFechaHoy] = useState<string>('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('');

  useEffect(() => {
    if (abierto) {
      const hoyIso = new Date().toISOString().slice(0, 10);
      setFechaHoy(hoyIso);
      setFechaSeleccionada((prev) => prev || hoyIso);
    }
  }, [abierto]);

  // Calcular los 7 días de la semana (Lunes a Domingo) para el semanaOffset seleccionado
  const diasSemana = useMemo(() => {
    if (!fechaHoy) return [];
    const [y, m, d] = fechaHoy.split('-').map(Number);
    const hoy = new Date(y, m - 1, d);
    // Obtener el lunes de la semana actual
    const diaActual = hoy.getDay(); // 0 = Domingo, 1 = Lunes...
    const diffAlLunes = (diaActual === 0 ? -6 : 1) - diaActual;

    const lunesBase = new Date(hoy);
    lunesBase.setDate(hoy.getDate() + diffAlLunes + semanaOffset * 7);

    const nombresDias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const nombresLargo = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ];

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(lunesBase);
      d.setDate(lunesBase.getDate() + i);
      const iso = d.toISOString().slice(0, 10);

      // Comprobar si hay sesiones este día
      const sesionesDia = sesiones.filter((s) => {
        const fechaSesion = s.fecha ? s.fecha.slice(0, 10) : s.created_at?.slice(0, 10);
        return fechaSesion === iso;
      });

      const esHoy = iso === fechaHoy;

      return {
        diaCorto: nombresDias[i],
        diaLargo: nombresLargo[i],
        numero: d.getDate(),
        mes: d.toLocaleString('es-ES', { month: 'short' }),
        iso,
        esHoy,
        tieneEntrenamiento: sesionesDia.length > 0,
        totalPreguntas: sesionesDia.reduce((acc, s) => acc + s.preguntas_respondidas, 0),
        sesiones: sesionesDia,
      };
    });
  }, [fechaHoy, semanaOffset, sesiones]);

  // Sesiones del día seleccionado
  const infoDiaSeleccionado = useMemo(() => {
    if (diasSemana.length === 0) return null;
    return diasSemana.find((d) => d.iso === fechaSeleccionada) || diasSemana[0];
  }, [diasSemana, fechaSeleccionada]);

  if (!abierto || !infoDiaSeleccionado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Cabecera */}
        <header className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <Flame className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Tu Racha y Diario de Estudio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {rachaDias > 0 ? (
                  <span className="font-semibold text-amber-700">
                    🔥 {rachaDias} {rachaDias === 1 ? 'día consecutivo' : 'días consecutivos'} entrenando
                  </span>
                ) : (
                  <span>¡Completa un test hoy para encender tu racha!</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Selector de semana */}
        <div className="px-4 sm:px-5 pt-3 flex items-center justify-between text-xs">
          <button
            onClick={() => setSemanaOffset((prev) => prev - 1)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span>Semana anterior</span>
          </button>

          <span className="font-bold text-slate-700">
            {semanaOffset === 0 ? 'Esta semana' : semanaOffset === -1 ? 'Semana pasada' : `Hace ${Math.abs(semanaOffset)} semanas`}
          </span>

          <button
            onClick={() => setSemanaOffset((prev) => Math.min(0, prev + 1))}
            disabled={semanaOffset >= 0}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 transition-all disabled:opacity-40"
          >
            <span>Semana siguiente</span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tira semanal de Lunes a Domingo */}
        <div className="p-4 sm:p-5 pt-3">
          <div className="grid grid-cols-7 gap-1.5 bg-slate-50 p-2 rounded-2xl border border-slate-200/90">
            {diasSemana.map((dia) => {
              const seleccionado = dia.iso === fechaSeleccionada;
              return (
                <button
                  key={dia.iso}
                  onClick={() => setFechaSeleccionada(dia.iso)}
                  className={`flex flex-col items-center py-2.5 rounded-xl transition-all relative ${
                    seleccionado
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'hover:bg-white text-slate-600'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold">
                    {dia.diaCorto}
                  </span>
                  <span className="text-sm font-black mt-0.5">
                    {dia.numero}
                  </span>

                  {/* Icono de fuego si hubo entrenamiento */}
                  <div className="mt-1 h-3.5 flex items-center justify-center">
                    {dia.tieneEntrenamiento ? (
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    ) : (
                      <div className={`w-1 h-1 rounded-full ${seleccionado ? 'bg-slate-400' : 'bg-slate-200'}`} />
                    )}
                  </div>

                  {dia.esHoy && (
                    <span className="absolute -top-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día seleccionado */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-5 space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>
                {infoDiaSeleccionado.diaLargo}, {infoDiaSeleccionado.numero} de {infoDiaSeleccionado.mes}
              </span>
            </span>

            <span className="text-slate-500 font-medium">
              {infoDiaSeleccionado.sesiones.length}{' '}
              {infoDiaSeleccionado.sesiones.length === 1 ? 'sesión' : 'sesiones'}
            </span>
          </div>

          {infoDiaSeleccionado.sesiones.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Sin registros de estudio en este día
              </p>
              <p className="text-[11px] text-slate-500">
                Completa una sesión de preguntas de cualquier tema o del repaso SRS para registrar tu avance.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {infoDiaSeleccionado.sesiones.map((ses, idx) => {
                const total = ses.preguntas_respondidas || 1;
                const porcentaje = Math.round(((ses.aciertos + (ses.dudas || 0)) / total) * 100);
                const hora = ses.created_at
                  ? new Date(ses.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {ses.tipo_sesion === 'tema' ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                        ) : ses.tipo_sesion === 'fallos' ? (
                          <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
                            <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {ses.titulo_sesion}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {hora && `${hora} · `}{ses.preguntas_respondidas} preguntas
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                          porcentaje >= 80
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : porcentaje >= 50
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {porcentaje}% acierto
                      </span>
                    </div>

                    {/* Desglose de aciertos, dudas y fallos */}
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {ses.aciertos} seguros
                      </span>
                      {typeof ses.dudas === 'number' && ses.dudas > 0 && (
                        <span className="flex items-center gap-1 text-amber-700 font-semibold">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          {ses.dudas} con duda
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-rose-700 font-semibold">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        {ses.fallos} fallos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
