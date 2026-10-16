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
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  ChevronDown,
  X,
  Filter,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { Tema, FichaTecnica } from '@/lib/types';
import { getTemas, getFichasTecnicas, eliminarFichaTecnica, solicitarGeneracionFichas } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import UserAuthButton from '@/components/UserAuthButton';

function ChuletaContent() {
  const searchParams = useSearchParams();
  const temaIdParam = searchParams.get('temaId') || searchParams.get('tema');
  const initialTemaId = temaIdParam ? parseInt(temaIdParam, 10) : undefined;

  const [temas, setTemas] = useState<Tema[]>([]);
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [cargando, setCargando] = useState(true);

  // Filtros: Temas seleccionados (array de IDs)
  const [temasSeleccionados, setTemasSeleccionados] = useState<number[]>([]);
  const [dropdownTemasAbierto, setDropdownTemasAbierto] = useState(false);
  const [busquedaTemaDropdown, setBusquedaTemaDropdown] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');

  // Modo de visualización: 'visibles' vs 'ocultas' (Tap to reveal)
  const [modoOculto, setModoOculto] = useState<boolean>(false);
  // Conjunto de IDs de fichas reveladas individualmente
  const [fichasReveladas, setFichasReveladas] = useState<Set<string>>(new Set());

  // Modal selector para generar fichas con IA
  const [modalGenerarAbierto, setModalGenerarAbierto] = useState(false);
  const [temaIdParaGenerar, setTemaIdParaGenerar] = useState<number>(1);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [mensajeGeneracion, setMensajeGeneracion] = useState<string | null>(null);

  // Carga inicial
  useEffect(() => {
    async function cargar() {
      try {
        const [listaTemas, listaFichas] = await Promise.all([
          getTemas(),
          getFichasTecnicas(),
        ]);
        setTemas(listaTemas);
        setFichas(listaFichas);

        if (initialTemaId && !isNaN(initialTemaId)) {
          setTemasSeleccionados([initialTemaId]);
          setTemaIdParaGenerar(initialTemaId);
        } else {
          // Por defecto todos seleccionados
          setTemasSeleccionados(listaTemas.map((t) => t.id));
        }
      } catch (err) {
        console.error('Error cargando fichas técnicas:', err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [initialTemaId]);

  // Contador de fichas por tema
  const conteoFichasPorTema = useMemo(() => {
    const mapa = new Map<number, number>();
    fichas.forEach((f) => {
      mapa.set(f.tema_id, (mapa.get(f.tema_id) || 0) + 1);
    });
    return mapa;
  }, [fichas]);

  // Filtrado de temas dentro del desplegable
  const temasDropdownFiltrados = useMemo(() => {
    return temas.filter(
      (t) =>
        busquedaTemaDropdown === '' ||
        t.titulo.toLowerCase().includes(busquedaTemaDropdown.toLowerCase()) ||
        t.id.toString() === busquedaTemaDropdown.trim()
    );
  }, [temas, busquedaTemaDropdown]);

  // Manejadores de checkboxes de temas
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

  // Fichas filtradas según temas seleccionados y texto de búsqueda
  const fichasFiltradas = useMemo(() => {
    return fichas.filter((f) => {
      const coincideTema = temasSeleccionados.includes(f.tema_id);
      const coincideTexto =
        busquedaTexto === '' ||
        f.concepto.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        f.valor_exacto.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        f.trampa_habitual.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
        (f.categoria_dato && f.categoria_dato.toLowerCase().includes(busquedaTexto.toLowerCase()));

      return coincideTema && coincideTexto;
    });
  }, [fichas, temasSeleccionados, busquedaTexto]);

  // Alternar revelación individual de una ficha
  const handleToggleRevelarFicha = (id: string) => {
    if (!modoOculto) return;
    setFichasReveladas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const handleOcultarTodas = () => {
    setFichasReveladas(new Set());
  };

  // Eliminar ficha
  const handleEliminarFicha = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta ficha técnica de la base de datos?')) {
      return;
    }
    setFichas((prev) => prev.filter((f) => f.id !== id));
    await eliminarFichaTecnica(id);
  };

  // Lanzar generación de 10 fichas con IA
  const handleBotonGenerarPrincipal = () => {
    // Si solo hay 1 tema seleccionado en el filtro, usamos ese directamente
    if (temasSeleccionados.length === 1) {
      ejecutarGeneracion(temasSeleccionados[0]);
    } else {
      setModalGenerarAbierto(true);
    }
  };

  const ejecutarGeneracion = async (temaId: number) => {
    setGenerandoIA(true);
    setMensajeGeneracion(null);
    try {
      const res = await solicitarGeneracionFichas(temaId);
      if (res.ok && res.fichas.length > 0) {
        // Actualizar fichas en estado
        const nuevasFichas = res.fichas;
        setFichas((prev) => {
          // Filtrar existentes para no duplicar en memoria
          const idsNuevas = new Set(nuevasFichas.map((n) => n.id));
          return [...nuevasFichas, ...prev.filter((p) => !idsNuevas.has(p.id))];
        });
        setModalGenerarAbierto(false);
        setMensajeGeneracion(`¡+${res.nuevasGeneradas} fichas técnicas añadidas al Tema ${temaId}!`);
        setTimeout(() => setMensajeGeneracion(null), 4000);
      } else {
        alert(res.error || 'Error al generar fichas técnicas con IA');
      }
    } catch (e) {
      console.error('Error generando fichas:', e);
      alert('Error de conexión al generar fichas');
    } finally {
      setGenerandoIA(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todosSeleccionados = temasSeleccionados.length === temas.length;

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-2xs"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 leading-none">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Fichas Técnicas</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Cifras puras, presiones, plazos y normas de examen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shadow-2xs">
            {fichasFiltradas.length} fichas
          </span>
          <UserAuthButton />
        </div>
      </header>

      {/* 2. BARRA DE HERRAMIENTAS: DESPLEGABLE DE TEMAS + MODO OCULTAS/VISIBLES */}
      <div className="space-y-2.5">
        {/* Fila con Desplegable de Temas y Switch de Ocultas */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Botón Desplegable Multi-Selección de Temas */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setDropdownTemasAbierto((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 text-xs text-slate-800 font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate pr-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">
                  {todosSeleccionados
                    ? `Todos los temas (${temas.length})`
                    : temasSeleccionados.length === 0
                    ? 'Ningún tema seleccionado'
                    : `${temasSeleccionados.length} ${
                        temasSeleccionados.length === 1 ? 'tema seleccionado' : 'temas seleccionados'
                      }`}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  dropdownTemasAbierto ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Modal / Menú Desplegable con Checkboxes */}
            {dropdownTemasAbierto && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Filtrar por Temas Oficiales:
                  </span>
                  <button
                    onClick={() => setDropdownTemasAbierto(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Acciones rápidas Marcar / Desmarcar */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <button
                    type="button"
                    onClick={handleMarcarTodos}
                    className="text-amber-700 hover:underline font-semibold cursor-pointer"
                  >
                    Marcar todos (35)
                  </button>
                  <button
                    type="button"
                    onClick={handleDesmarcarTodos}
                    className="text-slate-500 hover:underline font-semibold cursor-pointer"
                  >
                    Desmarcar todos
                  </button>
                </div>

                {/* Buscador dentro del desplegable */}
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={busquedaTemaDropdown}
                    onChange={(e) => setBusquedaTemaDropdown(e.target.value)}
                    placeholder="Buscar tema..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                {/* Lista scrolleable con Checkboxes */}
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {temasDropdownFiltrados.map((t) => {
                    const marcado = temasSeleccionados.includes(t.id);
                    const cantFichas = conteoFichasPorTema.get(t.id) || 0;
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] cursor-pointer transition-colors ${
                          marcado
                            ? 'bg-amber-50/80 text-amber-950 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-4 h-4 rounded bg-slate-100 font-mono text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {t.id}
                          </span>
                          <span className="truncate">{t.titulo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({cantFichas})
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => handleToggleTema(t.id)}
                          className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setDropdownTemasAbierto(false)}
                  className="w-full py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs"
                >
                  Aplicar Filtro ({temasSeleccionados.length} temas)
                </button>
              </div>
            )}
          </div>

          {/* Switch Global: Modo Repaso (Visibles) vs Modo Autoevaluación (Ocultas) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setModoOculto(false);
                setFichasReveladas(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !modoOculto
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Lectura rápida con respuestas visibles"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Visibles</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModoOculto(true);
                setFichasReveladas(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                modoOculto
                  ? 'bg-slate-900 text-white shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Modo autoevaluación: toca para desvelar"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ocultas</span>
            </button>
          </div>
        </div>

        {/* Buscador de texto y botón generar IA */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder="Buscar dato (ej. 72h, UNE, bar, 20m, RIPCI)..."
              className="w-full bg-white border border-slate-200/90 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs transition-all"
            />
          </div>

          {/* Botón Generar Nuevas Fichas con IA */}
          <button
            type="button"
            onClick={handleBotonGenerarPrincipal}
            disabled={generandoIA}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/90 active:scale-95 border border-amber-200/90 text-amber-800 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            title="Generar 10 nuevas fichas técnicas con IA para este tema"
          >
            {generandoIA ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden xs:inline">⚡ +10 Fichas IA</span>
            <span className="xs:hidden">+10</span>
          </button>
        </div>

        {/* Si estamos en modo oculto, mostrar botón rápido para re-ocultar todas */}
        {modoOculto && (
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
            <span>👆 Toca cualquier tarjeta para desvelar la respuesta</span>
            {fichasReveladas.size > 0 && (
              <button
                type="button"
                onClick={handleOcultarTodas}
                className="text-amber-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ocultar todas</span>
              </button>
            )}
          </div>
        )}

        {/* Mensaje de éxito de generación */}
        {mensajeGeneracion && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{mensajeGeneracion}</span>
          </div>
        )}
      </div>

      {/* 3. LISTADO DE FICHAS TÉCNICAS */}
      {fichasFiltradas.length === 0 ? (
        <div className="py-14 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <AlertOctagon className="w-8 h-8 mx-auto text-amber-500" />
          <div>
            <p className="text-sm font-bold text-slate-800">
              No hay fichas técnicas registradas para esta selección.
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Genera 10 fichas oficiales con IA para este tema o ajusta los filtros.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBotonGenerarPrincipal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generar primeras 10 fichas con IA</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fichasFiltradas.map((item) => {
            const revelada = !modoOculto || fichasReveladas.has(item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleToggleRevelarFicha(item.id)}
                className={`p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 transition-all group ${
                  modoOculto ? 'cursor-pointer hover:border-amber-300' : 'hover:border-slate-300'
                }`}
              >
                {/* Epígrafe, badge del tema y botón papelera */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">
                      Tema {item.tema_id}
                    </span>
                    {item.categoria_dato && (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        {item.categoria_dato}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[170px] text-slate-400 font-medium">
                      {item.tema?.titulo || `Tema ${item.tema_id}`}
                    </span>
                    {/* Botón papelera para eliminar ficha */}
                    <button
                      type="button"
                      onClick={(e) => handleEliminarFicha(e, item.id)}
                      className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar esta ficha técnica"
                      aria-label="Eliminar ficha"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Concepto / Pregunta directa */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {item.concepto}
                  </h3>
                </div>

                {/* Caja de Valor Exacto */}
                {revelada ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 animate-in fade-in duration-150">
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
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-center gap-2 text-amber-700 text-xs font-semibold select-none">
                    <Eye className="w-4 h-4 text-amber-500" />
                    <span>👆 Toca para desvelar el dato exacto</span>
                  </div>
                )}

                {/* Trampa habitual de examen */}
                {revelada && item.trampa_habitual && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-900 flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertOctagon className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-700">Trampa de examen: </span>
                      {item.trampa_habitual}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para elegir qué tema generar si hay múltiples seleccionados */}
      {modalGenerarAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Generar Fichas con IA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    10 fichas oficiales de examen sin duplicados
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalGenerarAbierto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Selecciona el tema a ampliar:
              </label>
              <select
                value={temaIdParaGenerar}
                onChange={(e) => setTemaIdParaGenerar(parseInt(e.target.value, 10))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:border-amber-500"
              >
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tema {t.id}: {t.titulo}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => ejecutarGeneracion(temaIdParaGenerar)}
              disabled={generandoIA}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {generandoIA ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Elaborando 10 fichas con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generar 10 Fichas Oficiales del Tema {temaIdParaGenerar}</span>
                </>
              )}
            </button>
          </div>
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
