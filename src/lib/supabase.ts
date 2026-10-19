import { createClient } from '@supabase/supabase-js';
import { Tema, SeccionTemario, Pregunta, ResultadoSRS, SesionEstudio, FichaTecnica } from './types';
import { TEMAS_CAM, MOCK_SECCIONES, MOCK_PREGUNTAS } from './mock-data';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Si no hay variables de entorno, cliente placeholder seguro
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const LOCAL_STORAGE_PREGUNTAS_KEY = 'opobomberos_preguntas_v1';
const LOCAL_STORAGE_SECCIONES_KEY = 'opobomberos_secciones_v1';

/**
 * Obtiene la lista completa de los 35 temas oficiales de Bomberos CAM
 */
export async function getTemas(): Promise<Tema[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('temas').select('*').order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as Tema[];
      }
    } catch (e) {
      console.warn('Fallo consultando Supabase temas, usando catálogo local:', e);
    }
  }
  return TEMAS_CAM;
}

/**
 * Obtiene todas las secciones de temario (con markdown y datos críticos)
 */
export async function getSecciones(): Promise<SeccionTemario[]> {
  if (typeof window !== 'undefined') {
    const guardadas = localStorage.getItem(LOCAL_STORAGE_SECCIONES_KEY);
    if (guardadas) {
      try {
        const parsed = JSON.parse(guardadas);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parseando secciones locales:', e);
      }
    }
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from('secciones_temario').select('*');
      if (!error && data && data.length > 0) {
        return data as SeccionTemario[];
      }
    } catch (e) {
      console.warn('Fallo consultando Supabase secciones:', e);
    }
  }

  return MOCK_SECCIONES;
}

/**
 * Obtiene todas las preguntas con su estado SRS Leitner actualizado
 */
/**
 * Obtiene las preguntas del Banco Global de Supabase, enriquecidas con el progreso individual SRS
 * @param temaId - Opcional. Si se pasa, filtra exclusivamente las preguntas de ese tema.
 */
export async function getPreguntas(temaId?: number): Promise<Pregunta[]> {
  // 1. Si Supabase está disponible, consultar la tabla global compartida 'preguntas'
  if (supabase) {
    try {
      let query = supabase
        .from('preguntas')
        .select('*, seccion:secciones_temario(*), tema:temas(*)');

      if (temaId) {
        query = query.eq('tema_id', temaId);
      }

      const { data: rawPreguntas, error } = await query;

      if (!error && rawPreguntas) {
        // Si se pide un tema y no hay preguntas, devolver vacío (nunca mezclar con Tema 1)
        if (rawPreguntas.length === 0 && temaId) {
          return [];
        }

        if (rawPreguntas.length > 0) {
          // Comprobar si hay un usuario autenticado para sobreescribir con su progreso individual (SRS)
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const { data: userProgress } = await supabase
              .from('usuario_progreso_srs')
              .select('*')
              .eq('user_id', user.id);

            const progressMap = new Map((userProgress || []).map((up) => [up.pregunta_id, up]));
            const preguntasPersonalizadas = rawPreguntas.map((p) => {
              const prog = progressMap.get(p.id);
              if (prog) {
                return {
                  ...p,
                  caja_leitner: prog.caja_leitner ?? 0,
                  proxima_revision: prog.proxima_revision || new Date().toISOString(),
                  fallos_totales: prog.fallos_totales ?? 0,
                  aciertos_consecutivos: prog.aciertos_consecutivos ?? 0,
                  ultima_vez_vista: prog.ultima_vez_vista,
                  votos_buena: p.votos_buena ?? 0,
                  votos_regular: p.votos_regular ?? 0,
                  votos_mala: p.votos_mala ?? 0,
                };
              }
              return {
                ...p,
                caja_leitner: 0,
                proxima_revision: new Date().toISOString(),
                fallos_totales: 0,
                aciertos_consecutivos: 0,
                ultima_vez_vista: null,
                votos_buena: p.votos_buena ?? 0,
                votos_regular: p.votos_regular ?? 0,
                votos_mala: p.votos_mala ?? 0,
              };
            });
            return preguntasPersonalizadas as Pregunta[];
          }

          return rawPreguntas.map((p) => ({
            ...p,
            votos_buena: p.votos_buena ?? 0,
            votos_regular: p.votos_regular ?? 0,
            votos_mala: p.votos_mala ?? 0,
          })) as Pregunta[];
        }
      }
    } catch (e) {
      console.warn('Fallo consultando Supabase preguntas:', e);
    }
  }

  // 2. Si se solicitó un tema específico y no es el Tema 1, NUNCA devolver mocks de otro tema
  if (temaId && temaId !== 1) {
    return [];
  }

  // 3. Fallback inicial pedagógico exclusivo para Tema 1 o modo general sin Supabase
  const secciones = MOCK_SECCIONES;
  return MOCK_PREGUNTAS.map((preg) => {
    const seccion = secciones.find((s) => s.id === preg.seccion_id);
    const tema = TEMAS_CAM.find((t) => t.id === preg.tema_id);
    return {
      ...preg,
      seccion,
      tema,
    };
  });
}

/**
 * Invoca el motor de generación acumulativa (/api/motor-tema) con sistema anti-duplicados
 */
export async function solicitarGeneracionMotorTema(
  temaId: number,
  forzarGeneracion: boolean = false
): Promise<{ ok: boolean; preguntas: Pregunta[]; nuevasGeneradas: number; error?: string }> {
  try {
    const res = await fetch('/api/motor-tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temaId, forzarGeneracion }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al invocar motor-tema');
    }

    return {
      ok: true,
      preguntas: data.preguntas || [],
      nuevasGeneradas: data.nuevasGeneradas || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de conexión con el motor de temas.';
    console.error('Error en solicitarGeneracionMotorTema:', msg);
    return {
      ok: false,
      preguntas: [],
      nuevasGeneradas: 0,
      error: msg,
    };
  }
}

/**
 * Actualiza el progreso SRS de una pregunta en Supabase (usuario_progreso_srs) y/o LocalStorage
 */
export async function actualizarPreguntaSRS(
  preguntaId: string,
  resultadoSRS: ResultadoSRS
): Promise<void> {
  // 1. Guardar en LocalStorage para inmediatez offline
  if (typeof window !== 'undefined') {
    try {
      const todas = await getPreguntas();
      const actualizadas = todas.map((p) => {
        if (p.id === preguntaId) {
          return {
            ...p,
            caja_leitner: resultadoSRS.caja_leitner,
            proxima_revision: resultadoSRS.proxima_revision,
            fallos_totales: resultadoSRS.fallos_totales,
            aciertos_consecutivos: resultadoSRS.aciertos_consecutivos,
            ultima_vez_vista: resultadoSRS.ultima_vez_vista,
          };
        }
        return p;
      });
      localStorage.setItem(LOCAL_STORAGE_PREGUNTAS_KEY, JSON.stringify(actualizadas));
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
    }
  }

  // 2. Sincronizar en Supabase si está disponible
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Usuario autenticado -> Guardar en su tabla privada de progreso
        await supabase
          .from('usuario_progreso_srs')
          .upsert({
            user_id: user.id,
            pregunta_id: preguntaId,
            caja_leitner: resultadoSRS.caja_leitner,
            proxima_revision: resultadoSRS.proxima_revision,
            fallos_totales: resultadoSRS.fallos_totales,
            aciertos_consecutivos: resultadoSRS.aciertos_consecutivos,
            ultima_vez_vista: resultadoSRS.ultima_vez_vista,
          }, {
            onConflict: 'user_id,pregunta_id',
          });
      } else {
        // Invitado -> Actualizar en tabla preguntas como fallback
        await supabase
          .from('preguntas')
          .update({
            caja_leitner: resultadoSRS.caja_leitner,
            proxima_revision: resultadoSRS.proxima_revision,
            fallos_totales: resultadoSRS.fallos_totales,
            aciertos_consecutivos: resultadoSRS.aciertos_consecutivos,
            ultima_vez_vista: resultadoSRS.ultima_vez_vista,
          })
          .eq('id', preguntaId);
      }
    } catch (e) {
      console.warn('Fallo sincronizando SRS en Supabase:', e);
    }
  }
}

/**
 * Guarda una sección ingerida con su batería de preguntas generadas
 */
export async function guardarSeccionConPreguntas(
  seccion: Omit<SeccionTemario, 'id'>,
  preguntas: Array<Omit<Pregunta, 'id' | 'seccion_id'>>
): Promise<{ seccionId: string; totalPreguntas: number }> {
  const seccionId = 'sec-' + Date.now();
  const seccionCompleta: SeccionTemario = {
    ...seccion,
    id: seccionId,
  };

  const preguntasCompletas: Pregunta[] = preguntas.map((p, idx) => ({
    ...p,
    id: `preg-${Date.now()}-${idx}`,
    seccion_id: seccionId,
    caja_leitner: 0,
    proxima_revision: new Date().toISOString(),
    fallos_totales: 0,
    aciertos_consecutivos: 0,
    ultima_vez_vista: null,
    seccion: seccionCompleta,
    tema: TEMAS_CAM.find((t) => t.id === p.tema_id),
  }));

  // Guardar en Supabase si está configurado
  if (supabase) {
    try {
      const { data: secData, error: secError } = await supabase
        .from('secciones_temario')
        .insert([{
          tema_id: seccion.tema_id,
          epigrafe: seccion.epigrafe,
          contenido_markdown: seccion.contenido_markdown,
          datos_criticos: seccion.datos_criticos,
        }])
        .select()
        .single();

      if (!secError && secData) {
        const dbSecId = secData.id;
        const dbPreguntas = preguntas.map((p) => ({
          tema_id: p.tema_id,
          seccion_id: dbSecId,
          enunciado: p.enunciado,
          opciones: p.opciones,
          respuesta_correcta: p.respuesta_correcta,
          explicacion_profesor: p.explicacion_profesor,
          cita_exacta: p.cita_exacta,
          dato_clave_etiqueta: p.dato_clave_etiqueta,
          caja_leitner: 0,
          proxima_revision: new Date().toISOString(),
          fallos_totales: 0,
          aciertos_consecutivos: 0,
          ultima_vez_vista: null,
        }));

        await supabase.from('preguntas').insert(dbPreguntas);
      }
    } catch (e) {
      console.warn('Error guardando en Supabase, persistiendo localmente:', e);
    }
  }

  // Guardar en LocalStorage
  if (typeof window !== 'undefined') {
    const seccionesPrevias = await getSecciones();
    const nuevasSecciones = [seccionCompleta, ...seccionesPrevias];
    localStorage.setItem(LOCAL_STORAGE_SECCIONES_KEY, JSON.stringify(nuevasSecciones));

    const preguntasPrevias = await getPreguntas();
    const nuevasPreguntas = [...preguntasCompletas, ...preguntasPrevias];
    localStorage.setItem(LOCAL_STORAGE_PREGUNTAS_KEY, JSON.stringify(nuevasPreguntas));
  }

  return { seccionId, totalPreguntas: preguntas.length };
}

const LOCAL_STORAGE_SESIONES_KEY = 'opostudyc_historial_sesiones';

/**
 * Guarda una sesión de estudio completada en Supabase y LocalStorage
 */
export async function guardarSesionEstudio(sesion: SesionEstudio): Promise<void> {
  const sesionConId: SesionEstudio = {
    ...sesion,
    id: sesion.id || `ses-${Date.now()}`,
    created_at: sesion.created_at || new Date().toISOString(),
  };

  // 1. Guardar en LocalStorage (inmediatez y offline)
  if (typeof window !== 'undefined') {
    try {
      const prevRaw = localStorage.getItem(LOCAL_STORAGE_SESIONES_KEY);
      const prev: SesionEstudio[] = prevRaw ? JSON.parse(prevRaw) : [];
      const actualizadas = [sesionConId, ...prev].slice(0, 100);
      localStorage.setItem(LOCAL_STORAGE_SESIONES_KEY, JSON.stringify(actualizadas));
    } catch (e) {
      console.warn('Error guardando sesión en localStorage:', e);
    }
  }

  // 2. Guardar en Supabase si hay usuario autenticado
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('historial_sesiones').insert({
          user_id: user.id,
          fecha: sesionConId.fecha,
          tipo_sesion: sesionConId.tipo_sesion,
          tema_id: sesionConId.tema_id || null,
          titulo_sesion: sesionConId.titulo_sesion,
          preguntas_respondidas: sesionConId.preguntas_respondidas,
          aciertos: sesionConId.aciertos,
          dudas: sesionConId.dudas || 0,
          fallos: sesionConId.fallos,
        });
      }
    } catch (e) {
      console.warn('Aviso guardando sesión en Supabase historial_sesiones:', e);
    }
  }
}

/**
 * Obtiene el historial de sesiones completadas
 */
export async function getHistorialSesiones(): Promise<SesionEstudio[]> {
  // 1. Intentar desde Supabase si hay usuario
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('historial_sesiones')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(60);

        if (!error && data && data.length > 0) {
          return data as SesionEstudio[];
        }
      }
    } catch (e) {
      console.warn('Aviso consultando historial_sesiones en Supabase:', e);
    }
  }

  // 2. Fallback a LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SESIONES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as SesionEstudio[];
      }
    } catch (e) {
      console.warn('Error leyendo sesiones de localStorage:', e);
    }
  }

  return [];
}

/**
 * Calcula los días de racha consecutivos reales basados en fechas de sesiones
 */
export function calcularRachaDias(sesiones: SesionEstudio[]): number {
  if (!sesiones || sesiones.length === 0) return 0;

  // Extraer fechas únicas en formato YYYY-MM-DD
  const fechasUnicas = new Set<string>();
  sesiones.forEach((s) => {
    if (s.fecha) {
      fechasUnicas.add(s.fecha.slice(0, 10));
    } else if (s.created_at) {
      fechasUnicas.add(s.created_at.slice(0, 10));
    }
  });

  const hoy = new Date();
  const formatFecha = (d: Date) => d.toISOString().slice(0, 10);

  const hoyStr = formatFecha(hoy);
  const ayer = new Date(hoy.getTime() - 86400000);
  const ayerStr = formatFecha(ayer);

  // Si no se entrenó hoy ni ayer, la racha es 0
  const entrenoHoy = fechasUnicas.has(hoyStr);
  const entrenoAyer = fechasUnicas.has(ayerStr);

  if (!entrenoHoy && !entrenoAyer) {
    return 0;
  }

  let racha = 0;
  let cursor = entrenoHoy ? hoy : ayer;

  while (fechasUnicas.has(formatFecha(cursor))) {
    racha++;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  return racha;
}

/**
 * Obtiene las fichas técnicas desde Supabase (tabla fichas_tecnicas o fallback secciones_temario)
 */
export async function getFichasTecnicas(temaIds?: number[]): Promise<FichaTecnica[]> {
  const temasMap = new Map<number, Tema>();
  const todosTemas = await getTemas();
  todosTemas.forEach((t) => temasMap.set(t.id, t));

  if (supabase) {
    try {
      let query = supabase.from('fichas_tecnicas').select('*');
      if (temaIds && temaIds.length > 0) {
        query = query.in('tema_id', temaIds);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data as FichaTecnica[]).map((f) => ({
          ...f,
          tema: temasMap.get(f.tema_id),
        }));
      }
    } catch (e) {
      console.warn('Fallo consultando fichas_tecnicas, usando fallback:', e);
    }
  }

  // Fallback: extrae de secciones_temario.datos_criticos
  try {
    const secciones = await getSecciones();
    const items: FichaTecnica[] = [];
    secciones.forEach((sec) => {
      if (temaIds && temaIds.length > 0 && !temaIds.includes(sec.tema_id)) return;
      if (sec.datos_criticos && Array.isArray(sec.datos_criticos)) {
        sec.datos_criticos.forEach((dc, idx) => {
          items.push({
            id: `sec_${sec.id}_${idx}`,
            tema_id: sec.tema_id,
            concepto: dc.concepto,
            valor_exacto: dc.valor_exacto,
            trampa_habitual: dc.trampa_habitual,
            tema: temasMap.get(sec.tema_id),
          });
        });
      }
    });
    return items;
  } catch (err) {
    console.error('Error cargando fichas técnicas:', err);
    return [];
  }
}

/**
 * Elimina una ficha técnica de Supabase (o local)
 */
export async function eliminarFichaTecnica(id: string): Promise<boolean> {
  if (supabase && !id.startsWith('sec_')) {
    try {
      const { error } = await supabase.from('fichas_tecnicas').delete().eq('id', id);
      if (!error) return true;
      console.error('Error eliminando ficha de Supabase:', error);
    } catch (e) {
      console.error('Excepción eliminando ficha:', e);
    }
  }
  return true;
}

/**
 * Invoca el motor de generación de fichas técnicas oficiales (/api/motor-fichas)
 */
export async function solicitarGeneracionFichas(
  temaId: number
): Promise<{ ok: boolean; fichas: FichaTecnica[]; nuevasGeneradas: number; error?: string }> {
  try {
    const res = await fetch('/api/motor-fichas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temaId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al generar fichas técnicas con IA');
    }

    return {
      ok: true,
      fichas: data.fichas || [],
      nuevasGeneradas: data.nuevasGeneradas || 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al conectar con motor-fichas.';
    console.error('Error en solicitarGeneracionFichas:', msg);
    return {
      ok: false,
      fichas: [],
      nuevasGeneradas: 0,
      error: msg,
    };
  }
}

/**
 * Incrementa en +1 el voto ('buena', 'regular', 'mala') para una pregunta
 */
export async function votarPregunta(
  preguntaId: string,
  tipo: 'buena' | 'regular' | 'mala'
): Promise<{ ok: boolean; error?: string }> {
  try {
    const columna = tipo === 'buena' ? 'votos_buena' : tipo === 'regular' ? 'votos_regular' : 'votos_mala';

    if (supabase) {
      const { data: preg } = await supabase
        .from('preguntas')
        .select('votos_buena, votos_regular, votos_mala')
        .eq('id', preguntaId)
        .single();

      if (preg) {
        const actual = (preg as Record<string, number>)[columna] || 0;
        const { error: errUpdate } = await supabase
          .from('preguntas')
          .update({ [columna]: actual + 1 })
          .eq('id', preguntaId);

        if (!errUpdate) {
          return { ok: true };
        }
      }
    }

    // Fallback vía endpoint con privilegios administrativos
    const res = await fetch('/api/admin/preguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preguntaId, tipo }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar valoración';
    console.error('Error en votarPregunta:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Elimina permanentemente una pregunta de la base de datos
 */
export async function eliminarPregunta(
  preguntaId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabase) {
      const { error } = await supabase.from('preguntas').delete().eq('id', preguntaId);
      if (!error) return { ok: true };
    }

    // Fallback API server-side
    const res = await fetch('/api/admin/preguntas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: preguntaId }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error eliminando pregunta';
    console.error('Error en eliminarPregunta:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Resetea los contadores de votos de una pregunta a cero
 */
export async function resetearVotosPregunta(
  preguntaId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('preguntas')
        .update({ votos_buena: 0, votos_regular: 0, votos_mala: 0 })
        .eq('id', preguntaId);
      if (!error) return { ok: true };
    }

    // Fallback API server-side
    const res = await fetch('/api/admin/preguntas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: preguntaId }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reseteando votos';
    console.error('Error en resetearVotosPregunta:', msg);
    return { ok: false, error: msg };
  }
}


