-- ==============================================================================
-- OPOBOMBEROS CAM 35 - MIGRACIÓN FICHAS ANKI V2, REPORTES, IMÁGENES COMPARTIDAS Y MODERACIÓN
-- Ejecutar en Supabase Dashboard -> SQL Editor si se desea aplicar en la base de datos
-- ==============================================================================

-- 1. Ampliar tabla fichas_tecnicas con tipo de ficha, moderación y propuesta de imágenes
ALTER TABLE fichas_tecnicas
    ADD COLUMN IF NOT EXISTS tipo_ficha TEXT DEFAULT 'concepto',
    ADD COLUMN IF NOT EXISTS imagen_oficial_url TEXT,
    ADD COLUMN IF NOT EXISTS imagen_propuesta_url TEXT,
    ADD COLUMN IF NOT EXISTS estado_propuesta TEXT, -- 'pendiente', 'aprobada', 'rechazada'
    ADD COLUMN IF NOT EXISTS propuesta_por_email TEXT,
    ADD COLUMN IF NOT EXISTS reportada_eliminar BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS votos_reporte INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS explicacion_ia TEXT;

-- Índices para optimizar las consultas de moderación
CREATE INDEX IF NOT EXISTS idx_fichas_reportada ON fichas_tecnicas(reportada_eliminar);
CREATE INDEX IF NOT EXISTS idx_fichas_estado_propuesta ON fichas_tecnicas(estado_propuesta);
CREATE INDEX IF NOT EXISTS idx_fichas_tipo ON fichas_tecnicas(tipo_ficha);

-- 2. Meta diaria de fichas configurable por usuario
ALTER TABLE perfiles_usuarios
    ADD COLUMN IF NOT EXISTS meta_fichas_diarias INTEGER DEFAULT 20;

-- 3. Políticas RLS: Asegurar que los usuarios pueden reportar fichas y proponer imágenes
DROP POLICY IF EXISTS "fichas_update_controlado" ON fichas_tecnicas;
CREATE POLICY "fichas_update_controlado" ON fichas_tecnicas FOR UPDATE USING (true) WITH CHECK (true);
