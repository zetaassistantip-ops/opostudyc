'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Zap,
  Skull,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  Search,
  BookOpen,
  Filter,
  Target,
} from 'lucide-react';
import { Tema, Pregunta, EstadisticasGlobales, SesionEstudio } from '@/lib/types';
import { getTemas, getPreguntas, getHistorialSesiones, calcularRachaDias } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import RachaDiarioModal from '@/components/RachaDiarioModal';
import BotonInstalarApp from '@/components/BotonInstalarApp';
import ModalSimulacroConfig from '@/components/ModalSimulacroConfig';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPrincipal() {
  const { user } = useAuth();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [modalRachaAbierto, setModalRachaAbierto] = useState(false);
  const [modalSimulacroAbierto, setModalSimulacroAbierto] = useState(false);
  const [temaSeleccionadoParaTest, setTemaSeleccionadoParaTest] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState<string>('');

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

        listaPreguntas.forEach((p) => {
          if (p.fallos_totales > 0) falladasHistoricas++;

          if (p.ultima_vez_vista === null) {
            nuevas++;
          } else if (new Date(p.proxima_revision).getTime() <= ahora) {
            enLlamas++;
          }

          if (p.caja_leitner >= 4) {
            dominadas++;
          } else if (p.caja_leitner >= 2) {
            asentadas++;
          } else if (p.caja_leitner === 1) {
            enObservacion++;
          }
        });

        const total = listaPreguntas.length || 0;
        const porcentajeDominio = total > 0
          ? Math.round(((dominadas * 1.0 + asentadas * 0.6) / total) * 100)
          : 0;

        const rachaReal = calcularRachaDias(listaSesiones);

        setStats({
          totalPreguntas: listaPreguntas.length,
          enLlamasHoy: enLlamas,
          dominadas,
          asentadas,
          enObservacion,
          nuevas,
          porcentajeDominio,
          rachaDias: rachaReal,
          falladasHistoricas,
        });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [user]);

  // Progreso por tema (calculado según preguntas en cajas 3-5 vs 0-1)
  const estadisticasPorTema = useMemo(() => {
    const map = new Map<number, { total: number; dominadas: number; porcentaje: number }>();

    temas.forEach((t) => {
      const pregsDelTema = preguntas.filter((p) => p.tema_id === t.id);
      const total = pregsDelTema.length;
      const dominadas = pregsDelTema.filter((p) => p.caja_leitner >= 3).length;
      const porcentaje = total > 0 ? Math.round((dominadas / total) * 100) : 0;
      map.set(t.id, { total, dominadas, porcentaje });
    });

    return map;
  }, [temas, preguntas]);

  // Filtrado de temas por buscador de texto o número
  const temasFiltrados = useMemo(() => {
    return temas.filter((t) => {
      return (
        busqueda === '' ||
        t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.id.toString() === busqueda.trim()
      );
    });
  }, [temas, busqueda]);

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
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

        {/* Acciones de usuario, descargar app, admin y racha */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <BotonInstalarApp />
          <Link
            href="/admin"
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-100 hover:bg-slate-200 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="Panel de Administración y Moderación de Preguntas"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-slate-900" />
            <span className="hidden sm:inline font-mono text-[11px]">Admin</span>
          </Link>
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

      {/* 2. PANEL DE PROGRESO Y RETENCIÓN */}
      <section className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              Retención Global del Temario
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">
                {stats.porcentajeDominio}%
              </span>
              <span className="text-xs font-mono text-slate-500 font-medium">
                ({stats.dominadas + stats.asentadas} afianzadas de {stats.totalPreguntas})
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

        {/* Barra de progreso global */}
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
            title="Nuevas / Pendientes (Caja 0)"
            className="bg-slate-300 h-full transition-all duration-500"
            style={{ width: `${((stats.nuevas + stats.enLlamasHoy) / (stats.totalPreguntas || 1)) * 100}%` }}
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
            <span className="w-2 h-2 rounded-sm bg-slate-300 border border-slate-900" /> Nuevas
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
              15 preguntas para consolidar la memoria a largo plazo
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-white transition-all flex-shrink-0" />
      </Link>

      {/* 3.1 BOTÓN DESTACADO: TEST GENERAL / SIMULACRO */}
      <button
        type="button"
        onClick={() => {
          setTemaSeleccionadoParaTest(null);
          setModalSimulacroAbierto(true);
        }}
        className="w-full p-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-between text-white group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-violet-600 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Simulacro de Examen</span>
              <span className="px-1.5 py-0.2 rounded bg-violet-800/80 text-violet-200 text-[10px] font-mono">Multitema</span>
            </div>
            <div className="text-base font-bold tracking-tight text-white">
              🎯 Test General / Simulacro
            </div>
            <div className="text-xs text-slate-300 font-normal">
              Batería aleatoria global o combinando los temas que tú elijas
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-white transition-all flex-shrink-0" />
      </button>

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
              {stats.falladasHistoricas} dudas / fallos
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

        {/* Chuleta Express */}
        <Link
          href="/chuleta"
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
              Cifras exactas, plazos, presiones y normas UNE.
            </p>
          </div>
        </Link>
      </div>

      {/* 5. MAPA DE LOS 35 TEMAS OFICIALES */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-900" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Temario Oficial
            </h2>
          </div>
          <span className="text-xs text-slate-900 font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-900">
            {temasFiltrados.length} / 35 temas
          </span>
        </div>

        {/* Buscador táctico rápido (limpio sin píldoras de bloques) */}
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

        {/* Lista de temas */}
        <div className="space-y-2">
          {temasFiltrados.map((tema) => {
            const dataTema = estadisticasPorTema.get(tema.id) || { total: 0, dominadas: 0, porcentaje: 0 };
            return (
              <div
                key={tema.id}
                className="p-3.5 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center justify-between gap-3"
              >
                {/* ID del tema */}
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono border border-slate-900">
                  {tema.id}
                </div>

                {/* Título y barra de progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold text-slate-600 truncate pr-1">
                      {tema.bloque}
                    </span>
                    <span className="font-mono text-slate-900 font-bold">{dataTema.porcentaje}% retención</span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 truncate leading-snug">
                    {tema.titulo}
                  </h3>

                  {/* Micro barra de progreso */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5 border border-slate-900/40">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${dataTema.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Botón Entrenar Tema con modal configurador */}
                <button
                  type="button"
                  onClick={() => {
                    setTemaSeleccionadoParaTest(tema.id);
                    setModalSimulacroAbierto(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-slate-900 text-[11px] font-mono font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                  title={`Configurar Test Tema ${tema.id}`}
                >
                  <span>Test</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
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

      {/* Barra de navegación inferior fija para mobile */}
      <BottomNav badgeRepaso={stats.enLlamasHoy} />

      {/* Modal / Drawer Diario de Racha */}
      <RachaDiarioModal
        abierto={modalRachaAbierto}
        onCerrar={() => setModalRachaAbierto(false)}
        rachaDias={stats.rachaDias}
        sesiones={sesiones}
      />

      {/* Modal de Configuración de Simulacro / Test General y por Tema */}
      <ModalSimulacroConfig
        abierto={modalSimulacroAbierto}
        onCerrar={() => {
          setModalSimulacroAbierto(false);
          setTemaSeleccionadoParaTest(null);
        }}
        temas={temas}
        preguntas={preguntas}
        temaInicial={temaSeleccionadoParaTest}
      />
    </div>
  );
}
