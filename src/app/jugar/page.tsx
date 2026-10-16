'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Award,
  Target,
} from 'lucide-react';
import { PreguntaJuego, TipoEvaluacionSRS, SeccionTemario, Tema, TipoSesion, Pregunta } from '@/lib/types';
import {
  seleccionarMixTribunal,
  seleccionarCazadorFallos,
  barajarOpciones,
  calcularSRS,
  obtenerEtiquetaCaja,
} from '@/lib/srs';
import { getPreguntas, getSecciones, getTemas, actualizarPreguntaSRS, solicitarGeneracionMotorTema, guardarSesionEstudio } from '@/lib/supabase';
import TemarioDrawer from '@/components/TemarioDrawer';

function TestGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const temaIdRaw = searchParams.get('temaId') || searchParams.get('tema');
  const temaId = temaIdRaw ? parseInt(temaIdRaw, 10) : undefined;
  const modo = searchParams.get('modo') || (temaId ? 'tema' : 'repaso');
  const temasParam = searchParams.get('temas'); // "all" o "1,3,7"
  const limiteParam = searchParams.get('limite');
  const limitePreguntas = limiteParam ? parseInt(limiteParam, 10) : 15;

  // Estados de carga y partida
  const [cargando, setCargando] = useState(true);
  const [generandoMotor, setGenerandoMotor] = useState(false);
  const [mensajeMotor, setMensajeMotor] = useState<string>('');
  const [errorMotor, setErrorMotor] = useState<string | null>(null);
  const [generandoNuevas, setGenerandoNuevas] = useState(false);

  const [preguntasRonda, setPreguntasRonda] = useState<PreguntaJuego[]>([]);
  const [secciones, setSecciones] = useState<SeccionTemario[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);

  // Estados de la pregunta actual
  const [opcionSeleccionadaOriginal, setOpcionSeleccionadaOriginal] = useState<number | null>(null);
  const [haRespondido, setHaRespondido] = useState(false);
  const [evaluacionSRS, setEvaluacionSRS] = useState<TipoEvaluacionSRS | null>(null);
  const [marcarConDudaPrevia, setMarcarConDudaPrevia] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Historial de la ronda
  const [estadisticasRonda, setEstadisticasRonda] = useState({
    aciertosSeguros: 0,
    aciertosDuda: 0,
    fallos: 0,
  });
  const [rondaTerminada, setRondaTerminada] = useState(false);

  // Carga inicial de datos
  useEffect(() => {
    async function cargarPartida() {
      setCargando(true);
      setErrorMotor(null);
      try {
        const [todasSecciones, todosTemas] = await Promise.all([
          getSecciones(),
          getTemas(),
        ]);

        setSecciones(todasSecciones);
        setTemas(todosTemas);

        if (modo === 'general') {
          // Modo Simulacro / Test General Multitema
          const todas = await getPreguntas();
          let pool: Pregunta[] = todas;

          if (temasParam && temasParam !== 'all') {
            const idsPermitidos = temasParam
              .split(',')
              .map((id) => parseInt(id.trim(), 10))
              .filter((n) => !isNaN(n));

            if (idsPermitidos.length > 0) {
              pool = todas.filter((p) => idsPermitidos.includes(p.tema_id));
            }
          }

          if (pool.length === 0) {
            setPreguntasRonda([]);
          } else {
            // Barajar aleatoriamente y seleccionar según límite
            const barajadas = [...pool].sort(() => Math.random() - 0.5);
            setPreguntasRonda(
              barajadas.slice(0, limitePreguntas).map(barajarOpciones)
            );
          }
        } else if (modo === 'tema' && temaId) {
          // 1. Consultar preguntas específicas del tema en el banco de Supabase
          const preguntasTema = await getPreguntas(temaId);

          if (preguntasTema.length > 0) {
            const seleccionadas = seleccionarMixTribunal(preguntasTema, 15, temaId);
            setPreguntasRonda(
              seleccionadas.length > 0
                ? seleccionadas
                : preguntasTema.slice(0, 15).map(barajarOpciones)
            );
          } else {
            // 0 preguntas para este tema: mostramos la tarjeta táctica para generar primera tanda
            setPreguntasRonda([]);
          }
        } else if (modo === 'fallos') {
          const todas = await getPreguntas();
          const seleccionadas = seleccionarCazadorFallos(todas, 15);
          setPreguntasRonda(seleccionadas);
        } else {
          // Mix Tribunal inteligente por defecto (repaso general)
          const todas = await getPreguntas();
          const seleccionadas = seleccionarMixTribunal(todas, 15);
          setPreguntasRonda(seleccionadas);
        }
      } catch (err) {
        console.error('Error preparando ronda:', err);
        setErrorMotor('Error preparando la sesión de preguntas.');
      } finally {
        setCargando(false);
      }
    }

    cargarPartida();
  }, [modo, temaId, temasParam, limitePreguntas]);

  const preguntaActual = preguntasRonda[indiceActual];

  // Resolver sección y tema de la pregunta actual
  const seccionActual = useMemo(() => {
    if (!preguntaActual) return null;
    return (
      preguntaActual.seccion ||
      secciones.find((s) => s.id === preguntaActual.seccion_id) ||
      null
    );
  }, [preguntaActual, secciones]);

  const temaActual = useMemo(() => {
    if (!preguntaActual) return null;
    return (
      preguntaActual.tema ||
      temas.find((t) => t.id === preguntaActual.tema_id) ||
      null
    );
  }, [preguntaActual, temas]);

  // Manejador al pulsar una opción
  const handleSeleccionarOpcion = (indiceOriginal: number) => {
    if (haRespondido || !preguntaActual) return;

    setOpcionSeleccionadaOriginal(indiceOriginal);
    setHaRespondido(true);

    const esCorrecta = indiceOriginal === preguntaActual.respuesta_correcta;

    // Determinar evaluación SRS inicial
    let evaluacion: TipoEvaluacionSRS;
    if (!esCorrecta) {
      evaluacion = 'fallo';
    } else if (marcarConDudaPrevia) {
      evaluacion = 'acierto_duda';
    } else {
      evaluacion = 'acierto_seguro';
    }

    setEvaluacionSRS(evaluacion);

    // Actualizar SRS
    const nuevoSRS = calcularSRS(preguntaActual, evaluacion);
    actualizarPreguntaSRS(preguntaActual.id, nuevoSRS);

    // Actualizar estadísticas
    setEstadisticasRonda((prev) => ({
      aciertosSeguros: prev.aciertosSeguros + (evaluacion === 'acierto_seguro' ? 1 : 0),
      aciertosDuda: prev.aciertosDuda + (evaluacion === 'acierto_duda' ? 1 : 0),
      fallos: prev.fallos + (evaluacion === 'fallo' ? 1 : 0),
    }));
  };

  // Cambio de certeza post-respuesta si acertó (Seguro vs Duda)
  const cambiarCertezaAcierto = (nuevaEvaluacion: 'acierto_seguro' | 'acierto_duda') => {
    if (!haRespondido || !preguntaActual || evaluacionSRS === 'fallo') return;
    if (evaluacionSRS === nuevaEvaluacion) return;

    setEvaluacionSRS(nuevaEvaluacion);
    const nuevoSRS = calcularSRS(preguntaActual, nuevaEvaluacion);
    actualizarPreguntaSRS(preguntaActual.id, nuevoSRS);

    setEstadisticasRonda((prev) => ({
      ...prev,
      aciertosSeguros:
        nuevaEvaluacion === 'acierto_seguro'
          ? prev.aciertosSeguros + 1
          : Math.max(0, prev.aciertosSeguros - 1),
      aciertosDuda:
        nuevaEvaluacion === 'acierto_duda'
          ? prev.aciertosDuda + 1
          : Math.max(0, prev.aciertosDuda - 1),
    }));
  };

  // Pasar a la siguiente pregunta
  const handleSiguiente = () => {
    if (indiceActual + 1 < preguntasRonda.length) {
      setIndiceActual((prev) => prev + 1);
      setOpcionSeleccionadaOriginal(null);
      setHaRespondido(false);
      setEvaluacionSRS(null);
      setMarcarConDudaPrevia(false);
      setDrawerAbierto(false);
    } else {
      // Fin de la ronda
      setRondaTerminada(true);
      const total = preguntasRonda.length;
      const aciertos = estadisticasRonda.aciertosSeguros + estadisticasRonda.aciertosDuda;
      if (aciertos / (total || 1) >= 0.7) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
        });
      }

      // Guardar sesión en el Diario de Estudio e Historial
      let tipoSesion: TipoSesion = 'tema';
      let nombreSesion = 'Sesión de Estudio';

      if (modo === 'general') {
        tipoSesion = 'simulacro_general';
        const countTemas = temasParam === 'all' || !temasParam ? 35 : temasParam.split(',').filter(Boolean).length;
        nombreSesion = temasParam === 'all' || !temasParam
          ? '🎯 Simulacro Global (35 temas)'
          : `🎯 Test General (${countTemas} temas)`;
      } else if (modo === 'fallos') {
        tipoSesion = 'fallos';
        nombreSesion = '💀 Refuerzo de Fallos';
      } else if (temaId && temaActual) {
        tipoSesion = 'tema';
        nombreSesion = `📘 Tema ${temaActual.id}: ${temaActual.titulo}`;
      } else {
        tipoSesion = 'repaso_srs';
        nombreSesion = '🔥 Repaso SRS General';
      }

      guardarSesionEstudio({
        fecha: new Date().toISOString().slice(0, 10),
        tipo_sesion: tipoSesion,
        tema_id: temaId || null,
        titulo_sesion: nombreSesion,
        preguntas_respondidas: total,
        aciertos: estadisticasRonda.aciertosSeguros,
        dudas: estadisticasRonda.aciertosDuda,
        fallos: estadisticasRonda.fallos,
      });
    }
  };

  // Solicitar tanda de preguntas (+6 nuevas) para este tema al motor con deduplicación
  const handleGenerarPreguntas = async (forzar: boolean = true) => {
    if (!temaId) return;
    setGenerandoNuevas(true);
    setErrorMotor(null);
    try {
      const res = await solicitarGeneracionMotorTema(temaId, forzar);
      if (res.ok && res.preguntas.length > 0) {
        const filtradas = res.preguntas.filter((p) => p.tema_id === temaId);
        const seleccionadas = seleccionarMixTribunal(filtradas, 15, temaId);
        setPreguntasRonda(
          seleccionadas.length > 0
            ? seleccionadas
            : filtradas.slice(0, 15).map(barajarOpciones)
        );
        setIndiceActual(0);
        setOpcionSeleccionadaOriginal(null);
        setHaRespondido(false);
        setEvaluacionSRS(null);
        setRondaTerminada(false);
        setEstadisticasRonda({ aciertosSeguros: 0, aciertosDuda: 0, fallos: 0 });
      } else {
        const errText = res.error || 'No se pudieron generar más preguntas en este momento.';
        setErrorMotor(errText);
        alert(errText);
      }
    } catch (err) {
      console.error(err);
      const errText = 'Error de conexión con el motor de temas.';
      setErrorMotor(errText);
      alert(errText);
    } finally {
      setGenerandoNuevas(false);
    }
  };

  // Reiniciar otra ronda con las preguntas actuales del tema
  const reiniciarRonda = () => {
    if (preguntasRonda.length > 0) {
      setIndiceActual(0);
      setOpcionSeleccionadaOriginal(null);
      setHaRespondido(false);
      setEvaluacionSRS(null);
      setRondaTerminada(false);
      setEstadisticasRonda({ aciertosSeguros: 0, aciertosDuda: 0, fallos: 0 });
      setPreguntasRonda((prev) => prev.map(barajarOpciones));
    } else {
      router.refresh();
      window.location.reload();
    }
  };

  // ESTADO 1: CARGA TÁCTICA DEL MOTOR IA (GENERANDO PRIMER BLOQUE)
  if (generandoMotor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-3 border-slate-200 border-t-red-600 rounded-full animate-spin" />
          <Flame className="w-7 h-7 text-red-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {mensajeMotor || `Preparando preguntas del Tema ${temaId}...`}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            El Tribunal IA está destripando el temario oficial, formulando distractores de nivel oposición y guardando la batería en la base de datos compartida.
          </p>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2 text-left shadow-2xs">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Generación única: una vez guardadas, este tema cargará al instante para siempre.</span>
        </div>
      </div>
    );
  }

  // ESTADO 2: CARGA NORMAL
  if (cargando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-900">Cargando sesión de estudio...</h2>
        <p className="text-xs text-slate-500 mt-1">Organizando preguntas con el algoritmo SRS</p>
      </div>
    );
  }

  // PANTALLA FIN DE RONDA
  if (rondaTerminada) {
    const total = preguntasRonda.length;
    const totalAciertos = estadisticasRonda.aciertosSeguros + estadisticasRonda.aciertosDuda;
    const porcentajeAcierto = Math.round((totalAciertos / (total || 1)) * 100);

    return (
      <main className="flex-1 flex flex-col max-w-md mx-auto w-full p-4 justify-between animate-fadeIn pb-8">
        <div className="pt-6 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-white border border-slate-200 shadow-md">
            {porcentajeAcierto >= 80 ? (
              <Award className="w-12 h-12 text-emerald-600 animate-bounce" />
            ) : porcentajeAcierto >= 50 ? (
              <Flame className="w-12 h-12 text-amber-500 fill-amber-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {porcentajeAcierto >= 80 ? '¡Ronda Completada con Éxito!' : porcentajeAcierto >= 50 ? 'Buen Entrenamiento' : 'Toca Reforzar Conceptos'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              El algoritmo Leitner ha programado cada pregunta según tu nivel de acierto individual.
            </p>
          </div>

          {/* Tarjeta de métricas */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-2xl font-black text-emerald-600">
                {estadisticasRonda.aciertosSeguros}
              </span>
              <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                Seguros
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-2xl font-black text-amber-600">
                {estadisticasRonda.aciertosDuda}
              </span>
              <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                Con Duda
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-2xl font-black text-red-600">
                {estadisticasRonda.fallos}
              </span>
              <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                Fallos
              </span>
            </div>
          </div>

          {/* Explicación de impacto SRS */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-1.5 text-slate-600 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Impacto en tu calendario de estudio:
            </div>
            <p>
              • <strong className="text-emerald-700">{estadisticasRonda.aciertosSeguros} preguntas</strong> afianzadas en cajas superiores (espaciadas hasta 35 días).
            </p>
            <p>
              • <strong className="text-amber-700">{estadisticasRonda.aciertosDuda} preguntas</strong> en observación para repasar en 24h.
            </p>
            <p>
              • <strong className="text-red-700">{estadisticasRonda.fallos} fallos</strong> devueltos a Caja 0 para corregir pronto.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-2.5 pt-6">
          {/* Botón acumulativo anti-duplicados */}
          {temaId && (
            <button
              onClick={() => handleGenerarPreguntas(true)}
              disabled={generandoNuevas}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {generandoNuevas ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Ampliando banco con Tribunal IA (+6)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ Generar +6 preguntas nuevas con IA</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={reiniciarRonda}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repasar Esta Ronda</span>
          </button>

          <Link
            href="/"
            className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-semibold text-xs text-center block"
          >
            Volver al Temario Principal
          </Link>
        </div>
      </main>
    );
  }

  // ESTADO 3: TEMA SIN PREGUNTAS (TARJETA CLARA CON TÍTULO REAL Y BOTÓN DE GENERACIÓN)
  if (!preguntaActual) {
    const temaInfo = temaActual || (temaId ? temas.find((t) => t.id === temaId) : null);

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            {temaInfo?.bloque || 'Temario Oficial Bomberos CAM'}
          </span>
          <h2 className="text-base font-bold text-slate-900 pt-1">
            {temaInfo ? `Tema ${temaInfo.id}: ${temaInfo.titulo}` : 'No hay preguntas disponibles'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {errorMotor ||
              'Este tema aún no tiene preguntas generadas en el banco compartido de Supabase.'}
          </p>
        </div>

        {errorMotor && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left w-full">
            <span className="font-bold block">Aviso del servidor:</span>
            <span>{errorMotor}</span>
          </div>
        )}

        {temaId ? (
          <button
            onClick={() => handleGenerarPreguntas(false)}
            disabled={generandoNuevas}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {generandoNuevas ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando lote oficial de 6 preguntas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>🔥 Generar primera tanda de preguntas oficiales del Tema {temaId}</span>
              </>
            )}
          </button>
        ) : null}

        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-800 font-semibold pt-1"
        >
          Volver al Temario Principal
        </Link>
      </div>
    );
  }

  const badgeCaja = obtenerEtiquetaCaja(preguntaActual.caja_leitner);

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full min-h-[100dvh] justify-between p-3.5 sm:p-4 select-none animate-fadeIn pb-8">
      {/* 1. TOP BAR */}
      <header className="space-y-2 pt-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 transition-all shadow-2xs"
            aria-label="Salir"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Progreso */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-900">
              {indiceActual + 1}
            </span>
            <span className="text-xs text-slate-400 font-mono">/</span>
            <span className="text-xs font-mono text-slate-500">
              {preguntasRonda.length}
            </span>
          </div>

          {/* Badges de estado Leitner y fallos */}
          <div className="flex items-center gap-1.5">
            {preguntaActual.fallos_totales > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                <AlertTriangle className="w-3 h-3" />
                {preguntaActual.fallos_totales} {preguntaActual.fallos_totales === 1 ? 'duda' : 'dudas'}
              </span>
            )}
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 font-mono"
            >
              Caja {preguntaActual.caja_leitner}
            </span>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
          <div
            className="h-full bg-red-600 transition-all duration-300 rounded-full"
            style={{ width: `${((indiceActual + 1) / preguntasRonda.length) * 100}%` }}
          />
        </div>

        {/* Tema y epígrafe */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 truncate pt-0.5">
          <span className="font-semibold text-red-600 truncate">
            Tema {preguntaActual.tema_id}: {temaActual?.titulo?.slice(0, 32)}...
          </span>
          {preguntaActual.dato_clave_etiqueta && (
            <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex-shrink-0 font-mono shadow-2xs">
              {preguntaActual.dato_clave_etiqueta}
            </span>
          )}
        </div>
      </header>

      {/* 2. ZONA CENTRAL: ENUNCIADO Y OPCIONES */}
      <main className="my-auto py-3 space-y-3 flex-1 flex flex-col justify-center">
        {/* ENUNCIADO */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {preguntaActual.enunciado}
          </p>
        </div>

        {/* TOGGLE PREVIO "CON DUDA" */}
        {!haRespondido && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-slate-500 font-medium">¿Dudas de la respuesta?</span>
            <button
              onClick={() => setMarcarConDudaPrevia(!marcarConDudaPrevia)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                marcarConDudaPrevia
                  ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{marcarConDudaPrevia ? 'Modo: Responder con Duda' : 'Marcar con Duda'}</span>
            </button>
          </div>
        )}

        {/* LAS 4 OPCIONES */}
        <div className="space-y-2">
          {preguntaActual.opcionesBarajadas.map((opcion, index) => {
            const letras = ['A', 'B', 'C', 'D'];
            const letra = letras[index] || '';
            const esLaCorrecta = opcion.indiceOriginal === preguntaActual.respuesta_correcta;
            const esLaSeleccionada = opcion.indiceOriginal === opcionSeleccionadaOriginal;

            // Estilos dinámicos según estado de corrección
            let botonClases = 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs active:scale-[0.99]';
            let badgeLetraClases = 'bg-slate-100 text-slate-600 border-slate-200';

            if (haRespondido) {
              if (esLaCorrecta) {
                // Correcta
                botonClases = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-400 shadow-2xs';
                badgeLetraClases = 'bg-emerald-600 text-white border-emerald-500';
              } else if (esLaSeleccionada) {
                // Marcó incorrecta
                botonClases = 'bg-rose-50 border-rose-400 text-rose-950 ring-1 ring-rose-400 shadow-2xs';
                badgeLetraClases = 'bg-rose-600 text-white border-rose-500';
              } else {
                // Otras no marcadas
                botonClases = 'bg-slate-50 border-slate-200/60 text-slate-400 opacity-60';
                badgeLetraClases = 'bg-slate-100 text-slate-400 border-slate-200';
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleSeleccionarOpcion(opcion.indiceOriginal)}
                disabled={haRespondido}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${botonClases}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 border mt-0.5 ${badgeLetraClases}`}
                >
                  {letra}
                </span>
                <span className="text-xs sm:text-[13px] leading-relaxed flex-1">
                  {opcion.texto}
                </span>
                {haRespondido && esLaCorrecta && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                {haRespondido && esLaSeleccionada && !esLaCorrecta && (
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* 3. PANEL DE FEEDBACK INMEDIATO */}
      {haRespondido && (
        <section className="space-y-2.5 pt-2 flex-shrink-0 animate-slideUp">
          {/* Si acertó: Selector de Certeza */}
          {opcionSeleccionadaOriginal === preguntaActual.respuesta_correcta && (
            <div className="p-3 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
              <span className="text-[11px] text-slate-600 font-semibold pl-1">
                ¿Cómo acertaste?
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_seguro')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    evaluacionSRS === 'acierto_seguro'
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  100% Seguro
                </button>
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_duda')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    evaluacionSRS === 'acierto_duda'
                      ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Con Duda
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta del Profesor */}
          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-slate-800 font-bold">
              <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                Explicación Técnica:
              </span>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                {evaluacionSRS === 'fallo'
                  ? 'Repaso en 10 min'
                  : evaluacionSRS === 'acierto_duda'
                  ? 'Repaso en 24h'
                  : 'Sube de Caja Leitner'}
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[12px]">
              {preguntaActual.explicacion_profesor}
            </p>
          </div>

          {/* BOTÓN ESTRELLA: VER PUNTO EXACTO EN EL TEMARIO */}
          <button
            onClick={() => setDrawerAbierto(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/90 border border-amber-300 text-amber-950 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Consultar cita oficial en el Temario</span>
          </button>

          {/* Botón Siguiente Pregunta */}
          <button
            onClick={handleSiguiente}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>
              {indiceActual + 1 < preguntasRonda.length
                ? 'Siguiente Pregunta'
                : 'Ver Resultados de la Ronda'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* DRAWER INFERIOR DESLIZABLE (VAUL) DEL TEMARIO SUBRAYADO */}
      <TemarioDrawer
        isOpen={drawerAbierto}
        onClose={() => setDrawerAbierto(false)}
        seccion={seccionActual}
        citaExacta={preguntaActual.cita_exacta}
        tituloTema={temaActual?.titulo}
        numeroTema={preguntaActual.tema_id}
      />
    </div>
  );
}

export default function PaginaJuego() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[100dvh]">
          <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TestGameContent />
    </Suspense>
  );
}
