-- ==============================================================================
-- OPOBOMBEROS CAM 35 - SCRIPT DE BLINDAJE DE SEGURIDAD (RLS Y TRIGGER)
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. ELIMINAR POLÍTICAS PERMISIVAS ANTERIORES QUE PERMITÍAN 'FOR ALL' (DELETE/UPDATE)
DROP POLICY IF EXISTS "Permitir insercion secciones" ON secciones_temario;
DROP POLICY IF EXISTS "Permitir lectura y actualizacion preguntas" ON preguntas;
DROP POLICY IF EXISTS "Permitir lectura publica temas" ON temas;
DROP POLICY IF EXISTS "Permitir lectura publica secciones" ON secciones_temario;

-- 2. ASEGURAR ROW LEVEL SECURITY ACTIVO EN TODAS LAS TABLAS
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE secciones_temario ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. TABLA: TEMAS (Catálogo Oficial de los 35 Temas)
-- Regla: 100% SOLO LECTURA. Nadie desde el cliente puede insertar, modificar ni borrar.
-- ------------------------------------------------------------------------------
CREATE POLICY "temas_select_publico"
    ON temas
    FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLA: SECCIONES_TEMARIO (Contenido oficial de los PDFs del Temario)
-- Regla: Lectura pública. Prohibido DELETE y UPDATE a usuarios/anon.
-- Solo permite INSERT para nuevas secciones si se realiza una ingesta.
-- ------------------------------------------------------------------------------
CREATE POLICY "secciones_select_publico"
    ON secciones_temario
    FOR SELECT
    USING (true);

CREATE POLICY "secciones_insert_controlado"
    ON secciones_temario
    FOR INSERT
    WITH CHECK (true);

-- No se crean políticas para UPDATE ni DELETE -> Bloqueo total de borrado/modificación.

-- ------------------------------------------------------------------------------
-- 5. TABLA: PREGUNTAS
-- Regla: 
-- - Lectura pública (SELECT).
-- - Inserción permitida (INSERT) para generador de tests.
-- - Modificación permitida (UPDATE) para el algoritmo SRS Leitner.
-- - Borrado (DELETE) TOTALMENTE BLOQUEADO.
-- ------------------------------------------------------------------------------
CREATE POLICY "preguntas_select_publico"
    ON preguntas
    FOR SELECT
    USING (true);

CREATE POLICY "preguntas_insert_controlado"
    ON preguntas
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "preguntas_update_srs"
    ON preguntas
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. TRIGGER DE INTEGRIDAD: INMUTABILIDAD DEL CONTENIDO DE PREGUNTAS
-- Garantiza que cualquier UPDATE solo pueda modificar el progreso SRS (caja_leitner, etc.)
-- y NUNCA pueda adulterar el enunciado, las opciones ni la respuesta correcta.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION proteger_contenido_preguntas()
RETURNS TRIGGER AS $$
BEGIN
    -- Forzar a que los campos de examen mantengan siempre su valor original
    NEW.id := OLD.id;
    NEW.tema_id := OLD.tema_id;
    NEW.seccion_id := OLD.seccion_id;
    NEW.enunciado := OLD.enunciado;
    NEW.opciones := OLD.opciones;
    NEW.respuesta_correcta := OLD.respuesta_correcta;
    NEW.explicacion_profesor := OLD.explicacion_profesor;
    NEW.cita_exacta := OLD.cita_exacta;
    NEW.created_at := OLD.created_at;

    -- Solo se permite que cambien los campos del algoritmo SRS y etiquetas:
    -- (NEW.caja_leitner, NEW.proxima_revision, NEW.fallos_totales,
    --  NEW.aciertos_consecutivos, NEW.ultima_vez_vista, NEW.dato_clave_etiqueta)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_contenido_preguntas ON preguntas;

CREATE TRIGGER trg_proteger_contenido_preguntas
    BEFORE UPDATE ON preguntas
    FOR EACH ROW
    EXECUTE FUNCTION proteger_contenido_preguntas();

-- Fin del script de blindaje
