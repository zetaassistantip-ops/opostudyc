-- ==============================================================================
-- OPOBOMBEROS CAM 35 - FIX DE PERMISOS RLS + HISTORIAL DE SESIONES
-- Ejecutar en Supabase Dashboard -> SQL Editor (para solucionar cualquier fallo de inserción o RLS)
-- ==============================================================================

-- 1. TABLA TEMAS (Lectura pública para todos los usuarios)
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "temas_select_publico" ON temas;
DROP POLICY IF EXISTS "temas_read_only" ON temas;
CREATE POLICY "temas_select_publico" ON temas FOR SELECT USING (true);

-- 2. TABLA SECCIONES_TEMARIO (Lectura e Inserción para Banco Global)
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

-- 4. TABLA USUARIO_PROGRESO_SRS (Progreso Estrictamente Individual por Usuario)
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

-- 5. TABLA HISTORIAL_SESIONES (Registro Diario de Racha y Sesiones)
CREATE TABLE IF NOT EXISTS historial_sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_sesion TEXT NOT NULL, -- 'tema', 'repaso_srs', 'fallos'
    tema_id INT REFERENCES temas(id) ON DELETE SET NULL,
    titulo_sesion TEXT NOT NULL,
    preguntas_respondidas INT NOT NULL,
    aciertos INT NOT NULL,
    dudas INT DEFAULT 0,
    fallos INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_historial_user ON historial_sesiones(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_sesiones(user_id, fecha);

ALTER TABLE historial_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios solo ven su propio historial de sesiones" ON historial_sesiones;
CREATE POLICY "Los usuarios solo ven su propio historial de sesiones"
    ON historial_sesiones
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. TABLA FICHAS_TECNICAS (Banco Global de Fichas Clave de Examen)
CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tema_id INT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    concepto TEXT NOT NULL,
    valor_exacto TEXT NOT NULL,
    trampa_habitual TEXT NOT NULL,
    categoria_dato TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fichas_tema ON fichas_tecnicas(tema_id);

ALTER TABLE fichas_tecnicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fichas_select_publico" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fichas_insert_controlado" ON fichas_tecnicas;
DROP POLICY IF EXISTS "fichas_delete_controlado" ON fichas_tecnicas;

CREATE POLICY "fichas_select_publico" ON fichas_tecnicas FOR SELECT USING (true);
CREATE POLICY "fichas_insert_controlado" ON fichas_tecnicas FOR INSERT WITH CHECK (true);
CREATE POLICY "fichas_delete_controlado" ON fichas_tecnicas FOR DELETE USING (true);

