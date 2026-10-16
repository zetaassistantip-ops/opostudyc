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
} from 'lucide-react';
import { Tema, Pregunta, EstadisticasGlobales, SesionEstudio } from '@/lib/types';
import { getTemas, getPreguntas, getHistorialSesiones, calcularRachaDias } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import RachaDiarioModal from '@/components/RachaDiarioModal';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPrincipal() {
  const { user } = useAuth();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [sesiones, setSesiones] = useState<SesionEstudio[]>([]);
  const [modalRachaAbierto, setModalRachaAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [bloqueFiltro, setBloqueFiltro] = useState<string>('todos');
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

  // Lista única de bloques temáticos
  const bloques = useMemo(() => {
    const setB = new Set<string>();
    temas.forEach((t) => setB.add(t.bloque));
    return Array.from(setB);
  }, [temas]);

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

  // Filtrado de temas por bloque y texto
  const temasFiltrados = useMemo(() => {
    return temas.filter((t) => {
      const coincideBloque = bloqueFiltro === 'todos' || t.bloque === bloqueFiltro;
      const coincideBusqueda =
        busqueda === '' ||
        t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.id.toString() === busqueda.trim();
      return coincideBloque && coincideBusqueda;
    });
  }, [temas, bloqueFiltro, busqueda]);

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

        {/* Acciones de usuario y racha */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalRachaAbierto(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100/90 active:scale-95 border border-amber-200/80 text-amber-800 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Ver diario y racha de estudio"
          >
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{stats.rachaDias} días</span>
          </button>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. PANEL DE PROGRESO Y RETENCIÓN */}
      <section className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-red-600" />
              Retención Global del Temario
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {stats.porcentajeDominio}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({stats.dominadas + stats.asentadas} afianzadas de {stats.totalPreguntas})
              </span>
            </div>
          </div>

          {/* Badge de repaso programado */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-red-600 text-red-600" />
              <span>{stats.enLlamasHoy} para repasar</span>
            </div>
            <span className="block text-[10px] text-slate-400 mt-1">Repaso espaciado</span>
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 flex">
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
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Dominadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Asentadas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> En repaso
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" /> Nuevas
          </span>
        </div>
      </section>

      {/* 3. BOTÓN DE ACCIÓN RÁPIDA: REPASO DEL DÍA */}
      <Link
        href="/jugar?modo=repaso"
        className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-sm flex items-center justify-between text-white group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0 shadow-xs">
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

      {/* 4. MODOS COMPLEMENTARIOS */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Cazador de Fallos */}
        <Link
          href="/jugar?modo=fallos"
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 active:scale-[0.98] transition-all flex flex-col justify-between space-y-2.5 shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <Skull className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
          className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 active:scale-[0.98] transition-all flex flex-col justify-between space-y-2.5 shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
            <BookOpen className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Temario Oficial
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono font-semibold">
            {temasFiltrados.length} / 35 temas
          </span>
        </div>

        {/* Buscador táctico rápido y selector de bloque */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tema (ej. Hidráulica, PLATERCAM, CTE, Gas)..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs transition-all"
            />
          </div>

          {/* Filtros horizontales por bloque */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => setBloqueFiltro('todos')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                bloqueFiltro === 'todos'
                  ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              Todos (35)
            </button>
            {bloques.map((b) => (
              <button
                key={b}
                onClick={() => setBloqueFiltro(b)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                  bloqueFiltro === b
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de temas */}
        <div className="space-y-2">
          {temasFiltrados.map((tema) => {
            const dataTema = estadisticasPorTema.get(tema.id) || { total: 0, dominadas: 0, porcentaje: 0 };
            return (
              <div
                key={tema.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
              >
                {/* ID del tema */}
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                  {tema.id}
                </div>

                {/* Título y barra de progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span className="font-semibold text-slate-500 truncate pr-1">
                      {tema.bloque}
                    </span>
                    <span className="font-mono text-slate-600 font-medium">{dataTema.porcentaje}% retención</span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 truncate leading-snug">
                    {tema.titulo}
                  </h3>

                  {/* Micro barra de progreso */}
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${dataTema.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Botón Entrenar Tema */}
                <Link
                  href={`/jugar?modo=tema&temaId=${tema.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white active:scale-95 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                  title={`Test Tema ${tema.id}`}
                >
                  <span>Test</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BANNER BANCO COMPARTIDO SRS */}
      <section className="p-4 rounded-2xl bg-white border border-slate-200/90 text-xs flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">Banco Compartido Autónomo</span>
            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
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
    </div>
  );
}
