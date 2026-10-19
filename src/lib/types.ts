export interface Tema {
  id: number;
  titulo: string;
  bloque: string;
}

export interface DatoCritico {
  concepto: string;
  valor_exacto: string;
  trampa_habitual: string;
}

export interface SeccionTemario {
  id: string;
  tema_id: number;
  epigrafe: string;
  contenido_markdown: string;
  datos_criticos: DatoCritico[];
  created_at?: string;
}

export interface Pregunta {
  id: string;
  tema_id: number;
  seccion_id: string;
  enunciado: string;
  opciones: string[]; // 4 strings
  respuesta_correcta: number; // 0, 1, 2, 3 original
  explicacion_profesor: string;
  cita_exacta: string;
  dato_clave_etiqueta?: string;
  
  // SRS Leitner
  caja_leitner: number; // 0 a 5
  proxima_revision: string; // ISO string
  fallos_totales: number;
  aciertos_consecutivos: number;
  ultima_vez_vista: string | null;
  created_at?: string;
  
  // Valoraciones de usuarios
  votos_buena?: number;
  votos_regular?: number;
  votos_mala?: number;

  // Enlaces hidratados opcionales
  seccion?: SeccionTemario;
  tema?: Tema;
}

export interface OpcionBarajada {
  texto: string;
  indiceOriginal: number;
}

export interface PreguntaJuego extends Pregunta {
  opcionesBarajadas: OpcionBarajada[];
}

export type TipoEvaluacionSRS = 'fallo' | 'acierto_duda' | 'acierto_seguro';

export interface ResultadoSRS {
  caja_leitner: number;
  proxima_revision: string;
  fallos_totales: number;
  aciertos_consecutivos: number;
  ultima_vez_vista: string;
  intervaloTexto: string;
}

export type ModoJuego = 'repaso' | 'fallos' | 'tema' | 'nuevas' | 'general';

export interface EstadisticasGlobales {
  totalPreguntas: number;
  enLlamasHoy: number; // pendientes de repaso (proxima_revision <= now)
  dominadas: number; // caja_leitner >= 4
  asentadas: number; // caja_leitner 2 o 3
  enObservacion: number; // caja_leitner 1
  nuevas: number; // caja_leitner 0 y ultima_vez_vista null
  porcentajeDominio: number;
  rachaDias: number;
  falladasHistoricas: number;
  // Métricas reales de retención y cobertura pedagógica
  preguntasVistas: number;
  acertadas: number;
  falladasActivas: number;
  porcentajeRetencionReal: number;
  temasExplorados: number;
  totalTemas: number;
  porcentajeCoberturaTemas: number;
  porcentajeCoberturaPreguntas: number;
}

export type TipoSesion = 'tema' | 'repaso_srs' | 'fallos' | 'simulacro_general';

export interface SesionEstudio {
  id?: string;
  user_id?: string;
  fecha: string; // YYYY-MM-DD
  created_at?: string;
  tipo_sesion: TipoSesion;
  tema_id?: number | null;
  titulo_sesion: string;
  preguntas_respondidas: number;
  aciertos: number;
  dudas?: number;
  fallos: number;
}

export interface FichaTecnica {
  id: string;
  tema_id: number;
  concepto: string;
  valor_exacto: string;
  trampa_habitual: string;
  categoria_dato?: string;
  tipo_ficha?: 'tabla' | 'concepto';
  frente_pregunta?: string;
  dorso_respuesta?: string;
  imagen_oficial_url?: string | null;
  imagen_propuesta_url?: string | null;
  estado_propuesta?: 'pendiente' | 'aprobada' | 'rechazada' | null;
  propuesta_por_email?: string | null;
  reportada_eliminar?: boolean;
  votos_reporte?: number;
  explicacion_ia?: string | null;
  created_at?: string;
  tema?: Tema;
  usuarioSRS?: UsuarioFichaSRS;
}

export interface UsuarioFichaSRS {
  id?: string;
  user_id: string;
  ficha_id: string;
  nota_mnemotecnica?: string | null;
  imagen_url?: string | null;
  imagen_bytes?: number;
  intervalo_dias: number;
  factor_facilidad: number;
  repeticiones: number;
  proximo_repaso: string;
  ultima_revision?: string;
  eliminada_por_usuario?: boolean;
}

export interface PerfilUsuario {
  id: string;
  email: string;
  nombre?: string;
  avatar_url?: string;
  es_admin?: boolean;
  bloqueado?: boolean;
  tokens_consumidos?: number;
  coste_estimado_eur?: number;
  bytes_almacenamiento?: number;
  meta_fichas_diarias?: number;
  ultima_conexion?: string;
  created_at?: string;
  // Campos calculados para admin
  preguntas_respondidas?: number;
  porcentaje_aciertos?: number;
}

export interface UsoMemoriaSupabase {
  dbBytes: number;
  dbMB: number;
  dbMaxMB: number;
  storageBytes: number;
  storageMB: number;
  storageMaxMB: number;
}

