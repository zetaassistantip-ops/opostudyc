-- ==============================================================================
-- OPOBOMBEROS CAM 35 - VALORACIÓN DE PREGUNTAS Y GESTIÓN DE ADMINISTRADOR
-- Ejecutar en Supabase Dashboard -> SQL Editor (si aún no se han creado las columnas)
-- ==============================================================================

-- 1. COLUMNAS DE VALORACIÓN EN TABLA PREGUNTAS
ALTER TABLE preguntas 
    ADD COLUMN IF NOT EXISTS votos_buena INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS votos_regular INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS votos_mala INTEGER DEFAULT 0;

-- 2. ÍNDICES PARA EL PANEL DE MODERACIÓN
CREATE INDEX IF NOT EXISTS idx_preguntas_votos_mala ON preguntas(votos_mala DESC);
CREATE INDEX IF NOT EXISTS idx_preguntas_votos_buena ON preguntas(votos_buena DESC);
CREATE INDEX IF NOT EXISTS idx_preguntas_votos_regular ON preguntas(votos_regular DESC);

-- 3. PERMITIR BORRADO (DELETE) DE PREGUNTAS PARA GESTIÓN DE CALIDAD
DROP POLICY IF EXISTS "preguntas_delete_controlado" ON preguntas;
CREATE POLICY "preguntas_delete_controlado" ON preguntas FOR DELETE USING (true);

-- 4. ASEGURAR QUE UPDATE PERMITE ACTUALIZAR LOS CONTADORES DE VOTOS
DROP POLICY IF EXISTS "preguntas_update_srs" ON preguntas;
CREATE POLICY "preguntas_update_srs" ON preguntas FOR UPDATE USING (true) WITH CHECK (true);
