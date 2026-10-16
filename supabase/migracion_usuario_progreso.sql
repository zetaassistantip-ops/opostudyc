-- ==============================================================================
-- OPOBOMBEROS CAM 35 - PROGRESO INDIVIDUAL POR OPOSITOR (SRS LEITNER)
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. TABLA DE PROGRESO INDIVIDUAL
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

-- 2. ÍNDICES DE ALTO RENDIMIENTO PARA CONSULTAS POR USUARIO Y REVISIÓN PENDIENTE
CREATE INDEX IF NOT EXISTS idx_usuario_progreso_user ON usuario_progreso_srs(user_id);
CREATE INDEX IF NOT EXISTS idx_usuario_progreso_revision ON usuario_progreso_srs(user_id, proxima_revision);
CREATE INDEX IF NOT EXISTS idx_usuario_progreso_pregunta ON usuario_progreso_srs(pregunta_id);

-- 3. ACTIVAR ROW LEVEL SECURITY
ALTER TABLE usuario_progreso_srs ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS: CADA OPOSITOR SOLO VE Y MODIFICA SU PROPIO PROGRESO
DROP POLICY IF EXISTS "Los usuarios solo gestionan su propio progreso" ON usuario_progreso_srs;

CREATE POLICY "Los usuarios solo gestionan su propio progreso"
    ON usuario_progreso_srs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
