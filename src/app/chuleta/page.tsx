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
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-2xs"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 leading-none">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Fichas Técnicas</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Cifras, plazos, presiones y normas UNE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
            {chuletasFiltradas.length} fichas
          </span>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. BARRA DE BÚSQUEDA Y SELECTOR DE TEMAS */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por concepto o cifra (ej. 72h, UNE, bar, metros)..."
            className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs transition-all"
          />
        </div>

        {/* Filtro horizontal de temas */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <button
            onClick={() => setTemaSeleccionado('todos')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
              temaSeleccionado === 'todos'
                ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            Todos los Temas
          </button>
          {temas.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemaSeleccionado(t.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                temaSeleccionado === t.id
                  ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              T{t.id}: {t.titulo.slice(0, 18)}...
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTADO DE FICHAS DE DATOS CRÍTICOS */}
      {chuletasFiltradas.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <AlertOctagon className="w-8 h-8 mx-auto text-amber-500" />
          <p className="text-sm font-bold text-slate-800">
            No hay datos técnicos registrados para este filtro.
          </p>
          <p className="text-xs text-slate-500">
            Selecciona otro tema o utiliza el buscador superior.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chuletasFiltradas.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-slate-300 transition-all"
            >
              {/* Epígrafe y badge del tema */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                <span className="font-bold text-red-600">
                  Tema {item.tema_id}
                </span>
                <span className="truncate max-w-[210px] text-slate-500 font-medium">
                  {item.epigrafe}
                </span>
              </div>

              {/* Concepto y Valor Exacto */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 block">
                  {item.concepto}
                </span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Dato Oficial:
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg text-right">
                    {item.valor_exacto}
                  </span>
                </div>
              </div>

              {/* Trampa habitual de examen */}
              {item.trampa_habitual && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-900 flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-700">Trampa de examen: </span>
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
