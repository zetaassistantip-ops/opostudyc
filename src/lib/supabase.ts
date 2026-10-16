import { createClient } from '@supabase/supabase-js';
import { Tema, SeccionTemario, Pregunta, ResultadoSRS } from './types';
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

            if (userProgress && userProgress.length > 0) {
              const progressMap = new Map(userProgress.map((up) => [up.pregunta_id, up]));
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
                  };
                }
                return {
                  ...p,
                  caja_leitner: 0,
                  proxima_revision: new Date().toISOString(),
                  fallos_totales: 0,
                  aciertos_consecutivos: 0,
                  ultima_vez_vista: null,
                };
              });
              return preguntasPersonalizadas as Pregunta[];
            }
          }

          return rawPreguntas as Pregunta[];
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
