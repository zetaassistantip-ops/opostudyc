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

export type ModoJuego = 'repaso' | 'fallos' | 'tema' | 'nuevas';

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
}

export interface SesionEstudio {
  id?: string;
  user_id?: string;
  fecha: string; // YYYY-MM-DD
  created_at?: string;
  tipo_sesion: 'tema' | 'repaso_srs' | 'fallos';
  tema_id?: number | null;
  titulo_sesion: string;
  preguntas_respondidas: number;
  aciertos: number;
  dudas?: number;
  fallos: number;
}
