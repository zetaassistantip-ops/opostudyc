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
} from 'lucide-react';
import { PreguntaJuego, TipoEvaluacionSRS, SeccionTemario, Tema } from '@/lib/types';
import {
  seleccionarMixTribunal,
  seleccionarCazadorFallos,
  barajarOpciones,
  calcularSRS,
  obtenerEtiquetaCaja,
} from '@/lib/srs';
import { getPreguntas, getSecciones, getTemas, actualizarPreguntaSRS } from '@/lib/supabase';
import TemarioDrawer from '@/components/TemarioDrawer';

function TestGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const modo = searchParams.get('modo') || 'repaso';
  const temaIdParam = searchParams.get('temaId');
  const temaId = temaIdParam ? parseInt(temaIdParam, 10) : undefined;

  // Estados de carga y partida
  const [cargando, setCargando] = useState(true);
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
      try {
        const [todasPreguntas, todasSecciones, todosTemas] = await Promise.all([
          getPreguntas(),
          getSecciones(),
          getTemas(),
        ]);

        setSecciones(todasSecciones);
        setTemas(todosTemas);

        let seleccionadas: PreguntaJuego[] = [];
        if (modo === 'fallos') {
          seleccionadas = seleccionarCazadorFallos(todasPreguntas, 15);
        } else if (modo === 'tema' && temaId) {
          const filtradas = todasPreguntas.filter((p) => p.tema_id === temaId);
          seleccionadas = filtradas.slice(0, 15).map(barajarOpciones);
        } else {
          // Mix Tribunal inteligente por defecto
          seleccionadas = seleccionarMixTribunal(todasPreguntas, 15, temaId);
        }

        // Si no hubiera preguntas para ese filtro específico, fallback con barajado de todas
        if (seleccionadas.length === 0) {
          seleccionadas = todasPreguntas.slice(0, 15).map(barajarOpciones);
        }

        setPreguntasRonda(seleccionadas);
      } catch (err) {
        console.error('Error preparando ronda:', err);
      } finally {
        setCargando(false);
      }
    }

    cargarPartida();
  }, [modo, temaId]);

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
      if (aciertos / total >= 0.7) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
        });
      }
    }
  };

  // Reiniciar otra ronda
  const reiniciarRonda = () => {
    router.refresh();
    window.location.reload();
  };

  if (cargando) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold text-zinc-200">Preparando ronda del Tribunal...</h2>
        <p className="text-xs text-zinc-500 mt-1">Barajando opciones y organizando curva SRS</p>
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
          <div className="inline-flex p-4 rounded-full bg-zinc-900 border border-zinc-800 shadow-xl">
            {porcentajeAcierto >= 80 ? (
              <Award className="w-14 h-14 text-emerald-400 animate-bounce" />
            ) : porcentajeAcierto >= 50 ? (
              <Flame className="w-14 h-14 text-amber-500" />
            ) : (
              <AlertTriangle className="w-14 h-14 text-red-500" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-black text-zinc-100">
              {porcentajeAcierto >= 80 ? '¡Ronda Impecable!' : porcentajeAcierto >= 50 ? 'Buen Entrenamiento' : 'Toca Reforzar'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              El algoritmo SRS ha reprogramado cada pregunta según tu nivel de certeza.
            </p>
          </div>

          {/* Tarjeta de métricas */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-emerald-900/40 text-center">
              <span className="text-2xl font-black text-emerald-400">
                {estadisticasRonda.aciertosSeguros}
              </span>
              <span className="block text-[11px] text-zinc-400 font-medium mt-0.5">
                Seguros (100%)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900 border border-amber-900/40 text-center">
              <span className="text-2xl font-black text-amber-400">
                {estadisticasRonda.aciertosDuda}
              </span>
              <span className="block text-[11px] text-zinc-400 font-medium mt-0.5">
                Con Duda
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900 border border-red-900/40 text-center">
              <span className="text-2xl font-black text-red-400">
                {estadisticasRonda.fallos}
              </span>
              <span className="block text-[11px] text-zinc-400 font-medium mt-0.5">
                Fallos
              </span>
            </div>
          </div>

          {/* Explicación de impacto SRS */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-left text-xs space-y-1.5 text-zinc-400">
            <div className="flex items-center gap-1.5 text-zinc-200 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Impacto en la Curva del Olvido:
            </div>
            <p>
              • <strong className="text-emerald-400">{estadisticasRonda.aciertosSeguros} preguntas</strong> suben de caja y se espacian hasta 35 días.
            </p>
            <p>
              • <strong className="text-amber-400">{estadisticasRonda.aciertosDuda} preguntas</strong> se quedan en Caja 1 y reaparecerán mañana en 24h.
            </p>
            <p>
              • <strong className="text-red-400">{estadisticasRonda.fallos} fallos</strong> vuelven a Caja 0 y te saldrán en 10 minutos para corregir la trampa.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-2.5 pt-6">
          <button
            onClick={reiniciarRonda}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jugar otra Ronda de Repaso</span>
          </button>

          <Link
            href="/chuleta"
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-zinc-300 font-semibold text-sm rounded-xl transition-all border border-zinc-800 flex items-center justify-center gap-2"
          >
            <span>Ver Chuleta Express de Datos Críticos</span>
          </Link>

          <Link
            href="/"
            className="w-full py-2.5 text-zinc-400 hover:text-zinc-200 font-medium text-xs text-center block"
          >
            Volver al Mapa de los 35 Temas
          </Link>
        </div>
      </main>
    );
  }

  if (!preguntaActual) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-zinc-400 text-sm">No se encontraron preguntas para esta ronda.</p>
        <Link href="/" className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">
          Volver al Inicio
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
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all"
            aria-label="Salir"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Progreso */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-zinc-200">
              {indiceActual + 1}
            </span>
            <span className="text-xs text-zinc-500 font-mono">/</span>
            <span className="text-xs font-mono text-zinc-400">
              {preguntasRonda.length}
            </span>
          </div>

          {/* Badges de estado Leitner y fallos */}
          <div className="flex items-center gap-1.5">
            {preguntaActual.fallos_totales > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/80 text-red-400">
                <AlertTriangle className="w-3 h-3" />
                Fallada {preguntaActual.fallos_totales} {preguntaActual.fallos_totales === 1 ? 'vez' : 'veces'}
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeCaja.badgeBg} ${badgeCaja.color}`}
            >
              Caja {preguntaActual.caja_leitner}
            </span>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
          <div
            className="h-full bg-red-600 transition-all duration-300 rounded-full"
            style={{ width: `${((indiceActual + 1) / preguntasRonda.length) * 100}%` }}
          />
        </div>

        {/* Tema y epígrafe */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 truncate pt-0.5">
          <span className="font-semibold text-red-400 truncate">
            Tema {preguntaActual.tema_id}: {temaActual?.titulo?.slice(0, 32)}...
          </span>
          {preguntaActual.dato_clave_etiqueta && (
            <span className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 flex-shrink-0 font-mono">
              {preguntaActual.dato_clave_etiqueta}
            </span>
          )}
        </div>
      </header>

      {/* 2. ZONA CENTRAL: ENUNCIADO Y OPCIONES (CON ANTI-MEMORIA VISUAL) */}
      <main className="my-auto py-3 space-y-3 flex-1 flex flex-col justify-center">
        {/* ENUNCIADO */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 shadow-md">
          <p className="text-sm font-semibold text-zinc-100 leading-snug">
            {preguntaActual.enunciado}
          </p>
        </div>

        {/* TOGGLE PREVIO "CON DUDA" (si aún no ha respondido) */}
        {!haRespondido && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-zinc-400">¿Dudas de la respuesta?</span>
            <button
              onClick={() => setMarcarConDudaPrevia(!marcarConDudaPrevia)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                marcarConDudaPrevia
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{marcarConDudaPrevia ? 'Modo: Responder con Duda' : 'Marcar con Duda'}</span>
            </button>
          </div>
        )}

        {/* LAS 4 OPCIONES BARAJADAS DINÁMICAMENTE */}
        <div className="space-y-2">
          {preguntaActual.opcionesBarajadas.map((opcion, index) => {
            const letras = ['A', 'B', 'C', 'D'];
            const letra = letras[index] || '';
            const esLaCorrecta = opcion.indiceOriginal === preguntaActual.respuesta_correcta;
            const esLaSeleccionada = opcion.indiceOriginal === opcionSeleccionadaOriginal;

            // Estilos dinámicos según estado de corrección
            let botonClases = 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-200 active:scale-[0.99]';
            let badgeLetraClases = 'bg-zinc-800 text-zinc-400 border-zinc-700';

            if (haRespondido) {
              if (esLaCorrecta) {
                // Correcta siempre verde
                botonClases = 'bg-emerald-950/90 border-emerald-500 text-emerald-100 font-medium ring-1 ring-emerald-500';
                badgeLetraClases = 'bg-emerald-600 text-white border-emerald-400';
              } else if (esLaSeleccionada) {
                // Marcó incorrecta en rojo
                botonClases = 'bg-red-950/90 border-red-600 text-red-100 ring-1 ring-red-600';
                badgeLetraClases = 'bg-red-600 text-white border-red-400';
              } else {
                // Otras no marcadas apagadas
                botonClases = 'bg-zinc-950/60 border-zinc-850/60 text-zinc-500 opacity-60';
                badgeLetraClases = 'bg-zinc-900 text-zinc-600 border-zinc-800';
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleSeleccionarOpcion(opcion.indiceOriginal)}
                disabled={haRespondido}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 shadow-xs ${botonClases}`}
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                {haRespondido && esLaSeleccionada && !esLaCorrecta && (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* 3. PANEL DE FEEDBACK INMEDIATO Y BOTÓN ESTRELLA DE TEMARIO */}
      {haRespondido && (
        <section className="space-y-2.5 pt-2 flex-shrink-0 animate-slideUp">
          {/* Si acertó: Selector de Certeza (100% Seguro vs Dudé/Descarte) */}
          {opcionSeleccionadaOriginal === preguntaActual.respuesta_correcta && (
            <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400 font-medium pl-1">
                ¿Cómo acertaste?
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_seguro')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    evaluacionSRS === 'acierto_seguro'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-xs'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                >
                  ✅ 100% Seguro
                </button>
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_duda')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    evaluacionSRS === 'acierto_duda'
                      ? 'bg-amber-600 border-amber-400 text-white shadow-xs'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                >
                  🤔 Con Duda / Descarte
                </button>
              </div>
            </div>
          )}

          {/* Tarjeta del Profesor con la explicación de la trampa */}
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5 shadow-md">
            <div className="flex items-center justify-between text-zinc-300 font-bold">
              <span className="flex items-center gap-1.5 text-red-400">
                👨‍🚒 Tribunal Calificador:
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {evaluacionSRS === 'fallo'
                  ? 'Repaso en 10 min'
                  : evaluacionSRS === 'acierto_duda'
                  ? 'Repaso en 24h'
                  : 'Sube de Caja Leitner'}
              </span>
            </div>
            <p className="text-zinc-300 leading-relaxed text-[12px]">
              {preguntaActual.explicacion_profesor}
            </p>
          </div>

          {/* BOTÓN ESTRELLA: VER PUNTO EXACTO EN EL TEMARIO */}
          <button
            onClick={() => setDrawerAbierto(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/70 to-yellow-950/70 border border-amber-600/60 hover:border-amber-500 text-amber-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-md shadow-amber-950/20"
          >
            <BookOpen className="w-4 h-4 text-yellow-400" />
            <span>📖 Ver punto exacto en el Temario (Subrayado Oficial)</span>
          </button>

          {/* Botón Siguiente Pregunta */}
          <button
            onClick={handleSiguiente}
            className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
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
