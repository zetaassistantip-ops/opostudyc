-- ==============================================================================
-- OPOBOMBEROS CAM 35 - COMPATIBILIDAD Y COLUMNAS DE FICHAS TÉCNICAS
-- Ejecutar en Supabase Dashboard -> SQL Editor si se desea sincronizar el schema
-- ==============================================================================

ALTER TABLE fichas_tecnicas
    ADD COLUMN IF NOT EXISTS categoria_dato TEXT,
    ADD COLUMN IF NOT EXISTS tipo_ficha TEXT DEFAULT 'concepto',
    ADD COLUMN IF NOT EXISTS frente_pregunta TEXT,
    ADD COLUMN IF NOT EXISTS dorso_respuesta TEXT,
    ADD COLUMN IF NOT EXISTS imagen_oficial_url TEXT,
    ADD COLUMN IF NOT EXISTS imagen_propuesta_url TEXT,
    ADD COLUMN IF NOT EXISTS estado_propuesta TEXT,
    ADD COLUMN IF NOT EXISTS propuesta_por_email TEXT,
    ADD COLUMN IF NOT EXISTS reportada_eliminar BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS votos_reporte INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS explicacion_ia TEXT;

-- Notificar a PostgREST para recargar la caché de esquema
NOTIFY pgrst, 'reload schema';
