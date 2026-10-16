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
  PlusCircle,
} from 'lucide-react';
import { Tema, Pregunta, EstadisticasGlobales } from '@/lib/types';
import { getTemas, getPreguntas } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPrincipal() {
  const { user } = useAuth();
  const [temas, setTemas] = useState<Tema[]>([]);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
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
    rachaDias: 6,
    falladasHistoricas: 0,
  });

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [listaTemas, listaPreguntas] = await Promise.all([
          getTemas(),
          getPreguntas(),
        ]);
        setTemas(listaTemas);
        setPreguntas(listaPreguntas);

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

        const total = listaPreguntas.length || 1;
        const porcentajeDominio = Math.round(((dominadas * 1.0 + asentadas * 0.6) / total) * 100);

        setStats({
          totalPreguntas: listaPreguntas.length,
          enLlamasHoy: enLlamas,
          dominadas,
          asentadas,
          enObservacion,
          nuevas,
          porcentajeDominio,
          rachaDias: 6,
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
      {/* 1. CABECERA TÁCTICA MOBILE-FIRST */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-950/60 font-black text-white text-base">
            35
          </div>
          <div>
            <h1 className="text-base font-black text-zinc-100 tracking-tight leading-none">
              OpostudyC
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
              35 Temas · Reconocimiento Activo & SRS
            </p>
          </div>
        </div>

        {/* Acciones de usuario y racha */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-400 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span>{stats.rachaDias} días</span>
          </div>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. PANEL DE ESTADO Y CURVA DEL OLVIDO */}
      <section className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 relative overflow-hidden">
        {/* Resplandor decorativo sutil en modo oscuro */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
              Dominio Global del Temario
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">
                {stats.porcentajeDominio}%
              </span>
              <span className="text-xs text-zinc-400">
                ({stats.dominadas + stats.asentadas} afianzadas de {stats.totalPreguntas})
              </span>
            </div>
          </div>

          {/* Badge de preguntas en llamas para hoy */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800 text-red-400 text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              <span>{stats.enLlamasHoy} en llamas hoy</span>
            </div>
            <span className="block text-[10px] text-zinc-500 mt-1">Repaso programado</span>
          </div>
        </div>

        {/* Barra de progreso global */}
        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 flex">
          <div
            title="Dominadas (Caja 4-5)"
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${(stats.dominadas / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="Asentadas (Caja 2-3)"
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${(stats.asentadas / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="En Observación (Caja 1)"
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${(stats.enObservacion / (stats.totalPreguntas || 1)) * 100}%` }}
          />
          <div
            title="Nuevas / Falladas (Caja 0)"
            className="bg-red-500 h-full transition-all duration-500"
            style={{ width: `${((stats.nuevas + stats.enLlamasHoy) / (stats.totalPreguntas || 1)) * 100}%` }}
          />
        </div>

        {/* Mini leyenda */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Dominadas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Asentadas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> En duda (24h)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Nuevas / Vencidas
          </span>
        </div>
      </section>

      {/* 3. BOTÓN GIGANTE DE ACCIÓN RÁPIDA: RONDA DE REPASO */}
      <Link
        href="/jugar?modo=repaso"
        className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] transition-all shadow-xl shadow-red-950/50 flex items-center justify-between text-white group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-7 h-7 text-white fill-white animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-red-200 uppercase tracking-wider">
              Acción Prioritaria
            </div>
            <div className="text-base font-black tracking-tight leading-tight">
              🚨 JUGAR RONDA DE REPASO
            </div>
            <div className="text-xs text-red-100/90 font-medium">
              15 preguntas inteligentes contra la curva del olvido
            </div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-red-200 group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </Link>

      {/* 4. MODOS ESPECIALES */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Cazador de Fallos */}
        <Link
          href="/jugar?modo=fallos"
          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-900/60 active:scale-[0.98] transition-all flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-red-950/70 border border-red-800/60 text-red-400">
              <Skull className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {stats.falladasHistoricas} falladas
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 group-hover:text-red-400 transition-colors">
              💀 Cazador de Fallos
            </h3>
            <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
              Partida intensiva solo con tus errores acumulados.
            </p>
          </div>
        </Link>

        {/* Chuleta Express */}
        <Link
          href="/chuleta"
          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-900/60 active:scale-[0.98] transition-all flex flex-col justify-between space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-800/60 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
              Datos Puros
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
              ⚡ Chuleta Express
            </h3>
            <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
              Cifras, plazos y normas UNE para repasar antes de dormir.
            </p>
          </div>
        </Link>
      </div>

      {/* 5. MAPA DE LOS 35 TEMAS OFICIALES */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Mapa de los 35 Temas
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {temasFiltrados.length} / 35
          </span>
        </div>

        {/* Buscador táctico rápido y selector de bloque */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tema por número o palabra clave (ej. Hidráulica, CTE, INFOMA)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 transition-colors"
            />
          </div>

          {/* Filtros horizontales scrolleables por bloque */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => setBloqueFiltro('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                bloqueFiltro === 'todos'
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              Todos (35)
            </button>
            {bloques.map((b) => (
              <button
                key={b}
                onClick={() => setBloqueFiltro(b)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                  bloqueFiltro === b
                    ? 'bg-red-600 text-white border-red-500 font-bold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
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
                className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                {/* ID del tema circular */}
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono">
                  {tema.id}
                </div>

                {/* Título y barra de progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                    <span className="font-semibold text-red-400 truncate pr-1">
                      {tema.bloque}
                    </span>
                    <span className="font-mono">{dataTema.porcentaje}% dominado</span>
                  </div>

                  <h3 className="text-xs font-semibold text-zinc-200 truncate leading-snug">
                    {tema.titulo}
                  </h3>

                  {/* Micro barra de progreso */}
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${dataTema.porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Botón Entrenar Tema */}
                <Link
                  href={`/jugar?modo=tema&temaId=${tema.id}`}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 hover:text-white active:scale-95 text-zinc-300 text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
                  title={`Entrenar Tema ${tema.id}`}
                >
                  <span>Test</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. BANNER DE INGESTA DE TEMARIO CON GEMINI */}
      <section className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs flex items-center justify-between gap-3">
        <div>
          <span className="font-bold text-zinc-200 block">¿Faltan epígrafes o preguntas?</span>
          <span className="text-[11px] text-zinc-400">
            Pega texto oficial en bruto y la IA del Tribunal lo destripará al instante.
          </span>
        </div>
        <Link
          href="/admin/ingesta"
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 border border-zinc-700"
        >
          <PlusCircle className="w-3.5 h-3.5 text-red-500" />
          <span>Ingesta IA</span>
        </Link>
      </section>

      {/* Barra de navegación inferior fija para mobile */}
      <BottomNav />
    </div>
  );
}
