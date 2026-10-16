-- ==============================================================================
-- OPOBOMBEROS CAM 35 - BANCO GLOBAL COMPARTIDO + PROGRESO INDIVIDUAL SRS
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. TABLA TEMAS (Lectura pública para todos los opositores)
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temas_select_publico" ON temas;
DROP POLICY IF EXISTS "temas_read_only" ON temas;
CREATE POLICY "temas_select_publico" ON temas FOR SELECT USING (true);

-- 2. TABLA SECCIONES_TEMARIO (Banco Global de Temario)
ALTER TABLE secciones_temario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secciones_select_publico" ON secciones_temario;
DROP POLICY IF EXISTS "secciones_insert_controlado" ON secciones_temario;
CREATE POLICY "secciones_select_publico" ON secciones_temario FOR SELECT USING (true);
CREATE POLICY "secciones_insert_controlado" ON secciones_temario FOR INSERT WITH CHECK (true);

-- 3. TABLA PREGUNTAS (Banco Global de Preguntas de Examen)
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preguntas_select_publico" ON preguntas;
DROP POLICY IF EXISTS "preguntas_insert_controlado" ON preguntas;
DROP POLICY IF EXISTS "preguntas_update_srs" ON preguntas;
CREATE POLICY "preguntas_select_publico" ON preguntas FOR SELECT USING (true);
CREATE POLICY "preguntas_insert_controlado" ON preguntas FOR INSERT WITH CHECK (true);
CREATE POLICY "preguntas_update_srs" ON preguntas FOR UPDATE USING (true) WITH CHECK (true);

-- 4. TABLA USUARIO_PROGRESO_SRS (Progreso Estrictamente Individual por Opositor)
CREATE TABLE IF NOT EXISTS usuario_progreso_srs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    caja_leitner INT DEFAULT 0,
    proxima_revision TIMESTAMPTZ DEFAULT NOW(),
    fallos_totales INT DEFAULT 0,
    aciertos_consecutivos INT DEFAULT 0,
    ultima_vez_vista TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pregunta_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_progreso_user ON usuario_progreso_srs(user_id);
CREATE INDEX IF NOT EXISTS idx_usuario_progreso_revision ON usuario_progreso_srs(user_id, proxima_revision);
CREATE INDEX IF NOT EXISTS idx_usuario_progreso_pregunta ON usuario_progreso_srs(pregunta_id);

ALTER TABLE usuario_progreso_srs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios solo gestionan su propio progreso" ON usuario_progreso_srs;
CREATE POLICY "Los usuarios solo gestionan su propio progreso"
    ON usuario_progreso_srs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
