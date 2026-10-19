import { createClient } from '@supabase/supabase-js';
import {
  Tema,
  SeccionTemario,
  Pregunta,
  ResultadoSRS,
  SesionEstudio,
  FichaTecnica,
  UsuarioFichaSRS,
  PerfilUsuario,
  UsoMemoriaSupabase,
} from './types';
import { TEMAS_CAM, MOCK_SECCIONES, MOCK_PREGUNTAS } from './mock-data';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Si no hay variables de entorno, cliente placeholder seguro
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Obtiene el ID del usuario efectivo (si el Admin está en Modo Dios suplantando a un usuario)
 */
export function getEffectiveUserId(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const impId = sessionStorage.getItem('opostudy_impersonated_user_id');
      if (impId) return impId;
    } catch {}
  }
  return null;
}

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
          // Comprobar si hay un usuario autenticado o suplantado (Modo Dios) para sobreescribir con su progreso individual (SRS)
          const { data: { user } } = await supabase.auth.getUser();
          const targetUserId = getEffectiveUserId() || user?.id;

          if (targetUserId) {
            const { data: userProgress } = await supabase
              .from('usuario_progreso_srs')
              .select('*')
              .eq('user_id', targetUserId);

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
  forzarGeneracion: boolean = false,
  cantidad: number = 6
): Promise<{ ok: boolean; preguntas: Pregunta[]; nuevasGeneradas: number; error?: string }> {
  try {
    let userId = getEffectiveUserId();
    if (!userId && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {}
    }

    const res = await fetch('/api/motor-tema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temaId, forzarGeneracion, userId, cantidad }),
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
      const targetUserId = getEffectiveUserId() || user?.id;

      if (targetUserId) {
        // Usuario autenticado o suplantado en Modo Dios -> Guardar en tabla de progreso
        await supabase
          .from('usuario_progreso_srs')
          .upsert({
            user_id: targetUserId,
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
 * Resetea el progreso y estadísticas de un tema específico para el usuario
 */
export async function resetearProgresoTema(
  temaId: number,
  preguntasTemaIds?: string[]
): Promise<boolean> {
  // 1. Resetear en LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const prevRaw = localStorage.getItem(LOCAL_STORAGE_PREGUNTAS_KEY);
      if (prevRaw) {
        const todas: Pregunta[] = JSON.parse(prevRaw);
        const actualizadas = todas.map((p) => {
          const coincideTema = p.tema_id === temaId;
          const coincideId = preguntasTemaIds && preguntasTemaIds.includes(p.id);
          if (coincideTema || coincideId) {
            return {
              ...p,
              caja_leitner: 0,
              proxima_revision: new Date().toISOString(),
              fallos_totales: 0,
              aciertos_consecutivos: 0,
              ultima_vez_vista: null,
            };
          }
          return p;
        });
        localStorage.setItem(LOCAL_STORAGE_PREGUNTAS_KEY, JSON.stringify(actualizadas));
      }

      const sesionesRaw = localStorage.getItem(LOCAL_STORAGE_SESIONES_KEY);
      if (sesionesRaw) {
        const sesiones: SesionEstudio[] = JSON.parse(sesionesRaw);
        const filtradas = sesiones.filter((s) => s.tema_id !== temaId);
        localStorage.setItem(LOCAL_STORAGE_SESIONES_KEY, JSON.stringify(filtradas));
      }
    } catch (e) {
      console.warn('Error limpiando progreso local del tema:', e);
    }
  }

  // 2. Resetear en Supabase si hay conexión y usuario
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = getEffectiveUserId() || user?.id;

      if (targetUserId) {
        let idsParaBorrar = preguntasTemaIds;
        if (!idsParaBorrar || idsParaBorrar.length === 0) {
          const { data: pregs } = await supabase
            .from('preguntas')
            .select('id')
            .eq('tema_id', temaId);
          if (pregs) {
            idsParaBorrar = pregs.map((p) => p.id);
          }
        }

        if (idsParaBorrar && idsParaBorrar.length > 0) {
          await supabase
            .from('usuario_progreso_srs')
            .delete()
            .eq('user_id', targetUserId)
            .in('pregunta_id', idsParaBorrar);
        }

        await supabase
          .from('historial_sesiones')
          .delete()
          .eq('user_id', targetUserId)
          .eq('tema_id', temaId);
      }
    } catch (e) {
      console.error('Error reseteando progreso del tema en Supabase:', e);
      return false;
    }
  }

  return true;
}

/**
 * Resetea TODO el progreso del usuario en todos los temas
 */
export async function resetearProgresoGlobal(): Promise<boolean> {
  // 1. Resetear en LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const prevRaw = localStorage.getItem(LOCAL_STORAGE_PREGUNTAS_KEY);
      if (prevRaw) {
        const todas: Pregunta[] = JSON.parse(prevRaw);
        const actualizadas = todas.map((p) => ({
          ...p,
          caja_leitner: 0,
          proxima_revision: new Date().toISOString(),
          fallos_totales: 0,
          aciertos_consecutivos: 0,
          ultima_vez_vista: null,
        }));
        localStorage.setItem(LOCAL_STORAGE_PREGUNTAS_KEY, JSON.stringify(actualizadas));
      }
      localStorage.removeItem(LOCAL_STORAGE_SESIONES_KEY);
    } catch (e) {
      console.warn('Error limpiando progreso global en localStorage:', e);
    }
  }

  // 2. Resetear en Supabase si hay usuario
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = getEffectiveUserId() || user?.id;

      if (targetUserId) {
        await supabase
          .from('usuario_progreso_srs')
          .delete()
          .eq('user_id', targetUserId);

        await supabase
          .from('historial_sesiones')
          .delete()
          .eq('user_id', targetUserId);
      }
    } catch (e) {
      console.error('Error reseteando progreso global en Supabase:', e);
      return false;
    }
  }

  return true;
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

  // 2. Guardar en Supabase si hay usuario autenticado o suplantado
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = getEffectiveUserId() || user?.id;
      if (targetUserId) {
        await supabase.from('historial_sesiones').insert({
          user_id: targetUserId,
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
      const targetUserId = getEffectiveUserId() || user?.id;
      if (targetUserId) {
        const { data, error } = await supabase
          .from('historial_sesiones')
          .select('*')
          .eq('user_id', targetUserId)
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
 * Obtiene las fichas técnicas desde Supabase hidratadas con el progreso Anki SM-2 y personalización del usuario
 */
export async function getFichasTecnicas(
  temaIds?: number[],
  customUserId?: string
): Promise<FichaTecnica[]> {
  const temasMap = new Map<number, Tema>();
  const todosTemas = await getTemas();
  todosTemas.forEach((t) => temasMap.set(t.id, t));

  let targetUserId = customUserId || getEffectiveUserId();
  if (!targetUserId && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id || null;
    } catch {}
  }

  if (supabase) {
    try {
      let query = supabase.from('fichas_tecnicas').select('*');
      if (temaIds && temaIds.length > 0) {
        query = query.in('tema_id', temaIds);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Cargar registros de personalización privada (usuario_fichas_srs)
        const userFichasMap = new Map<string, UsuarioFichaSRS>();
        if (targetUserId) {
          const { data: userFichas } = await supabase
            .from('usuario_fichas_srs')
            .select('*')
            .eq('user_id', targetUserId);

          if (userFichas) {
            userFichas.forEach((uf) => userFichasMap.set(uf.ficha_id, uf));
          }
        }

        const filtradas: FichaTecnica[] = [];
        for (const f of data) {
          const uSRS = userFichasMap.get(f.id);
          // Si el usuario la ha eliminado para sí mismo, se omite
          if (uSRS?.eliminada_por_usuario) continue;

          filtradas.push({
            id: f.id,
            tema_id: f.tema_id,
            concepto: f.concepto,
            valor_exacto: f.valor_exacto,
            trampa_habitual: f.trampa_habitual,
            categoria_dato: f.categoria_dato,
            tipo_ficha: f.tipo_ficha || 'concepto',
            frente_pregunta: f.frente_pregunta || f.concepto,
            dorso_respuesta:
              f.dorso_respuesta ||
              `${f.valor_exacto}.${f.trampa_habitual ? `\n\n⚠️ Ojo con la trampa: ${f.trampa_habitual}` : ''}`,
            imagen_oficial_url: f.imagen_oficial_url || null,
            imagen_propuesta_url: f.imagen_propuesta_url || null,
            estado_propuesta: f.estado_propuesta || null,
            propuesta_por_email: f.propuesta_por_email || null,
            reportada_eliminar: f.reportada_eliminar || false,
            votos_reporte: f.votos_reporte || 0,
            explicacion_ia: f.explicacion_ia || null,
            created_at: f.created_at,
            tema: temasMap.get(f.tema_id),
            usuarioSRS: uSRS || {
              user_id: targetUserId || '',
              ficha_id: f.id,
              intervalo_dias: 1,
              factor_facilidad: 2.5,
              repeticiones: 0,
              proximo_repaso: new Date().toISOString(),
              eliminada_por_usuario: false,
            },
          });
        }

        return filtradas;
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
            frente_pregunta: dc.concepto,
            dorso_respuesta: `${dc.valor_exacto}\n\n⚠️ Trampa: ${dc.trampa_habitual}`,
            tema: temasMap.get(sec.tema_id),
            usuarioSRS: {
              user_id: targetUserId || '',
              ficha_id: `sec_${sec.id}_${idx}`,
              intervalo_dias: 1,
              factor_facilidad: 2.5,
              repeticiones: 0,
              proximo_repaso: new Date().toISOString(),
              eliminada_por_usuario: false,
            },
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
 * Invoca el motor de generación de fichas técnicas oficiales (/api/motor-fichas) con tracking de tokens
 */
export async function solicitarGeneracionFichas(
  temaId: number
): Promise<{ ok: boolean; fichas: FichaTecnica[]; nuevasGeneradas: number; error?: string }> {
  try {
    let userId = getEffectiveUserId();
    if (!userId && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      } catch {}
    }

    const res = await fetch('/api/motor-fichas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temaId, userId }),
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
 * Evalúa una ficha con el algoritmo Anki SM-2 (Difícil, Medio, Fácil)
 */
export async function evaluarFichaAnki(
  fichaId: string,
  calificacion: 'dificil' | 'medio' | 'facil',
  srsActual?: UsuarioFichaSRS
): Promise<{ ok: boolean; nuevoSRS?: UsuarioFichaSRS }> {
  if (!supabase) return { ok: false };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = getEffectiveUserId() || user?.id;
    if (!targetUserId) return { ok: false };

    let intervalo = srsActual?.intervalo_dias ?? 1;
    let factor = Number(srsActual?.factor_facilidad ?? 2.5);
    let reps = srsActual?.repeticiones ?? 0;

    let proximoDias = 1;
    if (calificacion === 'dificil') {
      intervalo = 1;
      factor = Math.max(1.3, Number((factor - 0.2).toFixed(2)));
      reps = 0;
      proximoDias = 1;
    } else if (calificacion === 'medio') {
      intervalo = Math.max(3, Math.round(intervalo * 1.5));
      reps += 1;
      proximoDias = intervalo;
    } else {
      // 'facil'
      intervalo = Math.max(7, Math.round(intervalo * factor));
      factor = Number((factor + 0.15).toFixed(2));
      reps += 1;
      proximoDias = intervalo;
    }

    const proximoRepaso = new Date(Date.now() + proximoDias * 24 * 60 * 60 * 1000).toISOString();

    const nuevoSRS: UsuarioFichaSRS = {
      ...(srsActual || {}),
      user_id: targetUserId,
      ficha_id: fichaId,
      intervalo_dias: intervalo,
      factor_facilidad: factor,
      repeticiones: reps,
      proximo_repaso: proximoRepaso,
      ultima_revision: new Date().toISOString(),
      eliminada_por_usuario: false,
    };

    const { error } = await supabase
      .from('usuario_fichas_srs')
      .upsert(nuevoSRS, { onConflict: 'user_id,ficha_id' });

    if (error) {
      console.error('Error en evaluarFichaAnki:', error);
      return { ok: false };
    }

    return { ok: true, nuevoSRS };
  } catch (e) {
    console.error('Excepción en evaluarFichaAnki:', e);
    return { ok: false };
  }
}

/**
 * Guarda o actualiza la nota/regla mnemotécnica privada del usuario en una ficha
 */
export async function guardarNotaMnemotecnica(
  fichaId: string,
  nota: string
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = getEffectiveUserId() || user?.id;
    if (!targetUserId) return { ok: false };

    const { error } = await supabase.from('usuario_fichas_srs').upsert(
      {
        user_id: targetUserId,
        ficha_id: fichaId,
        nota_mnemotecnica: nota.trim(),
      },
      { onConflict: 'user_id,ficha_id' }
    );

    return { ok: !error };
  } catch (e) {
    console.error('Error en guardarNotaMnemotecnica:', e);
    return { ok: false };
  }
}

/**
 * Sube una imagen mnemotécnica comprimida a Supabase Storage y actualiza usuario_fichas_srs y perfiles_usuarios
 */
export async function subirImagenMnemotecnica(
  fichaId: string,
  blobWebp: Blob
): Promise<{ ok: boolean; url?: string; bytes?: number; error?: string }> {
  if (!supabase) return { ok: false, error: 'Supabase no inicializado' };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = getEffectiveUserId() || user?.id;
    if (!targetUserId) return { ok: false, error: 'No autenticado' };

    const fileName = `${targetUserId}/${fichaId}_${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from('fichas-imagenes')
      .upload(fileName, blobWebp, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('fichas-imagenes')
      .getPublicUrl(fileName);

    const bytes = blobWebp.size;

    await supabase.from('usuario_fichas_srs').upsert(
      {
        user_id: targetUserId,
        ficha_id: fichaId,
        imagen_url: publicUrl,
        imagen_bytes: bytes,
      },
      { onConflict: 'user_id,ficha_id' }
    );

    // Sumar a bytes_almacenamiento en perfiles_usuarios
    const { data: perfil } = await supabase
      .from('perfiles_usuarios')
      .select('bytes_almacenamiento')
      .eq('id', targetUserId)
      .maybeSingle();

    if (perfil) {
      await supabase
        .from('perfiles_usuarios')
        .update({
          bytes_almacenamiento: (Number(perfil.bytes_almacenamiento) || 0) + bytes,
        })
        .eq('id', targetUserId);
    }

    return { ok: true, url: publicUrl, bytes };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al subir foto';
    return { ok: false, error: msg };
  }
}

/**
 * Elimina una imagen mnemotécnica de Supabase Storage y descuenta los bytes
 */
export async function eliminarImagenMnemotecnica(
  fichaId: string,
  imagenUrl: string,
  bytes: number
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = getEffectiveUserId() || user?.id;
    if (!targetUserId) return { ok: false };

    try {
      const parts = imagenUrl.split('/fichas-imagenes/');
      if (parts[1]) {
        await supabase.storage.from('fichas-imagenes').remove([decodeURIComponent(parts[1])]);
      }
    } catch {}

    await supabase
      .from('usuario_fichas_srs')
      .update({
        imagen_url: null,
        imagen_bytes: 0,
      })
      .eq('user_id', targetUserId)
      .eq('ficha_id', fichaId);

    const { data: perfil } = await supabase
      .from('perfiles_usuarios')
      .select('bytes_almacenamiento')
      .eq('id', targetUserId)
      .maybeSingle();

    if (perfil) {
      await supabase
        .from('perfiles_usuarios')
        .update({
          bytes_almacenamiento: Math.max(0, (Number(perfil.bytes_almacenamiento) || 0) - bytes),
        })
        .eq('id', targetUserId);
    }

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Elimina una ficha técnica (marcada para el usuario o borrada definitivamente si es Admin)
 */
export async function eliminarFichaUsuario(
  fichaId: string,
  esAdminYDefinitivo: boolean = false
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: true };
  try {
    if (esAdminYDefinitivo) {
      const { error } = await supabase.from('fichas_tecnicas').delete().eq('id', fichaId);
      return { ok: !error };
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = getEffectiveUserId() || user?.id;
      if (!targetUserId) return { ok: false };

      const { error } = await supabase.from('usuario_fichas_srs').upsert(
        {
          user_id: targetUserId,
          ficha_id: fichaId,
          eliminada_por_usuario: true,
        },
        { onConflict: 'user_id,ficha_id' }
      );
      return { ok: !error };
    }
  } catch {
    return { ok: false };
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

    const res = await fetch('/api/admin/preguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preguntaId, tipo }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar valoración';
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

    const res = await fetch('/api/admin/preguntas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: preguntaId }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error eliminando pregunta';
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

    const res = await fetch('/api/admin/preguntas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: preguntaId }),
    });
    const data = await res.json();
    return { ok: res.ok, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reseteando votos';
    return { ok: false, error: msg };
  }
}

/**
 * Funciones de Administración: Lista de usuarios, bloqueo y memoria
 */
export async function getPerfilesUsuariosAdmin(): Promise<PerfilUsuario[]> {
  if (!supabase) return [];
  try {
    const { data: perfiles, error } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .order('ultima_conexion', { ascending: false });

    if (error || !perfiles) return [];

    // Hidratar con métricas de historial_sesiones
    const { data: sesiones } = await supabase
      .from('historial_sesiones')
      .select('user_id, preguntas_respondidas, aciertos');

    const mapaMetricas = new Map<string, { total: number; aciertos: number }>();
    if (sesiones) {
      sesiones.forEach((s) => {
        if (!s.user_id) return;
        const prev = mapaMetricas.get(s.user_id) || { total: 0, aciertos: 0 };
        mapaMetricas.set(s.user_id, {
          total: prev.total + (s.preguntas_respondidas || 0),
          aciertos: prev.aciertos + (s.aciertos || 0),
        });
      });
    }

    return perfiles.map((p) => {
      const stats = mapaMetricas.get(p.id);
      const pct = stats && stats.total > 0 ? Math.round((stats.aciertos / stats.total) * 100) : 0;
      return {
        ...p,
        preguntas_respondidas: stats?.total || 0,
        porcentaje_aciertos: pct,
      };
    });
  } catch (e) {
    console.error('Error en getPerfilesUsuariosAdmin:', e);
    return [];
  }
}

export async function toggleBloquearUsuario(
  userId: string,
  bloquear: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('perfiles_usuarios')
        .update({ bloqueado: bloquear })
        .eq('id', userId);
      if (!error) return { ok: true };
    }
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, bloquear }),
    });
    const d = await res.json();
    return { ok: res.ok, error: d.error };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al bloquear usuario';
    return { ok: false, error: msg };
  }
}

export async function eliminarPerfilUsuario(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const d = await res.json();
    return { ok: res.ok, error: d.error };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar usuario';
    return { ok: false, error: msg };
  }
}

export async function getUsoMemoriaSupabase(): Promise<UsoMemoriaSupabase> {
  const defaults: UsoMemoriaSupabase = {
    dbBytes: 15 * 1024 * 1024,
    dbMB: 15,
    dbMaxMB: 500,
    storageBytes: 0,
    storageMB: 0,
    storageMaxMB: 1000,
  };

  if (!supabase) return defaults;
  try {
    const { data, error } = await supabase.rpc('obtener_uso_memoria_supabase');
    if (!error && data) {
      return data as UsoMemoriaSupabase;
    }

    // Fallback: estimar bytes desde perfiles y tablas
    const { data: perfiles } = await supabase
      .from('perfiles_usuarios')
      .select('bytes_almacenamiento');

    const totalStorageBytes = (perfiles || []).reduce(
      (acc, p) => acc + (Number(p.bytes_almacenamiento) || 0),
      0
    );

    const { count: countPreguntas } = await supabase
      .from('preguntas')
      .select('id', { count: 'exact', head: true });
    const { count: countFichas } = await supabase
      .from('fichas_tecnicas')
      .select('id', { count: 'exact', head: true });
    const { count: countSecciones } = await supabase
      .from('secciones_temario')
      .select('id', { count: 'exact', head: true });

    const estimatedDBBytes =
      (countPreguntas || 0) * 4000 +
      (countFichas || 0) * 1000 +
      (countSecciones || 0) * 50000 +
      14 * 1024 * 1024;

    const dbMB = Number((estimatedDBBytes / (1024 * 1024)).toFixed(2));
    const storageMB = Number((totalStorageBytes / (1024 * 1024)).toFixed(2));

    return {
      dbBytes: estimatedDBBytes,
      dbMB,
      dbMaxMB: 500,
      storageBytes: totalStorageBytes,
      storageMB,
      storageMaxMB: 1000,
    };
  } catch {
    return defaults;
  }
}

/**
 * Reporta una ficha técnica defectuosa al Administrador (marca reportada_eliminar e incrementa votos_reporte)
 */
export async function reportarFichaEliminar(
  fichaId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabase) {
      // Intentar leer votos actuales
      const { data } = await supabase
        .from('fichas_tecnicas')
        .select('votos_reporte')
        .eq('id', fichaId)
        .single();

      const votosActuales = (data?.votos_reporte || 0) + 1;

      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          reportada_eliminar: true,
          votos_reporte: votosActuales,
        })
        .eq('id', fichaId);

      if (!error) return { ok: true };
    }

    const res = await fetch('/api/admin/fichas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'reportar', fichaId }),
    });
    const result = await res.json();
    return { ok: res.ok, error: result.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reportar ficha';
    return { ok: false, error: msg };
  }
}

/**
 * Propone una imagen mnemotécnica para que sea aprobada como oficial para todos los usuarios
 */
export async function proponerImagenFicha(
  fichaId: string,
  imagenUrl: string,
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          imagen_propuesta_url: imagenUrl,
          estado_propuesta: 'pendiente',
          propuesta_por_email: email,
        })
        .eq('id', fichaId);

      if (!error) return { ok: true };
    }

    const res = await fetch('/api/admin/fichas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'proponer_imagen',
        fichaId,
        imagenUrl,
        email,
      }),
    });
    const result = await res.json();
    return { ok: res.ok, error: result.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al proponer imagen';
    return { ok: false, error: msg };
  }
}

/**
 * Obtiene la meta diaria de fichas configurable por el usuario (10, 20, 30 o 50)
 */
export async function getMetaFichasDiarias(): Promise<number> {
  const DEFAULT_META = 20;
  if (typeof window !== 'undefined') {
    const guardada = localStorage.getItem('opostudy_meta_fichas');
    if (guardada) {
      const parsed = parseInt(guardada, 10);
      if ([10, 20, 30, 50].includes(parsed)) return parsed;
    }
  }

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data } = await supabase
          .from('perfiles_usuarios')
          .select('meta_fichas_diarias')
          .eq('id', user.id)
          .single();

        if (data?.meta_fichas_diarias) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('opostudy_meta_fichas', String(data.meta_fichas_diarias));
          }
          return data.meta_fichas_diarias;
        }
      }
    } catch {}
  }

  return DEFAULT_META;
}

/**
 * Guarda la meta diaria de fichas en Supabase y localmente
 */
export async function guardarMetaFichasDiarias(
  meta: number
): Promise<{ ok: boolean }> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opostudy_meta_fichas', String(meta));
  }

  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase
          .from('perfiles_usuarios')
          .update({ meta_fichas_diarias: meta })
          .eq('id', user.id);
      }
    } catch (e) {
      console.warn('Aviso guardando meta_fichas_diarias:', e);
    }
  }

  return { ok: true };
}

/**
 * Solicita la explicación pedagógica IA de una ficha (/api/explicar-ficha)
 */
export async function solicitarExplicacionIA(
  fichaId: string,
  frentePregunta: string,
  dorsoRespuesta: string,
  temaId?: number
): Promise<{ ok: boolean; explicacion?: string; error?: string }> {
  try {
    const res = await fetch('/api/explicar-ficha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fichaId,
        frentePregunta,
        dorsoRespuesta,
        temaId,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Error al obtener explicación' };
    }

    return { ok: true, explicacion: data.explicacion };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error de conexión con el profesor IA';
    return { ok: false, error: msg };
  }
}

/**
 * Funciones de Administración Masiva (Super-Panel de Moderación)
 */

export async function eliminarPreguntasMasivo(
  ids: string[]
): Promise<{ ok: boolean; eliminadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, eliminadas: 0 };
  try {
    if (supabase) {
      await supabase.from('usuario_progreso_srs').delete().in('pregunta_id', ids);
      const { error } = await supabase.from('preguntas').delete().in('id', ids);
      if (!error) return { ok: true, eliminadas: ids.length };
    }

    const res = await fetch('/api/admin/preguntas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    return { ok: res.ok, eliminadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error eliminando preguntas';
    return { ok: false, eliminadas: 0, error: msg };
  }
}

export async function resetearVotosPreguntasMasivo(
  ids: string[]
): Promise<{ ok: boolean; actualizadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, actualizadas: 0 };
  try {
    if (supabase) {
      const { error } = await supabase
        .from('preguntas')
        .update({ votos_buena: 0, votos_regular: 0, votos_mala: 0 })
        .in('id', ids);
      if (!error) return { ok: true, actualizadas: ids.length };
    }

    const res = await fetch('/api/admin/preguntas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    return { ok: res.ok, actualizadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reseteando votos';
    return { ok: false, actualizadas: 0, error: msg };
  }
}

export async function getFichasModeracionAdmin(): Promise<FichaTecnica[]> {
  try {
    const res = await fetch('/api/admin/fichas');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.fichas) return data.fichas;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('fichas_tecnicas')
        .select('*, tema:temas(*)')
        .or('reportada_eliminar.eq.true,estado_propuesta.eq.pendiente')
        .order('created_at', { ascending: false });

      if (!error && data) return data as FichaTecnica[];
    }
    return [];
  } catch (e) {
    console.error('Error cargando fichas de moderación:', e);
    return [];
  }
}

export async function eliminarFichasMasivo(
  ids: string[]
): Promise<{ ok: boolean; eliminadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, eliminadas: 0 };
  try {
    if (supabase) {
      await supabase.from('usuario_fichas_srs').delete().in('ficha_id', ids);
      const { error } = await supabase.from('fichas_tecnicas').delete().in('id', ids);
      if (!error) return { ok: true, eliminadas: ids.length };
    }

    const res = await fetch('/api/admin/fichas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    return { ok: res.ok, eliminadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error eliminando fichas';
    return { ok: false, eliminadas: 0, error: msg };
  }
}

export async function limpiarReportesFichasMasivo(
  ids: string[]
): Promise<{ ok: boolean; actualizadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, actualizadas: 0 };
  try {
    if (supabase) {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({ reportada_eliminar: false, votos_reporte: 0 })
        .in('id', ids);
      if (!error) return { ok: true, actualizadas: ids.length };
    }

    const res = await fetch('/api/admin/fichas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'limpiar_reportes', ids }),
    });
    const data = await res.json();
    return { ok: res.ok, actualizadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error limpiando reportes';
    return { ok: false, actualizadas: 0, error: msg };
  }
}

export async function aprobarImagenesPropuestasMasivo(
  ids: string[]
): Promise<{ ok: boolean; actualizadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, actualizadas: 0 };
  try {
    const res = await fetch('/api/admin/fichas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'aprobar_imagenes', ids }),
    });
    const data = await res.json();
    return { ok: res.ok, actualizadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error aprobando imágenes';
    return { ok: false, actualizadas: 0, error: msg };
  }
}

export async function rechazarImagenesPropuestasMasivo(
  ids: string[]
): Promise<{ ok: boolean; actualizadas: number; error?: string }> {
  if (ids.length === 0) return { ok: true, actualizadas: 0 };
  try {
    const res = await fetch('/api/admin/fichas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'rechazar_imagenes', ids }),
    });
    const data = await res.json();
    return { ok: res.ok, actualizadas: ids.length, error: data.error };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error rechazando imágenes';
    return { ok: false, actualizadas: 0, error: msg };
  }
}
