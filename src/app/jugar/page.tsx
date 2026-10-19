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
  SkipForward,
} from 'lucide-react';
import { PreguntaJuego, TipoEvaluacionSRS, SeccionTemario, Tema, TipoSesion, Pregunta } from '@/lib/types';
import {
  seleccionarMixTribunal,
  seleccionarCazadorFallos,
  barajarOpciones,
  calcularSRS,
  obtenerEtiquetaCaja,
} from '@/lib/srs';
import {
  getPreguntas,
  getSecciones,
  getTemas,
  actualizarPreguntaSRS,
  solicitarGeneracionMotorTema,
  guardarSesionEstudio,
  votarPregunta,
} from '@/lib/supabase';

/**
 * Formateador de la explicación del profesor
 * Resalta en negrita y estructura las 3 secciones pedagógicas:
 * 1. ✅ Por qué es la correcta
 * 2. ⚠️ Por qué fallan las demás (La Trampa)
 * 3. 🚒 Ejemplo práctico / Regla mnemotécnica
 */
function FormatoExplicacion({ texto }: { texto: string }) {
  if (!texto) return null;

  const tieneEstructura =
    texto.includes('Por qué es la correcta') ||
    texto.includes('✅') ||
    texto.includes('⚠️') ||
    texto.includes('🚒');

  if (tieneEstructura) {
    const lineas = texto.split(/\n+/);
    const bloques: Array<{
      tipo: 'correcta' | 'trampa' | 'ejemplo' | 'general';
      titulo?: string;
      contenido: string[];
    }> = [];
    let bloqueActual: {
      tipo: 'correcta' | 'trampa' | 'ejemplo' | 'general';
      titulo?: string;
      contenido: string[];
    } = {
      tipo: 'general',
      contenido: [],
    };

    for (const linea of lineas) {
      const l = linea.trim();
      if (!l) continue;

      if (l.includes('Por qué es la correcta') || l.startsWith('**✅') || l.startsWith('✅')) {
        if (bloqueActual.contenido.length > 0) bloques.push(bloqueActual);
        bloqueActual = {
          tipo: 'correcta',
          titulo: '✅ Por qué es la correcta',
          contenido: [l.replace(/^\*?\*?✅?\s*(Por qué es la correcta:?)?\*?\*?/i, '').trim()],
        };
      } else if (
        l.includes('Por qué fallan las demás') ||
        l.includes('La Trampa') ||
        l.startsWith('**⚠️') ||
        l.startsWith('⚠️')
      ) {
        if (bloqueActual.contenido.length > 0) bloques.push(bloqueActual);
        bloqueActual = {
          tipo: 'trampa',
          titulo: '⚠️ Por qué fallan las demás (La Trampa)',
          contenido: [
            l.replace(/^\*?\*?⚠️?\s*(Por qué fallan las demás.*?:?)?\*?\*?/i, '').trim(),
          ],
        };
      } else if (
        l.includes('Ejemplo práctico') ||
        l.includes('Regla mnemotécnica') ||
        l.startsWith('**🚒') ||
        l.startsWith('🚒')
      ) {
        if (bloqueActual.contenido.length > 0) bloques.push(bloqueActual);
        bloqueActual = {
          tipo: 'ejemplo',
          titulo: '🚒 Ejemplo práctico / Regla mnemotécnica',
          contenido: [
            l.replace(/^\*?\*?🚒?\s*(Ejemplo práctico.*?:?)?\*?\*?/i, '').trim(),
          ],
        };
      } else {
        bloqueActual.contenido.push(l);
      }
    }
    if (bloqueActual.contenido.length > 0) bloques.push(bloqueActual);

    return (
      <div className="space-y-2 pt-1">
        {bloques.map((b, i) => {
          let estiloCard = 'bg-white border-slate-300 text-slate-800';
          let estiloTitulo = 'text-slate-900';
          if (b.tipo === 'correcta') {
            estiloCard = 'bg-emerald-50/90 border-emerald-300 text-emerald-950';
            estiloTitulo = 'text-emerald-900 font-bold';
          } else if (b.tipo === 'trampa') {
            estiloCard = 'bg-amber-50/90 border-amber-300 text-amber-950';
            estiloTitulo = 'text-amber-900 font-bold';
          } else if (b.tipo === 'ejemplo') {
            estiloCard = 'bg-sky-50/90 border-sky-300 text-sky-950';
            estiloTitulo = 'text-sky-900 font-bold';
          }

          const textoLimpio = b.contenido.filter(Boolean).join(' ');

          return (
            <div
              key={i}
              className={`p-2.5 rounded-xl border text-[12px] leading-relaxed shadow-2xs ${estiloCard}`}
            >
              {b.titulo && (
                <div
                  className={`text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1.5 ${estiloTitulo}`}
                >
                  {b.titulo}
                </div>
              )}
              <div
                dangerouslySetInnerHTML={{
                  __html: textoLimpio.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong class="font-extrabold text-slate-950">$1</strong>'
                  ),
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback formato general con resaltado de negritas
  return (
    <div
      className="p-3 rounded-xl bg-white border border-slate-300 text-[12px] text-slate-800 leading-relaxed shadow-2xs"
      dangerouslySetInnerHTML={{
        __html: texto
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="font-extrabold text-slate-900">$1</strong>'
          )
          .replace(/\n\n/g, '<br/><br/>')
          .replace(/\n/g, '<br/>'),
      }}
    />
  );
}

function TestGameContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const temaIdRaw = searchParams.get('temaId') || searchParams.get('tema');
  const temaId = temaIdRaw ? parseInt(temaIdRaw, 10) : undefined;
  const modo = searchParams.get('modo') || (temaId ? 'tema' : 'repaso');
  const temasParam = searchParams.get('temas'); // "all" o "1,3,7"
  const limiteParam = searchParams.get('limite');
  const limitePreguntas = limiteParam ? parseInt(limiteParam, 10) : 15;
  const filtroParam = (searchParams.get('filtro') || searchParams.get('tipoPreguntas') || 'mixtas') as
    | 'nuevas'
    | 'falladas'
    | 'mixtas';

  // Estados de carga y partida
  const [cargando, setCargando] = useState(true);
  const [generandoMotor, setGenerandoMotor] = useState(false);
  const [mensajeMotor, setMensajeMotor] = useState<string>('');
  const [errorMotor, setErrorMotor] = useState<string | null>(null);
  const [generandoNuevas, setGenerandoNuevas] = useState(false);
  const [motivoVacio, setMotivoVacio] = useState<'nuevas' | 'falladas' | 'general' | null>(null);

  const [preguntasRonda, setPreguntasRonda] = useState<PreguntaJuego[]>([]);
  const [secciones, setSecciones] = useState<SeccionTemario[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [indiceActual, setIndiceActual] = useState(0);

  // Estados de la pregunta actual
  const [opcionSeleccionadaOriginal, setOpcionSeleccionadaOriginal] = useState<number | null>(null);
  const [haRespondido, setHaRespondido] = useState(false);
  const [evaluacionSRS, setEvaluacionSRS] = useState<TipoEvaluacionSRS | null>(null);
  const [marcarConDudaPrevia, setMarcarConDudaPrevia] = useState(false);

  // Sistema de valoración de preguntas
  const [votosPorPregunta, setVotosPorPregunta] = useState<
    Record<string, { tipo: 'buena' | 'regular' | 'mala'; enviado: boolean }>
  >({});
  const [votando, setVotando] = useState(false);

  // Historial de la ronda
  const [estadisticasRonda, setEstadisticasRonda] = useState({
    aciertosSeguros: 0,
    aciertosDuda: 0,
    fallos: 0,
    saltadas: 0,
  });
  const [rondaTerminada, setRondaTerminada] = useState(false);

  // Carga inicial de datos
  useEffect(() => {
    async function cargarPartida() {
      setCargando(true);
      setErrorMotor(null);
      setMotivoVacio(null);
      try {
        const [todasSecciones, todosTemas] = await Promise.all([
          getSecciones(),
          getTemas(),
        ]);

        setSecciones(todasSecciones);
        setTemas(todosTemas);

        let poolBase: Pregunta[] = [];

        if (modo === 'general') {
          const todas = await getPreguntas();
          poolBase = todas;
          if (temasParam && temasParam !== 'all') {
            const idsPermitidos = temasParam
              .split(',')
              .map((id) => parseInt(id.trim(), 10))
              .filter((n) => !isNaN(n));

            if (idsPermitidos.length > 0) {
              poolBase = todas.filter((p) => idsPermitidos.includes(p.tema_id));
            }
          }
        } else if (modo === 'tema' && temaId) {
          poolBase = await getPreguntas(temaId);
        } else if (modo === 'fallos') {
          const todas = await getPreguntas();
          poolBase = todas;
        } else {
          // Repaso SRS general
          const todas = await getPreguntas();
          poolBase = todas;
        }

        // Aplicar el filtro de modo de preguntas:
        // 1. 'nuevas': preguntas nunca vistas (id no en progreso / ultima_vez_vista === null)
        // 2. 'falladas': caja_leitner <= 1 o fallos_totales > 0
        // 3. 'mixtas': mezcla aleatoria priorizando nuevas y pendientes de repaso
        let poolFiltrado: Pregunta[] = [];
        const efectivoFiltro = modo === 'fallos' ? 'falladas' : filtroParam;

        if (efectivoFiltro === 'nuevas') {
          poolFiltrado = poolBase.filter((p) => p.ultima_vez_vista === null);
          if (poolFiltrado.length === 0) {
            setMotivoVacio('nuevas');
          }
        } else if (efectivoFiltro === 'falladas') {
          poolFiltrado = poolBase.filter(
            (p) => p.fallos_totales > 0 || (p.caja_leitner <= 1 && p.ultima_vez_vista !== null)
          );
          if (poolFiltrado.length === 0) {
            setMotivoVacio('falladas');
          }
        } else {
          // 'mixtas': mezcla inteligente barajada
          const nuevas = poolBase.filter((p) => p.ultima_vez_vista === null);
          const ahora = Date.now();
          const pendientes = poolBase.filter(
            (p) =>
              p.ultima_vez_vista !== null &&
              (new Date(p.proxima_revision).getTime() <= ahora || p.caja_leitner <= 2)
          );
          const afianzadas = poolBase.filter(
            (p) =>
              p.ultima_vez_vista !== null &&
              new Date(p.proxima_revision).getTime() > ahora &&
              p.caja_leitner > 2
          );

          // Barajado aleatorio para no mantener orden estricto de antigüedad
          poolFiltrado = [
            ...nuevas.sort(() => Math.random() - 0.5),
            ...pendientes.sort(() => Math.random() - 0.5),
            ...afianzadas.sort(() => Math.random() - 0.5),
          ];

          if (poolFiltrado.length === 0) {
            setMotivoVacio('general');
          }
        }

        // 4. Si el usuario pide más preguntas de las existentes para ese filtro,
        // generar automáticamente un lote de 6 preguntas nuevas y arrancar con las disponibles + esas 6
        if (poolFiltrado.length < limitePreguntas) {
          let genTemaId = temaId;
          if (!genTemaId && temasParam && temasParam !== 'all') {
            const ids = temasParam
              .split(',')
              .map((id) => parseInt(id.trim(), 10))
              .filter((n) => !isNaN(n));
            if (ids.length > 0) genTemaId = ids[0];
          }
          if (!genTemaId && poolFiltrado.length > 0) {
            genTemaId = poolFiltrado[0].tema_id;
          }
          if (!genTemaId) genTemaId = 1;

          try {
            const resAuto = await solicitarGeneracionMotorTema(genTemaId, true, 6);
            if (resAuto.ok && resAuto.preguntas && resAuto.preguntas.length > 0) {
              const idsExistentes = new Set(poolFiltrado.map((p) => p.id));
              const nuevasNuevas = resAuto.preguntas.filter((p) => !idsExistentes.has(p.id));
              if (nuevasNuevas.length > 0) {
                poolFiltrado = [...poolFiltrado, ...nuevasNuevas];
                setMotivoVacio(null);
              }
            }
          } catch (e) {
            console.warn('Aviso en generación automática de preguntas faltantes:', e);
          }
        }

        if (poolFiltrado.length === 0) {
          setPreguntasRonda([]);
        } else {
          // Barajar siempre la selección final para máxima variedad
          const barajadas = [...poolFiltrado]
            .sort(() => Math.random() - 0.5)
            .slice(0, limitePreguntas);

          setPreguntasRonda(barajadas.map(barajarOpciones));
        }
      } catch (err) {
        console.error('Error preparando ronda:', err);
        setErrorMotor('Error preparando la sesión de preguntas.');
      } finally {
        setCargando(false);
      }
    }

    cargarPartida();
  }, [modo, temaId, temasParam, limitePreguntas, filtroParam]);

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

    // Actualizar SRS en Supabase y local
    const nuevoSRS = calcularSRS(preguntaActual, evaluacion);
    actualizarPreguntaSRS(preguntaActual.id, nuevoSRS);

    // Actualizar estadísticas de la ronda
    setEstadisticasRonda((prev) => ({
      ...prev,
      aciertosSeguros: prev.aciertosSeguros + (evaluacion === 'acierto_seguro' ? 1 : 0),
      aciertosDuda: prev.aciertosDuda + (evaluacion === 'acierto_duda' ? 1 : 0),
      fallos: prev.fallos + (evaluacion === 'fallo' ? 1 : 0),
    }));
  };

  // 2. OPCIÓN DE SALTAR PREGUNTA (Dejar en blanco)
  const handleSaltarPregunta = () => {
    if (haRespondido || !preguntaActual) return;

    // No se registra acierto ni fallo en SRS y no penaliza la nota
    setEstadisticasRonda((prev) => ({
      ...prev,
      saltadas: prev.saltadas + 1,
    }));

    if (indiceActual + 1 < preguntasRonda.length) {
      setIndiceActual((prev) => prev + 1);
      setOpcionSeleccionadaOriginal(null);
      setHaRespondido(false);
      setEvaluacionSRS(null);
      setMarcarConDudaPrevia(false);
    } else {
      finalizarRonda();
    }
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

  // 3. SISTEMA DE VALORACIÓN DE PREGUNTAS
  const handleVotar = async (tipo: 'buena' | 'regular' | 'mala') => {
    if (!preguntaActual || votosPorPregunta[preguntaActual.id]?.enviado || votando) return;

    setVotando(true);
    // Optimistic update
    setVotosPorPregunta((prev) => ({
      ...prev,
      [preguntaActual.id]: { tipo, enviado: true },
    }));

    // Actualizar contadores locales
    if (tipo === 'buena') preguntaActual.votos_buena = (preguntaActual.votos_buena || 0) + 1;
    if (tipo === 'regular') preguntaActual.votos_regular = (preguntaActual.votos_regular || 0) + 1;
    if (tipo === 'mala') preguntaActual.votos_mala = (preguntaActual.votos_mala || 0) + 1;

    try {
      await votarPregunta(preguntaActual.id, tipo);
    } catch (e) {
      console.error('Error votando:', e);
    } finally {
      setVotando(false);
    }
  };

  const finalizarRonda = () => {
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

    // Guardar sesión en el Diario de Estudio
    let tipoSesion: TipoSesion = 'tema';
    let nombreSesion = 'Sesión de Estudio';

    if (modo === 'general') {
      tipoSesion = 'simulacro_general';
      const countTemas =
        temasParam === 'all' || !temasParam ? 35 : temasParam.split(',').filter(Boolean).length;
      nombreSesion =
        temasParam === 'all' || !temasParam
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
  };

  // Pasar a la siguiente pregunta
  const handleSiguiente = () => {
    if (indiceActual + 1 < preguntasRonda.length) {
      setIndiceActual((prev) => prev + 1);
      setOpcionSeleccionadaOriginal(null);
      setHaRespondido(false);
      setEvaluacionSRS(null);
      setMarcarConDudaPrevia(false);
    } else {
      finalizarRonda();
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
        // Priorizar las recién creadas
        const nuevas = filtradas.filter((p) => p.ultima_vez_vista === null);
        const seleccion = (nuevas.length > 0 ? nuevas : filtradas)
          .sort(() => Math.random() - 0.5)
          .slice(0, limitePreguntas);

        setPreguntasRonda(seleccion.map(barajarOpciones));
        setIndiceActual(0);
        setOpcionSeleccionadaOriginal(null);
        setHaRespondido(false);
        setEvaluacionSRS(null);
        setRondaTerminada(false);
        setMotivoVacio(null);
        setEstadisticasRonda({ aciertosSeguros: 0, aciertosDuda: 0, fallos: 0, saltadas: 0 });
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

  // Fabricar 5 preguntas nuevas con IA de los temas seleccionados y continuar el test sin perder racha ni puntuación
  const handleFabricarMasYContinuar = async () => {
    let targetTema = temaId;
    if (!targetTema && temasParam && temasParam !== 'all') {
      const ids = temasParam
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !isNaN(n));
      if (ids.length > 0) {
        targetTema = ids[Math.floor(Math.random() * ids.length)];
      }
    }
    if (!targetTema && preguntasRonda.length > 0) {
      targetTema = preguntasRonda[preguntaActual ? indiceActual : 0]?.tema_id;
    }
    if (!targetTema) targetTema = 1;

    setGenerandoNuevas(true);
    setErrorMotor(null);
    try {
      const res = await solicitarGeneracionMotorTema(targetTema, true, 5);
      if (res.ok && res.preguntas && res.preguntas.length > 0) {
        const idsExistentes = new Set(preguntasRonda.map((p) => p.id));
        const nuevasLibres = res.preguntas.filter((p) => !idsExistentes.has(p.id));
        const loteAgregar = (nuevasLibres.length > 0 ? nuevasLibres : res.preguntas)
          .slice(0, 5)
          .map(barajarOpciones);

        if (loteAgregar.length > 0) {
          const nuevoIndice = preguntasRonda.length;
          setPreguntasRonda((prev) => [...prev, ...loteAgregar]);
          setIndiceActual(nuevoIndice);
          setOpcionSeleccionadaOriginal(null);
          setHaRespondido(false);
          setEvaluacionSRS(null);
          setMarcarConDudaPrevia(false);
          setRondaTerminada(false);
        }
      } else {
        alert(res.error || 'No se pudieron generar más preguntas en este momento.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el Tribunal IA para generar 5 preguntas más.');
    } finally {
      setGenerandoNuevas(false);
    }
  };

  // Reiniciar otra ronda con las preguntas actuales
  const reiniciarRonda = () => {
    if (preguntasRonda.length > 0) {
      setIndiceActual(0);
      setOpcionSeleccionadaOriginal(null);
      setHaRespondido(false);
      setEvaluacionSRS(null);
      setRondaTerminada(false);
      setEstadisticasRonda({ aciertosSeguros: 0, aciertosDuda: 0, fallos: 0, saltadas: 0 });
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
              {porcentajeAcierto >= 80
                ? '¡Ronda Completada con Éxito!'
                : porcentajeAcierto >= 50
                ? 'Buen Entrenamiento'
                : 'Toca Reforzar Conceptos'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              El algoritmo Leitner ha programado cada pregunta según tu nivel de acierto individual.
            </p>
          </div>

          {/* Tarjeta de métricas */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-xl font-black text-emerald-600">
                {estadisticasRonda.aciertosSeguros}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                Seguros
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-xl font-black text-amber-600">
                {estadisticasRonda.aciertosDuda}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                Con Duda
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-xl font-black text-red-600">
                {estadisticasRonda.fallos}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                Fallos
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
              <span className="text-xl font-black text-slate-600">
                {estadisticasRonda.saltadas}
              </span>
              <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                Saltadas
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
            {estadisticasRonda.saltadas > 0 && (
              <p>
                • <strong className="text-slate-700">{estadisticasRonda.saltadas} saltadas</strong> sin alteración de memoria ni penalización.
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="space-y-2.5 pt-6">
          <button
            type="button"
            onClick={handleFabricarMasYContinuar}
            disabled={generandoNuevas}
            className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 text-white font-extrabold text-sm sm:text-base rounded-2xl border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {generandoNuevas ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Fabricando 5 preguntas nuevas con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>⚡ ¿Fabricar 5 preguntas nuevas más y continuar el test?</span>
              </>
            )}
          </button>

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

  // ESTADO 3: TEMA O FILTRO SIN PREGUNTAS
  if (!preguntaActual) {
    const temaInfo = temaActual || (temaId ? temas.find((t) => t.id === temaId) : null);

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
          {motivoVacio === 'nuevas' ? (
            <Sparkles className="w-7 h-7 text-amber-600" />
          ) : motivoVacio === 'falladas' ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          ) : (
            <BookOpen className="w-7 h-7" />
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            {motivoVacio === 'nuevas'
              ? 'Todas las preguntas completadas'
              : motivoVacio === 'falladas'
              ? 'Sin fallos pendientes'
              : temaInfo?.bloque || 'Bomberos CAM'}
          </span>

          <h2 className="text-base font-bold text-slate-900 pt-1">
            {motivoVacio === 'nuevas'
              ? `¡Has respondido todas las preguntas ${temaInfo ? `del Tema ${temaInfo.id}` : 'de este ámbito'}!`
              : motivoVacio === 'falladas'
              ? '¡Enhorabuena! No tienes fallos pendientes'
              : temaInfo
              ? `Tema ${temaInfo.id}: ${temaInfo.titulo}`
              : 'No hay preguntas disponibles'}
          </h2>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {motivoVacio === 'nuevas'
              ? 'Ya has hecho todas las preguntas de este tema. Genera una tanda nueva con IA para seguir practicando o haz un test de repaso mixto.'
              : motivoVacio === 'falladas'
              ? 'No tienes ninguna pregunta fallada registrada en este tema o selección. ¡Buen trabajo de retención!'
              : errorMotor || 'Este tema aún no tiene preguntas generadas en el banco compartido de Supabase.'}
          </p>
        </div>

        {errorMotor && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left w-full">
            <span className="font-bold block">Aviso del servidor:</span>
            <span>{errorMotor}</span>
          </div>
        )}

        {/* Botón de generación con IA si es un tema o faltan nuevas */}
        {temaId ? (
          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => handleGenerarPreguntas(true)}
              disabled={generandoNuevas}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {generandoNuevas ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando tanda de 6 preguntas con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ Generar +6 preguntas nuevas con IA (Tema {temaId})</span>
                </>
              )}
            </button>

            <Link
              href={`/jugar?modo=tema&temaId=${temaId}&filtro=mixtas`}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 block text-center"
            >
              <span>🔄 Hacer Test Mixto (Repasar tema)</span>
            </Link>
          </div>
        ) : (
          <Link
            href="/jugar?modo=general&temas=all&filtro=mixtas"
            className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl transition-all block text-center"
          >
            Hacer Test Mixto con Todos los Temas
          </Link>
        )}

        <Link
          href="/"
          className="text-xs text-slate-500 hover:text-slate-800 font-semibold pt-2"
        >
          Volver al Temario Principal
        </Link>
      </div>
    );
  }

  // Resolver letras en UI para feedback exacto
  const indexSeleccionadoUI = preguntaActual.opcionesBarajadas.findIndex(
    (op) => op.indiceOriginal === opcionSeleccionadaOriginal
  );
  const letraSeleccionadaUI = ['A', 'B', 'C', 'D'][indexSeleccionadoUI] || '';

  const indexCorrectaUI = preguntaActual.opcionesBarajadas.findIndex(
    (op) => op.indiceOriginal === preguntaActual.respuesta_correcta
  );
  const letraCorrectaUI = ['A', 'B', 'C', 'D'][indexCorrectaUI] || '';

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
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 font-mono">
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

      {/* 2. ZONA CENTRAL: ENUNCIADO, TOGGLES Y LAS 4 OPCIONES */}
      <main className="my-auto py-3 space-y-3 flex-1 flex flex-col justify-center">
        {/* ENUNCIADO */}
        <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a]">
          <p className="text-sm font-bold text-slate-900 leading-snug">
            {preguntaActual.enunciado}
          </p>
        </div>

        {/* TOGGLE PREVIO "CON DUDA" Y BOTÓN "SALTAR PREGUNTA" (2. Opción de saltar) */}
        {!haRespondido && (
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setMarcarConDudaPrevia(!marcarConDudaPrevia)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border-2 ${
                marcarConDudaPrevia
                  ? 'bg-amber-100 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#0f172a] font-bold'
                  : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-50 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{marcarConDudaPrevia ? 'Modo: Con Duda' : 'Marcar con Duda'}</span>
            </button>

            <button
              onClick={handleSaltarPregunta}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Pasa a la siguiente pregunta sin registrar fallo ni penalizar"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Saltar pregunta ⏭️</span>
            </button>
          </div>
        )}

        {/* LAS 4 OPCIONES BARAJADAS */}
        <div className="space-y-2">
          {preguntaActual.opcionesBarajadas.map((opcion, index) => {
            const letras = ['A', 'B', 'C', 'D'];
            const letra = letras[index] || '';
            const esLaCorrecta = opcion.indiceOriginal === preguntaActual.respuesta_correcta;
            const esLaSeleccionada = opcion.indiceOriginal === opcionSeleccionadaOriginal;

            let botonClases =
              'bg-white hover:bg-slate-50 border-2 border-slate-900 text-slate-900 shadow-[3px_3px_0px_0px_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform duration-75';
            let badgeLetraClases =
              'bg-slate-100 text-slate-900 border-2 border-slate-900 font-mono font-bold';

            if (haRespondido) {
              if (esLaCorrecta) {
                botonClases =
                  'bg-emerald-50 border-2 border-emerald-700 text-emerald-950 font-semibold shadow-[3px_3px_0px_0px_#047857]';
                badgeLetraClases =
                  'bg-emerald-700 text-white border-2 border-emerald-800 font-mono font-bold';
              } else if (esLaSeleccionada) {
                botonClases =
                  'bg-red-50 border-2 border-red-700 text-red-950 font-semibold shadow-[3px_3px_0px_0px_#b91c1c]';
                badgeLetraClases =
                  'bg-red-700 text-white border-2 border-red-800 font-mono font-bold';
              } else {
                botonClases = 'bg-slate-50 border-2 border-slate-300 text-slate-400 opacity-60';
                badgeLetraClases =
                  'bg-slate-100 text-slate-400 border border-slate-300 font-mono';
              }
            }

            return (
              <button
                key={index}
                onClick={() => handleSeleccionarOpcion(opcion.indiceOriginal)}
                disabled={haRespondido}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${botonClases}`}
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

      {/* 3. PANEL DE FEEDBACK INMEDIATO Y REDISEÑADO */}
      {haRespondido && (
        <section className="space-y-2.5 pt-2 flex-shrink-0 animate-slideUp">
          {/* AVISO CLARO SI HA FALLADO */}
          {opcionSeleccionadaOriginal !== preguntaActual.respuesta_correcta && (
            <div className="p-3 rounded-xl bg-red-50 border-2 border-red-600 shadow-[2px_2px_0px_0px_#dc2626] flex items-center justify-between gap-2 text-red-950">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-xs font-bold">
                  Tu respuesta ({letraSeleccionadaUI}) es incorrecta
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-red-300 text-red-700 flex-shrink-0">
                Correcta: {letraCorrectaUI}
              </span>
            </div>
          )}

          {/* SI ACERTÓ: SELECTOR DE CERTEZA */}
          {opcionSeleccionadaOriginal === preguntaActual.respuesta_correcta && (
            <div className="p-3 rounded-xl bg-emerald-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 pl-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span className="text-[11px] text-emerald-950 font-bold">
                  ¡Respuesta ({letraCorrectaUI}) Correcta!
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_seguro')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-2 ${
                    evaluacionSRS === 'acierto_seguro'
                      ? 'bg-emerald-600 border-slate-900 text-white shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  100% Seguro
                </button>
                <button
                  onClick={() => cambiarCertezaAcierto('acierto_duda')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-2 ${
                    evaluacionSRS === 'acierto_duda'
                      ? 'bg-amber-500 border-slate-900 text-slate-950 shadow-[2px_2px_0px_0px_#0f172a]'
                      : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Con Duda
                </button>
              </div>
            </div>
          )}

          {/* TARJETA DEL PROFESOR CON EXPLICACIÓN FORMATEADA Y VALORACIÓN */}
          <div className="p-3.5 rounded-xl bg-slate-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-900 font-bold">
              <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                Explicación Pedagógica:
              </span>
              <span className="text-[11px] text-slate-600 font-mono font-bold">
                {evaluacionSRS === 'fallo'
                  ? 'Repaso en 10 min'
                  : evaluacionSRS === 'acierto_duda'
                  ? 'Repaso en 24h'
                  : 'Sube de Caja Leitner'}
              </span>
            </div>

            {/* Texto estructurado y resaltado */}
            <FormatoExplicacion texto={preguntaActual.explicacion_profesor} />

            {/* 3. SISTEMA DE VALORACIÓN DE PREGUNTAS (👍 Buena, 😐 Regular, 👎 Mala) */}
            <div className="pt-2.5 mt-2 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700">
                ¿Qué te ha parecido esta pregunta?
              </span>

              {votosPorPregunta[preguntaActual.id]?.enviado ? (
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>¡Gracias por valorar!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleVotar('buena')}
                    disabled={votando}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 active:scale-95 border-2 border-slate-900 text-slate-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[1px_1px_0px_0px_#0f172a]"
                  >
                    <span>👍 Buena</span>
                    {(preguntaActual.votos_buena || 0) > 0 && (
                      <span className="text-[10px] font-mono text-slate-500">
                        ({preguntaActual.votos_buena})
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleVotar('regular')}
                    disabled={votando}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 active:scale-95 border-2 border-slate-900 text-slate-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[1px_1px_0px_0px_#0f172a]"
                  >
                    <span>😐 Regular</span>
                    {(preguntaActual.votos_regular || 0) > 0 && (
                      <span className="text-[10px] font-mono text-slate-500">
                        ({preguntaActual.votos_regular})
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleVotar('mala')}
                    disabled={votando}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 active:scale-95 border-2 border-slate-900 text-slate-800 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[1px_1px_0px_0px_#0f172a]"
                  >
                    <span>👎 Mala</span>
                    {(preguntaActual.votos_mala || 0) > 0 && (
                      <span className="text-[10px] font-mono text-slate-500">
                        ({preguntaActual.votos_mala})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN FABRICAR 5 MÁS Y SEGUIR (SI ESTÁ EN LA ÚLTIMA PREGUNTA) */}
          {indiceActual + 1 >= preguntasRonda.length && (
            <button
              type="button"
              onClick={handleFabricarMasYContinuar}
              disabled={generandoNuevas}
              className="w-full py-3 bg-amber-50 hover:bg-amber-100 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-60 text-amber-950 font-bold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all flex items-center justify-center gap-2 cursor-pointer mb-2"
            >
              {generandoNuevas ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  <span>Fabricando 5 preguntas nuevas con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>⚡ ¿Fabricar 5 preguntas nuevas más y continuar el test?</span>
                </>
              )}
            </button>
          )}

          {/* BOTÓN SIGUIENTE PREGUNTA / VER RESULTADOS */}
          <button
            onClick={handleSiguiente}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-white font-bold text-sm rounded-xl transition-all border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center gap-2 cursor-pointer"
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
