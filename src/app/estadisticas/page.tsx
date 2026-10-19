'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Award,
  Zap,
  Flame,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Target,
  CheckCircle2,
  XCircle,
  Sparkles,
  BarChart3,
  Calendar,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Tema, Pregunta, FichaTecnica, SesionEstudio } from '@/lib/types';
import {
  getTemas,
  getPreguntas,
  getFichasTecnicas,
  getHistorialSesiones,
  calcularRachaDias,
  resetearProgresoTema,
  resetearProgresoGlobal,
} from '@/lib/supabase';
import {
  esPreguntaVista,
  esFalloActivo,
  esPreguntaAcertada,
  calcularMetricasPreguntas,
} from '@/lib/srs';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import { useAuth } from '@/context/AuthContext';

function computarMetricasGlobales(
  listaTemas: Tema[],
  listaPreguntas: Pregunta[],
  listaFichas: FichaTecnica[],
  listaSesiones: SesionEstudio[]
) {
  const totalPreguntas = listaPreguntas.length;
  const vistasPreguntas = listaPreguntas.filter(esPreguntaVista);
  const totalVistas = vistasPreguntas.length;
  const acertadas = vistasPreguntas.filter(esPreguntaAcertada).length;
  const falladasActivas = totalVistas - acertadas;

  const dominadas = vistasPreguntas.filter((p) => (p.caja_leitner ?? 0) >= 4).length;
  const asentadas = vistasPreguntas.filter(
    (p) => (p.caja_leitner ?? 0) >= 2 && (p.caja_leitner ?? 0) < 4
  ).length;
  const enRevision = vistasPreguntas.filter((p) => (p.caja_leitner ?? 0) <= 1).length;

  // Retención real sobre preguntas vistas: acertadas / vistas
  const porcentajeRetencion = totalVistas > 0
    ? Math.round((acertadas / totalVistas) * 100)
    : 0;

  // Temas explorados
  const temasExploradosIds = new Set(vistasPreguntas.map((p) => p.tema_id));
  const temasExploradosCount = temasExploradosIds.size;
  const porcentajeCoberturaTemas = listaTemas.length > 0
    ? Math.round((temasExploradosCount / listaTemas.length) * 100)
    : 0;
  const porcentajeCoberturaPreguntas = totalPreguntas > 0
    ? Math.round((totalVistas / totalPreguntas) * 100)
    : 0;

  // Fichas Anki
  const totalFichas = listaFichas.length;
  const fichasVistas = listaFichas.filter(
    (f) => f.usuarioSRS && (f.usuarioSRS.repeticiones > 0 || f.usuarioSRS.ultima_revision)
  );
  const totalFichasVistas = fichasVistas.length;
  const fichasDominadas = fichasVistas.filter(
    (f) => f.usuarioSRS && f.usuarioSRS.intervalo_dias >= 7
  ).length;
  const ahora = Date.now();
  const fichasPendientesHoy = listaFichas.filter(
    (f) =>
      f.usuarioSRS &&
      new Date(f.usuarioSRS.proximo_repaso).getTime() <= ahora
  ).length;

  const rachaDias = calcularRachaDias(listaSesiones);

  return {
    totalPreguntas,
    totalVistas,
    acertadas,
    falladasActivas,
    dominadas,
    asentadas,
    enRevision,
    porcentajeRetencion,
    temasExploradosCount,
    porcentajeCoberturaTemas,
    porcentajeCoberturaPreguntas,
    totalFichas,
    totalFichasVistas,
    fichasDominadas,
    fichasPendientesHoy,
    rachaDias,
  };
}

export default function EstadisticasPage() {
  const { user } = useAuth();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroVistaTemas, setFiltroVistaTemas] = useState<'explorados' | 'todos'>('explorados');

  // Estados para modales de reset
  const [temaAResetear, setTemaAResetear] = useState<Tema | null>(null);
  const [reseteandoTema, setReseteandoTema] = useState(false);
  const [modalResetGlobalAbierto, setModalResetGlobalAbierto] = useState(false);
  const [reseteandoGlobal, setReseteandoGlobal] = useState(false);

  const [metricasGlobales, setMetricasGlobales] = useState({
    totalPreguntas: 0,
    totalVistas: 0,
    acertadas: 0,
    falladasActivas: 0,
    dominadas: 0,
    asentadas: 0,
    enRevision: 0,
    porcentajeRetencion: 0,
    temasExploradosCount: 0,
    porcentajeCoberturaTemas: 0,
    porcentajeCoberturaPreguntas: 0,
    totalFichas: 0,
    totalFichasVistas: 0,
    fichasDominadas: 0,
    fichasPendientesHoy: 0,
    rachaDias: 0,
  });

  useEffect(() => {
    async function cargarEstadisticas() {
      setCargando(true);
      try {
        const [listaTemas, listaPreguntas, listaFichas, listaSesiones] = await Promise.all([
          getTemas(),
          getPreguntas(),
          getFichasTecnicas(),
          getHistorialSesiones(),
        ]);
        setTemas(listaTemas);
        setPreguntas(listaPreguntas);
        setFichas(listaFichas);
        setSesiones(listaSesiones);

        setMetricasGlobales(
          computarMetricasGlobales(listaTemas, listaPreguntas, listaFichas, listaSesiones)
        );
      } catch (e) {
        console.error('Error cargando estadísticas:', e);
      } finally {
        setCargando(false);
      }
    }

    cargarEstadisticas();
  }, [user]);

  // Handler para resetear un tema
  const handleConfirmarResetTema = async () => {
    if (!temaAResetear) return;
    setReseteandoTema(true);
    try {
      const pregsDelTema = preguntas.filter((p) => p.tema_id === temaAResetear.id);
      const ids = pregsDelTema.map((p) => p.id);
      await resetearProgresoTema(temaAResetear.id, ids);

      const preguntasActualizadas = preguntas.map((p) => {
        if (p.tema_id === temaAResetear.id) {
          return {
            ...p,
            caja_leitner: 0,
            proxima_revision: new Date().toISOString(),
            fallos_totales: 0,
            aciertos_consecutivos: 0,
            ultima_vez_vista: null,
          };
        }
        return p;
      });
      const sesionesActualizadas = sesiones.filter((s) => s.tema_id !== temaAResetear.id);

      setPreguntas(preguntasActualizadas);
      setSesiones(sesionesActualizadas);
      setMetricasGlobales(
        computarMetricasGlobales(temas, preguntasActualizadas, fichas, sesionesActualizadas)
      );
      setTemaAResetear(null);
    } catch (err) {
      console.error('Error reseteando tema:', err);
    } finally {
      setReseteandoTema(false);
    }
  };

  // Handler para resetear globalmente
  const handleConfirmarResetGlobal = async () => {
    setReseteandoGlobal(true);
    try {
      await resetearProgresoGlobal();

      const preguntasActualizadas = preguntas.map((p) => ({
        ...p,
        caja_leitner: 0,
        proxima_revision: new Date().toISOString(),
        fallos_totales: 0,
        aciertos_consecutivos: 0,
        ultima_vez_vista: null,
      }));
      const sesionesActualizadas: SesionEstudio[] = [];

      setPreguntas(preguntasActualizadas);
      setSesiones(sesionesActualizadas);
      setMetricasGlobales(
        computarMetricasGlobales(temas, preguntasActualizadas, fichas, sesionesActualizadas)
      );
      setModalResetGlobalAbierto(false);
    } catch (err) {
      console.error('Error reseteando todo el progreso:', err);
    } finally {
      setReseteandoGlobal(false);
    }
  };

  // Desglose por tema
  const desgloseTemas = useMemo(() => {
    return temas.map((t) => {
      const pregs = preguntas.filter((p) => p.tema_id === t.id);
      const metrics = calcularMetricasPreguntas(pregs);

      return {
        tema: t,
        total: metrics.total,
        vistas: metrics.vistas,
        acertadas: metrics.acertadas,
        falladas: metrics.falladasActivas,
        pctAciertos: metrics.porcentajeRetencion,
        pctFallos: metrics.porcentajeFallos,
        pctRetencion: metrics.porcentajeRetencion,
        explorado: metrics.vistas > 0,
      };
    });
  }, [temas, preguntas]);

  // Tema más flojo (con más fallos activos entre los explorados)
  const temaMasFlojo = useMemo(() => {
    const explorados = desgloseTemas.filter((d) => d.explorado && d.falladas > 0);
    if (explorados.length === 0) return null;

    // Ordenar por número de falladas descendente y menor retención
    return [...explorados].sort((a, b) => {
      if (b.falladas !== a.falladas) return b.falladas - a.falladas;
      return a.pctRetencion - b.pctRetencion;
    })[0];
  }, [desgloseTemas]);

  const temasMostrados = useMemo(() => {
    if (filtroVistaTemas === 'explorados') {
      return desgloseTemas.filter((d) => d.explorado);
    }
    return desgloseTemas;
  }, [desgloseTemas, filtroVistaTemas]);

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-28 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. CABECERA */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-900 transition-colors cursor-pointer shadow-xs"
            aria-label="Volver al temario"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <span>📊 Estadísticas Reales</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Retención sobre lo estudiado y cobertura
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border-2 border-slate-900 text-slate-900 text-xs font-mono font-bold shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{metricasGlobales.rachaDias}d racha</span>
          </div>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. TARJETA PRINCIPAL: RETENCIÓN REAL VS COBERTURA DE LA OPOSICIÓN */}
      <section className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Retención Real (Sobre Vistas)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">
                {metricasGlobales.porcentajeRetencion}%
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({metricasGlobales.acertadas} superadas de {metricasGlobales.totalVistas} preguntas vistas)
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
              Cobertura Temas
            </span>
            <span className="text-2xl font-black font-mono text-slate-900">
              {metricasGlobales.temasExploradosCount} / 35
            </span>
            <span className="block text-[10px] font-mono text-slate-500 font-bold">
              ({metricasGlobales.porcentajeCoberturaTemas}% oposición)
            </span>
          </div>
        </div>

        {/* Cobertura del banco de preguntas */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <span>Cobertura del Banco de Preguntas</span>
            <span className="font-mono font-bold">
              {metricasGlobales.totalVistas} de {metricasGlobales.totalPreguntas} ({metricasGlobales.porcentajeCoberturaPreguntas}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-900/40">
            <div
              className="h-full bg-slate-900 transition-all duration-500 rounded-full"
              style={{ width: `${metricasGlobales.porcentajeCoberturaPreguntas}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. ALERTA DE TEMA MÁS FLOJO (CON BOTÓN DIRECTO DE ATAQUE A FALLOS) */}
      {temaMasFlojo && (
        <section className="p-4 rounded-xl bg-rose-50 border-2 border-slate-900 shadow-[3px_3px_0px_0px_#b91c1c] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 fill-rose-100" />
              <span>Prioridad Máxima: Tu Tema Más Flojo</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-950 font-mono font-bold text-[11px] border border-rose-400">
              {temaMasFlojo.falladas} fallos / dudas
            </span>
          </div>

          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-950 leading-tight">
              Tema {temaMasFlojo.tema.id}: {temaMasFlojo.tema.titulo}
            </h3>
            <p className="text-[11px] text-slate-700 font-medium">
              Solo un {temaMasFlojo.pctAciertos}% de aciertos en {temaMasFlojo.vistas} preguntas intentadas.
            </p>
          </div>

          <Link
            href={`/jugar?modo=tema&temaId=${temaMasFlojo.tema.id}&filtro=falladas&limite=20`}
            className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 active:translate-x-[1px] active:translate-y-[1px] text-white font-extrabold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎯 Atacar fallos del Tema {temaMasFlojo.tema.id} ahora</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* 4. ESTADÍSTICAS DE FICHAS ANKI */}
      <section className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Mazo de Fichas Anki SM-2
            </h2>
          </div>
          <Link
            href="/fichas"
            className="text-[11px] font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1"
          >
            <span>Ir al mazo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-lg font-black font-mono text-slate-900 block">
              {metricasGlobales.totalFichasVistas}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              Fichas vistas ({metricasGlobales.totalFichas} tot.)
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="text-lg font-black font-mono text-emerald-800 block">
              {metricasGlobales.fichasDominadas}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium block">
              Dominadas (7+ días)
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-lg font-black font-mono text-amber-800 block">
              {metricasGlobales.fichasPendientesHoy}
            </span>
            <span className="text-[10px] text-amber-700 font-medium block">
              Pendientes hoy
            </span>
          </div>
        </div>
      </section>

      {/* 5. DESGLOSE POR CADA TEMA ESTUDIADO */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-900" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Rendimiento por Tema
            </h2>
          </div>

          <div className="flex rounded-lg border border-slate-900 overflow-hidden bg-slate-100 text-[10px] font-bold font-mono">
            <button
              onClick={() => setFiltroVistaTemas('explorados')}
              className={`px-2 py-1 transition-all ${
                filtroVistaTemas === 'explorados'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Estudiados ({desgloseTemas.filter((d) => d.explorado).length})
            </button>
            <button
              onClick={() => setFiltroVistaTemas('todos')}
              className={`px-2 py-1 transition-all ${
                filtroVistaTemas === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos (35)
            </button>
          </div>
        </div>

        {temasMostrados.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border-2 border-slate-900 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              Aún no has iniciado tests en ningún tema.
            </p>
            <p className="text-[11px] text-slate-500">
              Selecciona temas en el Temario Principal para ver tu desglose de aciertos y fallos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {temasMostrados.map(({ tema, total, vistas, acertadas, falladas, pctAciertos, pctFallos, explorado }) => (
              <div
                key={tema.id}
                className="p-3 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-900 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {tema.id}
                    </span>
                    <span className="text-xs font-bold text-slate-950 truncate">
                      {tema.titulo}
                    </span>
                  </div>

                  {explorado ? (
                    <span className="font-mono text-[11px] font-bold text-slate-700 flex-shrink-0">
                      {vistas} vistas
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 font-medium flex-shrink-0">
                      Sin estrenar
                    </span>
                  )}
                </div>

                {explorado && (
                  <>
                    {/* Barra Bicolor Verde (Aciertos) / Roja (Fallos) */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-900/30 flex">
                        <div
                          title={`Aciertos: ${pctAciertos}%`}
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${pctAciertos}%` }}
                        />
                        <div
                          title={`Fallos activos: ${pctFallos}%`}
                          className="bg-rose-500 h-full transition-all"
                          style={{ width: `${pctFallos}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                        <span className="text-emerald-700">
                          🟢 {pctAciertos}% aciertos ({acertadas})
                        </span>
                        {falladas > 0 ? (
                          <span className="text-rose-700">
                            🔴 {pctFallos}% fallos activos ({falladas})
                          </span>
                        ) : (
                          <span className="text-emerald-700">
                            ✨ 0 fallos pendientes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción del tema */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setTemaAResetear(tema)}
                        className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title={`Resetear estadísticas del Tema ${tema.id}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resetear tema</span>
                      </button>

                      {falladas > 0 ? (
                        <Link
                          href={`/jugar?modo=tema&temaId=${tema.id}&filtro=falladas&limite=15`}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-900 border border-rose-300 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Repasar {falladas} fallos</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Todo al día</span>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. ZONA DE RESET GLOBAL */}
      <section className="p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-2 mt-4">
        <p className="text-xs text-slate-500 font-medium">
          ¿Quieres comenzar de nuevo tu preparación desde el principio?
        </p>
        <button
          type="button"
          onClick={() => setModalResetGlobalAbierto(true)}
          className="px-3 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border-2 border-slate-300 hover:border-rose-400 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>🗑️ Resetear todo mi historial de todos los temas</span>
        </button>
      </section>

      {/* MODAL DE CONFIRMACIÓN: RESETEAR TEMA */}
      {temaAResetear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border-2 border-slate-900 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  ¿Resetear estadísticas del Tema {temaAResetear.id}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  ¿Estás seguro de que quieres borrar todos tus datos recopilados para{' '}
                  <strong className="text-slate-900 font-bold">{temaAResetear.titulo}</strong>? Se eliminará tu historial de{' '}
                  <strong className="text-slate-900">
                    {desgloseTemas.find((d) => d.tema.id === temaAResetear.id)?.vistas || 0} preguntas vistas
                  </strong>, aciertos y fallos de este tema para empezar desde cero.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={reseteandoTema}
                onClick={() => setTemaAResetear(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-800 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reseteandoTema}
                onClick={handleConfirmarResetTema}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {reseteandoTema ? (
                  <span>Borrando...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, borrar datos del tema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN: RESETEAR HISTORIAL GLOBAL */}
      {modalResetGlobalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl border-3 border-slate-900 shadow-[6px_6px_0px_0px_#0f172a] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 border-2 border-slate-900 text-white flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-rose-700 tracking-tight leading-tight">
                  🚨 ¿Borrar TODO tu historial y estadísticas?
                </h3>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  Esta acción es <strong>IRREVERSIBLE</strong>. Se borrarán todas las preguntas vistas, aciertos, fallos y sesiones de estudio de los <strong>35 temas</strong>. Tu cuenta quedará totalmente a cero.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={reseteandoGlobal}
                onClick={() => setModalResetGlobalAbierto(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 text-slate-800 text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={reseteandoGlobal}
                onClick={handleConfirmarResetGlobal}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {reseteandoGlobal ? (
                  <span>Borrando cuenta...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, resetear todo a cero</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior */}
      <BottomNav />
    </div>
  );
}
