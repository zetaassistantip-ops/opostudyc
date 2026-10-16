'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Zap,
  ArrowLeft,
  Search,
  AlertOctagon,
  CheckCircle,
} from 'lucide-react';
import { SeccionTemario, Tema, DatoCritico } from '@/lib/types';
import { getSecciones, getTemas } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';

interface ItemChuleta extends DatoCritico {
  tema_id: number;
  tema_titulo?: string;
  epigrafe: string;
  seccion_id: string;
}

function ChuletaContent() {
  const searchParams = useSearchParams();
  const temaIdParam = searchParams.get('temaId');
  const initialTemaId = temaIdParam ? parseInt(temaIdParam, 10) : undefined;

  const [secciones, setSecciones] = useState<SeccionTemario[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [cargando, setCargando] = useState(true);
  const [temaSeleccionado, setTemaSeleccionado] = useState<number | 'todos'>(
    initialTemaId || 'todos'
  );
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [secs, tms] = await Promise.all([getSecciones(), getTemas()]);
        setSecciones(secs);
        setTemas(tms);
      } catch (err) {
        console.error('Error cargando chuleta:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // Extraer todos los datos críticos y enriquecerlos con su tema
  const todasLasChuletas: ItemChuleta[] = useMemo(() => {
    const items: ItemChuleta[] = [];

    secciones.forEach((sec) => {
      const tema = temas.find((t) => t.id === sec.tema_id);
      if (sec.datos_criticos && Array.isArray(sec.datos_criticos)) {
        sec.datos_criticos.forEach((dc) => {
          items.push({
            ...dc,
            tema_id: sec.tema_id,
            tema_titulo: tema?.titulo,
            epigrafe: sec.epigrafe,
            seccion_id: sec.id,
          });
        });
      }
    });

    return items;
  }, [secciones, temas]);

  // Filtrado por tema y búsqueda
  const chuletasFiltradas = useMemo(() => {
    return todasLasChuletas.filter((c) => {
      const coincideTema = temaSeleccionado === 'todos' || c.tema_id === temaSeleccionado;
      const coincideTexto =
        busqueda === '' ||
        c.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.valor_exacto.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.trampa_habitual.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.epigrafe.toLowerCase().includes(busqueda.toLowerCase());

      return coincideTema && coincideTexto;
    });
  }, [todasLasChuletas, temaSeleccionado, busqueda]);

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-black text-zinc-100 flex items-center gap-1.5 leading-none">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Chuleta Express</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
              Cifras, plazos, presiones y normas UNE puras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400">
            {chuletasFiltradas.length} fichas
          </span>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. BARRA DE BÚSQUEDA Y SELECTOR DE TEMAS */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por concepto, cifra o trampa (ej. 72h, 1/D⁵, 15 junio)..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Filtro horizontal de temas */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setTemaSeleccionado('todos')}
            className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors border ${
              temaSeleccionado === 'todos'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Todos los Temas
          </button>
          {temas.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemaSeleccionado(t.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors border ${
                temaSeleccionado === t.id
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              T{t.id}: {t.titulo.slice(0, 20)}...
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTADO DE FICHAS DE DATOS CRÍTICOS */}
      {chuletasFiltradas.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 space-y-2">
          <AlertOctagon className="w-8 h-8 mx-auto text-amber-500" />
          <p className="text-sm font-semibold text-zinc-300">
            No hay datos críticos registrados para este filtro.
          </p>
          <p className="text-xs text-zinc-500">
            Puedes generar más ingiriendo epígrafes del temario con la IA del Tribunal.
          </p>
          <Link
            href="/admin/ingesta"
            className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-200"
          >
            Ingestar con IA
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chuletasFiltradas.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm space-y-2 hover:border-amber-900/50 transition-colors"
            >
              {/* Epígrafe y badge del tema */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/60 pb-1.5">
                <span className="font-bold text-amber-400">
                  Tema {item.tema_id}
                </span>
                <span className="truncate max-w-[200px] text-zinc-400">
                  {item.epigrafe}
                </span>
              </div>

              {/* Concepto y Valor Exacto */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-300 block">
                  {item.concepto}
                </span>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                      Dato Oficial:
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg text-right">
                    {item.valor_exacto}
                  </span>
                </div>
              </div>

              {/* Trampa habitual de examen */}
              {item.trampa_habitual && (
                <div className="p-2 rounded-xl bg-red-950/30 border border-red-900/40 text-[11px] text-red-200/90 flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-300">Trampa de Tribunal: </span>
                    {item.trampa_habitual}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default function PaginaChuleta() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChuletaContent />
    </Suspense>
  );
}
