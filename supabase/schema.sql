-- ==============================================================================
-- OPOBOMBEROS CAM 35 - ESQUEMA SUPABASE
-- Sistema de reconocimiento activo y repetición espaciada (SRS Leitner)
-- 35 Temas Oficiales del Cuerpo de Bomberos de la Comunidad de Madrid
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA TEMAS (1 al 35)
CREATE TABLE IF NOT EXISTS temas (
    id INT PRIMARY KEY,
    titulo TEXT NOT NULL,
    bloque TEXT NOT NULL
);

-- 3. TABLA SECCIONES_TEMARIO
CREATE TABLE IF NOT EXISTS secciones_temario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tema_id INT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    epigrafe TEXT NOT NULL,
    contenido_markdown TEXT NOT NULL,
    datos_criticos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA PREGUNTAS
CREATE TABLE IF NOT EXISTS preguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tema_id INT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    seccion_id UUID REFERENCES secciones_temario(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    opciones JSONB NOT NULL, -- Array de 4 strings: ["opcion 1", "opcion 2", "opcion 3", "opcion 4"]
    respuesta_correcta INT NOT NULL, -- Índice original (0, 1, 2 o 3)
    explicacion_profesor TEXT NOT NULL,
    cita_exacta TEXT NOT NULL,
    dato_clave_etiqueta TEXT,
    
    -- Algoritmo SRS (Leitner) contra la curva del olvido:
    caja_leitner INT DEFAULT 0, -- Rango: 0 a 5
    proxima_revision TIMESTAMPTZ DEFAULT NOW(),
    fallos_totales INT DEFAULT 0,
    aciertos_consecutivos INT DEFAULT 0,
    ultima_vez_vista TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_preguntas_proxima_revision ON preguntas(proxima_revision);
CREATE INDEX IF NOT EXISTS idx_preguntas_caja_leitner ON preguntas(caja_leitner);
CREATE INDEX IF NOT EXISTS idx_preguntas_tema_id ON preguntas(tema_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_seccion_id ON preguntas(seccion_id);
CREATE INDEX IF NOT EXISTS idx_secciones_tema_id ON secciones_temario(tema_id);

-- 6. POLÍTICAS DE RLS BLINDADAS (Row Level Security)
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE secciones_temario ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas ENABLE ROW LEVEL SECURITY;

-- 6.1 TEMAS: Solo lectura pública. INSERT, UPDATE y DELETE totalmente bloqueados.
CREATE POLICY "temas_select_publico" ON temas FOR SELECT USING (true);

-- 6.2 SECCIONES_TEMARIO: Lectura e inserción controlada. UPDATE y DELETE bloqueados.
CREATE POLICY "secciones_select_publico" ON secciones_temario FOR SELECT USING (true);
CREATE POLICY "secciones_insert_controlado" ON secciones_temario FOR INSERT WITH CHECK (true);

-- 6.3 PREGUNTAS: Lectura, inserción y actualización SRS. DELETE totalmente bloqueado.
CREATE POLICY "preguntas_select_publico" ON preguntas FOR SELECT USING (true);
CREATE POLICY "preguntas_insert_controlado" ON preguntas FOR INSERT WITH CHECK (true);
CREATE POLICY "preguntas_update_srs" ON preguntas FOR UPDATE USING (true) WITH CHECK (true);

-- 6.4 TRIGGER DE INTEGRIDAD: Inmutabilidad del contenido de las preguntas
CREATE OR REPLACE FUNCTION proteger_contenido_preguntas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.id := OLD.id;
    NEW.tema_id := OLD.tema_id;
    NEW.seccion_id := OLD.seccion_id;
    NEW.enunciado := OLD.enunciado;
    NEW.opciones := OLD.opciones;
    NEW.respuesta_correcta := OLD.respuesta_correcta;
    NEW.explicacion_profesor := OLD.explicacion_profesor;
    NEW.cita_exacta := OLD.cita_exacta;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_contenido_preguntas ON preguntas;
CREATE TRIGGER trg_proteger_contenido_preguntas
    BEFORE UPDATE ON preguntas
    FOR EACH ROW
    EXECUTE FUNCTION proteger_contenido_preguntas();

-- 7. INSERT INICIAL: LOS 35 TEMAS OFICIALES BOMBEROS CAM (SEGÚN CONVOCATORIA Y PDFS)
INSERT INTO temas (id, titulo, bloque) VALUES
(1, 'La Función Pública', 'Legislación y Organización'),
(2, 'Igualdad de Oportunidades y No Discriminación', 'Legislación y Organización'),
(3, 'Prevención de Riesgos Laborales (PRL) y EPI', 'Legislación y Organización'),
(4, 'Decreto Legislativo 1/2006 (Cuerpo de Bomberos CAM)', 'Legislación y Organización'),
(5, 'Sistema Nacional de Protección Civil (SNPC)', 'Legislación y Organización'),
(6, 'Plan Territorial de Protección Civil (PLATERCAM)', 'Legislación y Organización'),
(7, 'Código Técnico de la Edificación (CTE DB SI)', 'Construcción y Normativa'),
(8, 'Territorio y Red de Infraestructuras de la CM', 'Geografía y Territorio CAM'),
(9, 'Organización del Cuerpo de Bomberos de la CM (CBCM)', 'Legislación y Organización'),
(10, 'Mecánica Básica de Vehículos de Bomberos', 'Técnicas y Conducción'),
(11, 'Comunicaciones en Emergencias (TETRA)', 'Técnicas y Conducción'),
(12, 'Soporte Vital Básico I (SVB I)', 'Sanitario y Primeros Auxilios'),
(13, 'Soporte Vital Básico II (SVB II)', 'Sanitario y Primeros Auxilios'),
(14, 'Psicología para Intervinientes en Emergencias', 'Sanitario y Primeros Auxilios'),
(15, 'Hidráulica de Bomberos y Mecánica de Fluidos', 'Teoría del Fuego e Hidráulica'),
(16, 'Naturaleza del Fuego, Métodos y Agentes Extintores', 'Teoría del Fuego e Hidráulica'),
(17, 'Incendios en la Edificación I', 'Técnicas de Intervención'),
(18, 'Incendios en la Edificación II', 'Técnicas de Intervención'),
(19, 'Incendios de Vegetación I (Combustibles y Comportamiento)', 'Técnicas de Intervención'),
(20, 'Incendios de Vegetación II (Tácticas y Medios INFOMA)', 'Técnicas de Intervención'),
(21, 'Riesgo Químico y Biológico I (RBQ I - ADR)', 'Técnicas y Materias Peligrosas'),
(22, 'Riesgo Químico y Biológico II (RBQ II - Descontaminación)', 'Técnicas y Materias Peligrosas'),
(23, 'Construcción I (Materiales y Estructuras)', 'Construcción y Normativa'),
(24, 'Construcción II (Patologías y Apuntalamientos)', 'Construcción y Normativa'),
(25, 'Rescate en Accidentes de Tráfico I (RAT I)', 'Rescate y Salvamento'),
(26, 'Rescate en Accidentes de Tráfico II (RAT II - Descarcelación)', 'Rescate y Salvamento'),
(27, 'Trabajos Verticales y en Altura', 'Rescate y Salvamento'),
(28, 'Riesgo Eléctrico y Distancias de Seguridad', 'Instalaciones y Seguridad'),
(29, 'Suministros de Gas (GLP y Gas Natural)', 'Instalaciones y Seguridad'),
(30, 'Intervenciones con Abejas y Avispas (Himenópteros)', 'Técnicas Especiales'),
(31, 'Ascensores y Aperturas Forzosas', 'Técnicas Especiales'),
(32, 'Apeos y Tala de Arbolado en Emergencias', 'Técnicas Especiales'),
(33, 'Actuación en Conductas Autolíticas (Prevención del Suicidio)', 'Sanitario y Primeros Auxilios'),
(34, 'Rescate Acuático y en Inundaciones', 'Rescate y Salvamento'),
(35, 'Conducción Segura en Emergencias', 'Técnicas y Conducción')
ON CONFLICT (id) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    bloque = EXCLUDED.bloque;
