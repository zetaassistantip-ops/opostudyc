import { Pregunta, PreguntaJuego, OpcionBarajada, TipoEvaluacionSRS, ResultadoSRS } from './types';

/**
 * 1. ANTI-MEMORIA VISUAL:
 * Baraja aleatoriamente las 4 opciones preservando la referencia al índice original
 * para que el opositor jamás memorice la posición ("la C es la buena").
 */
export function barajarOpciones(pregunta: Pregunta): PreguntaJuego {
  const items: OpcionBarajada[] = pregunta.opciones.map((texto, indiceOriginal) => ({
    texto,
    indiceOriginal,
  }));

  // Algoritmo Fisher-Yates
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return {
    ...pregunta,
    opcionesBarajadas: items,
  };
}

/**
 * Clasificación y métricas universales contra el olvido
 */

/**
 * Determina si una pregunta ha sido vista/intentada por el opositor
 */
export function esPreguntaVista(p: Pregunta): boolean {
  return (
    p.ultima_vez_vista !== null ||
    (p.caja_leitner ?? 0) > 0 ||
    (p.fallos_totales ?? 0) > 0 ||
    (p.aciertos_consecutivos ?? 0) > 0
  );
}

/**
 * Determina si una pregunta tiene un Fallo Activo (pregunta atascada sin resolver).
 * Regla: Caja 0 representa exclusivamente Fallo Activo si el usuario la ha visto y fallado.
 * Si ya se ha acertado (caja_leitner >= 1), el fallo queda resuelto y ya no es un fallo activo.
 */
export function esFalloActivo(p: Pregunta): boolean {
  if (!esPreguntaVista(p)) return false;
  return (p.caja_leitner ?? 0) === 0 && (p.fallos_totales ?? 0) > 0;
}

/**
 * Determina si una pregunta está Acertada / Superada
 * Regla: Caja >= 1 (acertada a la primera o ya corregida tras un fallo) o si fue vista y no es un fallo activo.
 */
export function esPreguntaAcertada(p: Pregunta): boolean {
  if (!esPreguntaVista(p)) return false;
  return (p.caja_leitner ?? 0) >= 1 || !esFalloActivo(p);
}

/**
 * Determina si una pregunta está Consolidada a largo plazo (caja >= 2)
 */
export function esPreguntaConsolidada(p: Pregunta): boolean {
  return (p.caja_leitner ?? 0) >= 2;
}

/**
 * Calcula las métricas pedagógicas unificadas para un conjunto de preguntas
 */
export function calcularMetricasPreguntas(preguntas: Pregunta[]) {
  const vistas = preguntas.filter(esPreguntaVista);
  const totalVistas = vistas.length;
  const acertadas = vistas.filter(esPreguntaAcertada).length;
  const falladasActivas = totalVistas - acertadas;
  const porcentajeRetencion = totalVistas > 0 ? Math.round((acertadas / totalVistas) * 100) : 0;
  const porcentajeFallos = totalVistas > 0 ? 100 - porcentajeRetencion : 0;

  return {
    total: preguntas.length,
    vistas: totalVistas,
    acertadas,
    falladasActivas,
    porcentajeRetencion,
    porcentajeFallos,
  };
}

/**
 * 2. LÓGICA PEDAGÓGICA Y ALGORITMO SRS CONTRA LA CURVA DEL OLVIDO:
 * Calcula el nuevo estado de la pregunta según el nivel de certeza del opositor.
 */
export function calcularSRS(
  preguntaActual: Pick<Pregunta, 'caja_leitner' | 'fallos_totales' | 'aciertos_consecutivos'>,
  tipo: TipoEvaluacionSRS,
  fechaBase: Date = new Date()
): ResultadoSRS {
  const ahora = fechaBase.getTime();
  const MINUTO = 60 * 1000;
  const HORA = 60 * MINUTO;
  const DIA = 24 * HORA;

  if (tipo === 'fallo') {
    // Fallo: Cae a Caja 0 (Fallo Activo), suma fallo, y vuelve a salir en 10 minutos (en la misma sesión)
    const proxima = new Date(ahora + 10 * MINUTO);
    return {
      caja_leitner: 0,
      proxima_revision: proxima.toISOString(),
      fallos_totales: (preguntaActual.fallos_totales ?? 0) + 1,
      aciertos_consecutivos: 0,
      ultima_vez_vista: new Date(ahora).toISOString(),
      intervaloTexto: 'En 10 minutos (Repaso inmediato hoy)',
    };
  }

  if (tipo === 'acierto_duda') {
    // Acierto con duda / por descarte: No se da por dominada. Se fija en Caja 1 y se repasa en 24h
    const proxima = new Date(ahora + 1 * DIA);
    return {
      caja_leitner: 1,
      proxima_revision: proxima.toISOString(),
      fallos_totales: preguntaActual.fallos_totales ?? 0,
      aciertos_consecutivos: (preguntaActual.aciertos_consecutivos ?? 0) + 1,
      ultima_vez_vista: new Date(ahora).toISOString(),
      intervaloTexto: 'En 24 horas (Afianzar duda)',
    };
  }

  // Acierto Seguro (100% de confianza)
  // Si no existía registro previo o venía de fallo (caja 0): caja_leitner = 1.
  // Si ya existía registro con caja >= 1: sube caja_leitner + 1 (máx 5)
  const cajaActual = preguntaActual.caja_leitner ?? 0;
  const nuevaCaja = Math.min(5, Math.max(1, cajaActual + 1));
  let intervaloMs: number;
  let intervaloTexto: string;

  switch (nuevaCaja) {
    case 1:
      intervaloMs = 1 * DIA;
      intervaloTexto = 'En 1 día';
      break;
    case 2:
      intervaloMs = 3 * DIA;
      intervaloTexto = 'En 3 días';
      break;
    case 3:
      intervaloMs = 7 * DIA;
      intervaloTexto = 'En 1 semana (7 días)';
      break;
    case 4:
      intervaloMs = 16 * DIA;
      intervaloTexto = 'En 16 días';
      break;
    case 5:
    default:
      intervaloMs = 35 * DIA;
      intervaloTexto = 'En 35 días (¡Dominada!)';
      break;
  }

  const proxima = new Date(ahora + intervaloMs);
  return {
    caja_leitner: nuevaCaja,
    proxima_revision: proxima.toISOString(),
    fallos_totales: preguntaActual.fallos_totales ?? 0,
    aciertos_consecutivos: (preguntaActual.aciertos_consecutivos ?? 0) + 1,
    ultima_vez_vista: new Date(ahora).toISOString(),
    intervaloTexto,
  };
}

/**
 * 3. SELECTOR INTELIGENTE DE PARTIDA ("Mix Tribunal"):
 * Filtra y prioriza preguntas:
 *  1º Vencidas (proxima_revision <= NOW()) ordenadas por mayor fallos_totales y menor caja_leitner.
 *  2º Nuevas (caja_leitner = 0 y nunca vistas).
 *  3º Resto para completar el cupo solicitado (ej. 15).
 */
export function seleccionarMixTribunal(
  todasLasPreguntas: Pregunta[],
  cantidad: number = 15,
  filtroTemaId?: number
): PreguntaJuego[] {
  let pool = todasLasPreguntas;
  if (filtroTemaId) {
    pool = pool.filter((p) => p.tema_id === filtroTemaId);
  }

  const ahora = new Date().getTime();

  // 1. Preguntas vencidas de repaso (en llamas)
  const vencidas = pool.filter(
    (p) => p.ultima_vez_vista !== null && new Date(p.proxima_revision).getTime() <= ahora
  );

  // Ordenar vencidas: primero las que más se han fallado, luego menor caja Leitner
  vencidas.sort((a, b) => {
    if (b.fallos_totales !== a.fallos_totales) {
      return b.fallos_totales - a.fallos_totales;
    }
    return a.caja_leitner - b.caja_leitner;
  });

  // 2. Preguntas nuevas nunca vistas
  const nuevas = pool.filter((p) => p.ultima_vez_vista === null);
  // Barajar aleatoriamente las nuevas
  nuevas.sort(() => Math.random() - 0.5);

  // 3. Resto de preguntas (ya repasadas pero no vencidas hoy)
  const resto = pool.filter(
    (p) => p.ultima_vez_vista !== null && new Date(p.proxima_revision).getTime() > ahora
  );
  resto.sort((a, b) => new Date(a.proxima_revision).getTime() - new Date(b.proxima_revision).getTime());

  // Combinar prioridades
  const seleccionadas: Pregunta[] = [];

  for (const p of vencidas) {
    if (seleccionadas.length >= cantidad) break;
    seleccionadas.push(p);
  }

  for (const p of nuevas) {
    if (seleccionadas.length >= cantidad) break;
    seleccionadas.push(p);
  }

  for (const p of resto) {
    if (seleccionadas.length >= cantidad) break;
    seleccionadas.push(p);
  }

  return seleccionadas.map(barajarOpciones);
}

/**
 * Selector especial "Cazador de Fallos":
 * Selecciona exclusivamente preguntas con fallos previos acumulados.
 */
export function seleccionarCazadorFallos(
  todasLasPreguntas: Pregunta[],
  cantidad: number = 15
): PreguntaJuego[] {
  const conFallos = todasLasPreguntas
    .filter(esFalloActivo)
    .sort((a, b) => (b.fallos_totales ?? 0) - (a.fallos_totales ?? 0));

  return conFallos.slice(0, cantidad).map(barajarOpciones);
}

/**
 * Devuelve la etiqueta visual de la Caja Leitner
 */
export function obtenerEtiquetaCaja(caja: number): { texto: string; color: string; badgeBg: string } {
  switch (caja) {
    case 0:
      return { texto: 'Nueva / Fallada', color: 'text-red-400', badgeBg: 'bg-red-950/70 border-red-800' };
    case 1:
      return { texto: 'En observación (24h)', color: 'text-amber-400', badgeBg: 'bg-amber-950/70 border-amber-800' };
    case 2:
      return { texto: 'Afianzando (3d)', color: 'text-yellow-400', badgeBg: 'bg-yellow-950/70 border-yellow-800' };
    case 3:
      return { texto: 'Asentada (7d)', color: 'text-blue-400', badgeBg: 'bg-blue-950/70 border-blue-800' };
    case 4:
      return { texto: 'Consolidada (16d)', color: 'text-indigo-400', badgeBg: 'bg-indigo-950/70 border-indigo-800' };
    case 5:
    default:
      return { texto: 'Dominada (35d)', color: 'text-emerald-400', badgeBg: 'bg-emerald-950/70 border-emerald-800' };
  }
}
