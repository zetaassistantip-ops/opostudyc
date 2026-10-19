'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Zap,
  Skull,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Search,
  BookOpen,
  Crown,
  Check,
  RotateCcw,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Tema, Pregunta, EstadisticasGlobales, SesionEstudio } from '@/lib/types';
import {
  getTemas,
  getPreguntas,
  getHistorialSesiones,
  calcularRachaDias,
  resetearProgresoTema,
} from '@/lib/supabase';
import {
  esPreguntaVista,
  esFalloActivo,
  esPreguntaAcertada,
  calcularMetricasPreguntas,
} from '@/lib/srs';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import RachaDiarioModal from '@/components/RachaDiarioModal';
import BotonInstalarApp from '@/components/BotonInstalarApp';
import ModalSimulacroConfig from '@/components/ModalSimulacroConfig';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPrincipal() {
  const { user, esAdmin } = useAuth();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [modalRachaAbierto, setModalRachaAbierto] = useState(false);
  const [modalSimulacroAbierto, setModalSimulacroAbierto] = useState(false);
  const [temaSeleccionadoParaTest, setTemaSeleccionadoParaTest] = useState<number | null>(null);
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState<string>('');

  // Estado para modal de resetear tema
  const [temaAResetear, setTemaAResetear] = useState<Tema | null>(null);
  const [reseteandoTema, setReseteandoTema] = useState(false);

  const [stats, setStats] = useState<EstadisticasGlobales>({
    totalPreguntas: 0,
    enLlamasHoy: 0,
    dominadas: 0,
    asentadas: 0,
    enObservacion: 0,
    nuevas: 0,
    porcentajeDominio: 0,
    rachaDias: 0,
    falladasHistoricas: 0,
    preguntasVistas: 0,
    acertadas: 0,
    falladasActivas: 0,
    porcentajeRetencionReal: 0,
    temasExplorados: 0,
    totalTemas: 35,
    porcentajeCoberturaTemas: 0,
    porcentajeCoberturaPreguntas: 0,
  });

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [listaTemas, listaPreguntas, listaSesiones] = await Promise.all([
          getTemas(),
          getPreguntas(),
          getHistorialSesiones(),
        ]);
        setTemas(listaTemas);
        setPreguntas(listaPreguntas);
        setSesiones(listaSesiones);

        // Cálculo de métricas
        const ahora = Date.now();
        let enLlamas = 0;
        let dominadas = 0;
        let asentadas = 0;
        let enObservacion = 0;
        let nuevas = 0;
        let falladasHistoricas = 0;
        let vistas = 0;
        let acertadas = 0;
        let falladasActivas = 0;

        listaPreguntas.forEach((p) => {
          const esVista = esPreguntaVista(p);
          if (esVista) {
            vistas++;
            if (esPreguntaAcertada(p)) {
              acertadas++;
            } else if (esFalloActivo(p)) {
              falladasActivas++;
            }
          } else {
            nuevas++;
          }

          if ((p.fallos_totales ?? 0) > 0) falladasHistoricas++;

          if (esVista && new Date(p.proxima_revision).getTime() <= ahora) {
            enLlamas++;
          }

          if ((p.caja_leitner ?? 0) >= 4) {
            dominadas++;
          } else if ((p.caja_leitner ?? 0) >= 2) {
            asentadas++;
          } else if ((p.caja_leitner ?? 0) === 1) {
            enObservacion++;
          }
        });

        const total = listaPreguntas.length || 0;
        // Retención real estrictamente calculada: acertadas / vistas
        const porcentajeRetencionReal = vistas > 0
          ? Math.round((acertadas / vistas) * 100)
          : 0;

        // Temas explorados (con al menos 1 pregunta vista)
        const temasConVistas = listaTemas.filter((t) =>
          listaPreguntas.some((p) => p.tema_id === t.id && esPreguntaVista(p))
        ).length;

        const totalTemasNum = listaTemas.length || 35;
        const porcentajeCoberturaTemas = Math.round((temasConVistas / totalTemasNum) * 100);
        const porcentajeCoberturaPreguntas = total > 0 ? Math.round((vistas / total) * 100) : 0;
        const rachaReal = calcularRachaDias(listaSesiones);

        setStats({
          totalPreguntas: listaPreguntas.length,
          enLlamasHoy: enLlamas,
          dominadas,
          asentadas,
          enObservacion,
          nuevas,
          porcentajeDominio: porcentajeRetencionReal,
          rachaDias: rachaReal,
          falladasHistoricas,
          preguntasVistas: vistas,
          acertadas,
          falladasActivas,
          porcentajeRetencionReal,
          temasExplorados: temasConVistas,
          totalTemas: totalTemasNum,
          porcentajeCoberturaTemas,
          porcentajeCoberturaPreguntas,
        });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [user]);

  // Progreso por tema: Retención calculada estrictamente sobre las vistas del tema
  const estadisticasPorTema = useMemo(() => {
    const map = new Map<
      number,
      {
        total: number;
        vistas: number;
        acertadas: number;
        falladasActivas: number;
        porcentajeRetencion: number;
      }
    >();

    temas.forEach((t) => {
      const pregsDelTema = preguntas.filter((p) => p.tema_id === t.id);
      const metrics = calcularMetricasPreguntas(pregsDelTema);
      map.set(t.id, {
        total: metrics.total,
        vistas: metrics.vistas,
        acertadas: metrics.acertadas,
        falladasActivas: metrics.falladasActivas,
        porcentajeRetencion: metrics.porcentajeRetencion,
      });
    });

    return map;
  }, [temas, preguntas]);

  // Función para resetear estadísticas de un tema
  const handleConfirmarResetTema = async () => {
    if (!temaAResetear) return;
    setReseteandoTema(true);
    try {
      const pregsDelTema = preguntas.filter((p) => p.tema_id === temaAResetear.id);
      const ids = pregsDelTema.map((p) => p.id);
      await resetearProgresoTema(temaAResetear.id, ids);

      // Actualizar preguntas locales
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
      setPreguntas(preguntasActualizadas);
      setSesiones((prev) => prev.filter((s) => s.tema_id !== temaAResetear.id));

      // Recalcular métricas
      const ahora = Date.now();
      let enLlamas = 0;
      let dominadas = 0;
      let asentadas = 0;
      let enObservacion = 0;
      let nuevas = 0;
      let falladasHistoricas = 0;
      let vistas = 0;
      let acertadas = 0;
      let falladasActivas = 0;

      preguntasActualizadas.forEach((p) => {
        const esVista = esPreguntaVista(p);
        if (esVista) {
          vistas++;
          if (esPreguntaAcertada(p)) acertadas++;
          else if (esFalloActivo(p)) falladasActivas++;
        } else {
          nuevas++;
        }
        if ((p.fallos_totales ?? 0) > 0) falladasHistoricas++;
        if (esVista && new Date(p.proxima_revision).getTime() <= ahora) enLlamas++;
        if ((p.caja_leitner ?? 0) >= 4) dominadas++;
        else if ((p.caja_leitner ?? 0) >= 2) asentadas++;
        else if ((p.caja_leitner ?? 0) === 1) enObservacion++;
      });

      const total = preguntasActualizadas.length || 0;
      const porcentajeRetencionReal = vistas > 0 ? Math.round((acertadas / vistas) * 100) : 0;
      const temasConVistas = temas.filter((t) =>
        preguntasActualizadas.some((p) => p.tema_id === t.id && esPreguntaVista(p))
      ).length;
      const totalTemasNum = temas.length || 35;

      setStats((prev) => ({
        ...prev,
        enLlamasHoy: enLlamas,
        dominadas,
        asentadas,
        enObservacion,
        nuevas,
        porcentajeDominio: porcentajeRetencionReal,
        falladasHistoricas,
        preguntasVistas: vistas,
        acertadas,
        falladasActivas,
        porcentajeRetencionReal,
        temasExplorados: temasConVistas,
        porcentajeCoberturaTemas: Math.round((temasConVistas / totalTemasNum) * 100),
        porcentajeCoberturaPreguntas: total > 0 ? Math.round((vistas / total) * 100) : 0,
      }));

      setTemaAResetear(null);
    } catch (err) {
      console.error('Error reseteando tema:', err);
    } finally {
      setReseteandoTema(false);
    }
  };

  // Filtrado de temas por buscador
  const temasFiltrados = useMemo(() => {
    return temas.filter((t) => {
      return (
        busqueda === '' ||
        t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.id.toString() === busqueda.trim()
      );
    });
  }, [temas, busqueda]);

  // Toggle de selección de tema tocando el número
  const handleToggleTemaSeleccionado = (id: number) => {
    setTemasSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  // Botón rápido marcar todos / limpiar
  const handleMarcarTodosOLimpiar = () => {
    if (temasSeleccionados.length === temas.length) {
      setTemasSeleccionados([]);
    } else {
      setTemasSeleccionados(temas.map((t) => t.id));
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-28 px-4 pt-3 space-y-4 animate-fadeIn relative">
      {/* 1. CABECERA EDITORIAL CLEAN */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="OpostudyC Logo"
            className="w-10 h-10 rounded-xl object-contain bg-[#182029] p-0.5 border border-slate-200/90 shadow-xs"
          />
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center">
              <span>Opostudy</span>
              <span className="text-[#6c8e9f]">C</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              35 Temas · Bomberos CAM
            </p>
          </div>
        </div>

        {/* Acciones de usuario: Admin (SOLO SI ES ADMIN), instalar y racha */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BotonInstalarApp />
          {esAdmin && (
            <Link
              href="/admin"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-50 hover:bg-amber-100 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-amber-950 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Panel de Superadministrador"
            >
              <Crown className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline font-mono text-[11px]">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setModalRachaAbierto(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100/90 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 text-xs font-mono font-bold transition-all cursor-pointer"
            title="Ver diario y racha de estudio"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{stats.rachaDias} días</span>
          </button>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. PANEL DE PROGRESO Y RETENCIÓN REAL SOBRE PREGUNTAS VISTAS */}
      <section className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              Retención Real (Sobre lo Estudiado)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                {stats.preguntasVistas > 0 ? `${stats.porcentajeRetencionReal}%` : '0%'}
              </span>
              <span className="text-xs font-mono text-slate-500 font-medium">
                {stats.preguntasVistas > 0
                  ? `(${stats.acertadas} superadas de ${stats.preguntasVistas} vistas)`
                  : 'Sin preguntas vistas aún'}
              </span>
            </div>
          </div>

          {/* Badge de repaso programado */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-slate-900 text-red-700 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              <span>{stats.enLlamasHoy} para repasar</span>
            </div>
            <span className="block text-[10px] text-slate-500 font-mono mt-1">Repaso espaciado</span>
          </div>
        </div>

        {/* Métrica de Cobertura Global de la Oposición */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-700">
              Temas explorados: <strong className="text-slate-950 font-bold">{stats.temasExplorados} de {stats.totalTemas}</strong> ({stats.porcentajeCoberturaTemas}%)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {stats.preguntasVistas}/{stats.totalPreguntas} preguntas vistas
          </span>
        </div>

        {/* Barra de progreso global sobre vistas */}
        <div className="w-full h-2.5 bg-slate-100 rounded-lg overflow-hidden border border-slate-900 flex">
          <div
            title="Dominadas (Caja 4-5)"
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(stats.dominadas / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="Asentadas (Caja 2-3)"
            className="bg-sky-500 h-full transition-all duration-500"
            style={{ width: `${(stats.asentadas / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="En Observación (Caja 1)"
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${(stats.enObservacion / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="Nuevas / Pendientes"
            className="bg-slate-200 h-full transition-all duration-500"
            style={{ width: `${(stats.nuevas / (stats.totalPreguntas || 1)) * 100}%` }}
          />
        </div>

        {/* Mini leyenda limpia */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-emerald-500 border border-slate-900" /> Dominadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-sky-500 border border-slate-900" /> Asentadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-400 border border-slate-900" /> En repaso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-slate-200 border border-slate-900" /> Inéditas
          </span>
        </div>
      </section>

      {/* 3. BOTÓN DE ACCIÓN RÁPIDA: REPASO DEL DÍA (Neo-Brutalist Red Hard Shadow) */}
      <Link
        href="/jugar?modo=repaso"
        className="w-full p-4 rounded-xl bg-slate-950 hover:bg-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-between text-white group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-red-600 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Flame className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
              Entrenamiento Diario
            </div>
            <div className="text-base font-bold tracking-tight text-white">
              Sesión de Repaso SRS
            </div>
            <div className="text-xs text-slate-300 font-normal">
              Consolida en la curva del olvido tus preguntas pendientes
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-white transition-all flex-shrink-0" />
      </Link>

      {/* 4. MODOS COMPLEMENTARIOS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Cazador de Fallos */}
        <Link
          href="/jugar?modo=fallos"
          className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:border-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col justify-between space-y-2.5 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-slate-900">
              <Skull className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-900">
              {stats.falladasActivas} dudas / fallos
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">
              Refuerzo de Fallos
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
              Práctica específica con preguntas erradas previamente.
            </p>
          </div>
        </Link>

        {/* Fichas Técnicas Clave */}
        <Link
          href="/fichas"
          className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] hover:border-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col justify-between space-y-2.5 group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-slate-900">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-900">
              Fichas clave
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Fichas Técnicas
            </h3>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
              Cifras exactas, tablas comparativas y normas UNE.
            </p>
          </div>
        </Link>
      </div>

      {/* 5. MAPA DE LOS 35 TEMAS OFICIALES CON SELECCIÓN INTERACTIVA */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Temario Oficial
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarcarTodosOLimpiar}
              className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-900 text-slate-800 transition-all cursor-pointer"
            >
              {temasSeleccionados.length === temas.length ? 'Limpiar' : 'Marcar todos'}
            </button>
            <span className="text-xs text-slate-900 font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-900">
              {temasFiltrados.length} / 35
            </span>
          </div>
        </div>

        {/* Buscador táctico rápido */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar tema (ej. Hidráulica, PLATERCAM, CTE, Gas)..."
            className="w-full bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-all font-medium"
          />
        </div>

        {/* Lista de temas interactiva */}
        <div className="space-y-2">
          {temasFiltrados.map((tema) => {
            const dataTema = estadisticasPorTema.get(tema.id) || {
              total: 0,
              vistas: 0,
              acertadas: 0,
              falladasActivas: 0,
              porcentajeRetencion: 0,
            };
            const estaMarcado = temasSeleccionados.includes(tema.id);

            return (
              <div
                key={tema.id}
                className={`p-3.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center justify-between gap-3 ${
                  estaMarcado ? 'bg-amber-50/70 border-slate-950' : 'bg-white'
                }`}
              >
                {/* Cuadro del Número del Tema: Tocar para Marcar/Desmarcar */}
                <button
                  type="button"
                  onClick={() => handleToggleTemaSeleccionado(tema.id)}
                  className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono border-2 border-slate-900 transition-all cursor-pointer select-none active:scale-95 ${
                    estaMarcado
                      ? 'bg-emerald-500 text-white shadow-[1px_1px_0px_0px_#0f172a]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                  title={estaMarcado ? `Desmarcar Tema ${tema.id}` : `Marcar Tema ${tema.id}`}
                >
                  {estaMarcado ? <Check className="w-4 h-4 stroke-[3]" /> : tema.id}
                </button>

                {/* Título y barra de retención real */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold text-slate-600 truncate pr-1">
                      {tema.bloque}
                    </span>
                    {dataTema.vistas === 0 ? (
                      <span className="font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Sin estrenar (0 vistas)
                      </span>
                    ) : (
                      <span className="font-mono text-emerald-700 font-bold">
                        {dataTema.porcentajeRetencion}% retención ({dataTema.acertadas}/{dataTema.vistas})
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 truncate leading-snug">
                    {tema.titulo}
                  </h3>

                  {/* Micro barra de retención sobre vistas */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-900/30">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        dataTema.vistas === 0 ? 'bg-slate-200' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dataTema.porcentajeRetencion}%` }}
                    />
                  </div>
                </div>

                {/* Acciones del tema: Resetear (si tiene vistas) y Configurar Test */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {dataTema.vistas > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemaAResetear(tema);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer"
                      title={`Resetear estadísticas del Tema ${tema.id}`}
                      aria-label={`Resetear estadísticas del Tema ${tema.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setTemaSeleccionadoParaTest(tema.id);
                      setModalSimulacroAbierto(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-slate-900 text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title={`Configurar Test Tema ${tema.id}`}
                  >
                    <span>Test</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BANNER BANCO COMPARTIDO SRS */}
      <section className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] text-xs flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-slate-900 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">Banco Compartido Autónomo</span>
            <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
              Al entrar a cada tema, el Tribunal IA amplía las preguntas automáticamente en la nube sin duplicados. Tu progreso SRS se guarda de forma privada e individual.
            </span>
          </div>
        </div>
      </section>

      {/* BOTÓN FLOTANTE (FAB) CUANDO HAY 1 O MÁS TEMAS MARCADOS */}
      {temasSeleccionados.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-18 left-0 right-0 z-40 px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setTemaSeleccionadoParaTest(null);
                setModalSimulacroAbierto(true);
              }}
              className="w-full py-3.5 px-5 bg-slate-950 hover:bg-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-white font-extrabold text-sm sm:text-base rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-between transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Configurar Test ({temasSeleccionados.length} {temasSeleccionados.length === 1 ? 'tema' : 'temas'})</span>
              </span>
              <ChevronRight className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

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
                  <strong className="text-slate-900">{estadisticasPorTema.get(temaAResetear.id)?.vistas || 0} preguntas vistas</strong>, aciertos y fallos de este tema para empezar desde cero.
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
                    <span>Sí, borrar tema</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de navegación inferior fija para mobile */}
      <BottomNav badgeRepaso={stats.enLlamasHoy} />

      {/* Modal / Drawer Diario de Racha */}
      <RachaDiarioModal
        abierto={modalRachaAbierto}
        onCerrar={() => setModalRachaAbierto(false)}
        rachaDias={stats.rachaDias}
        sesiones={sesiones}
      />

      {/* Pantalla Completa de Configuración de Test */}
      <ModalSimulacroConfig
        abierto={modalSimulacroAbierto}
        onCerrar={() => {
          setModalSimulacroAbierto(false);
          setTemaSeleccionadoParaTest(null);
        }}
        temas={temas}
        preguntas={preguntas}
        temaInicial={temaSeleccionadoParaTest}
        temasIniciales={temasSeleccionados}
      />
    </div>
  );
}
