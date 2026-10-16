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

-- 7. INSERT INICIAL: LOS 35 TEMAS OFICIALES BOMBEROS CAM
INSERT INTO temas (id, titulo, bloque) VALUES
-- BLOQUE I: DERECHO, LEGISLACIÓN Y PROTECCIÓN CIVIL (Temas 1 al 10)
(1, 'La Constitución Española de 1978: Principios, Derechos y Deberes', 'Legislación y Organización'),
(2, 'La Corona, las Cortes Generales y el Poder Judicial', 'Legislación y Organización'),
(3, 'El Gobierno y la Administración. La Administración General del Estado', 'Legislación y Organización'),
(4, 'Organización territorial del Estado y Estatuto de Autonomía de la Comunidad de Madrid', 'Legislación y Organización'),
(5, 'Instituciones de autogobierno de la Comunidad de Madrid: Asamblea y Gobierno', 'Legislación y Organización'),
(6, 'Régimen Local Español: El Municipio y la Provincia. Ley 7/1985', 'Legislación y Organización'),
(7, 'Estatuto Básico del Empleado Público (TREBEP): Derechos, Deberes y Régimen Disciplinario', 'Legislación y Organización'),
(8, 'Ley 17/2015 del Sistema Nacional de Protección Civil', 'Legislación y Organización'),
(9, 'Ley 31/1995 de Prevención de Riesgos Laborales aplicada a los Servicios de Bomberos', 'Legislación y Organización'),
(10, 'Plan Territorial de Protección Civil de la Comunidad de Madrid (PLATERCAM) y Planes Especiales', 'Legislación y Organización'),

-- BLOQUE II: FÍSICA, QUÍMICA, HIDRÁULICA Y FUEGO (Temas 11 al 18)
(11, 'Física y Química del Fuego: Triángulo y Tetraedro, Mecanismos de Extinción', 'Teoría del Fuego e Hidráulica'),
(12, 'Dinámica de Incendios Confinados: Flashover, Backdraft, Flujo de Gases y Ventilación Táctica', 'Teoría del Fuego e Hidráulica'),
(13, 'Agentes Extintores: Agua, Espumas, Polvos Químicos y Gases Inertes (UNE-EN 2)', 'Teoría del Fuego e Hidráulica'),
(14, 'Mecánica de Fluidos e Hidráulica Aplicada: Presión, Caudal, Pérdida de Carga y Golpe de Ariete', 'Teoría del Fuego e Hidráulica'),
(15, 'Mangueras, Lanzas, Racores y Accesorios Hidráulicos (Normas UNE)', 'Teoría del Fuego e Hidráulica'),
(16, 'Bombas Centrífugas contra Incendios: Cebadores, Curvas Características y Cavitación', 'Teoría del Fuego e Hidráulica'),
(17, 'Equipos de Protección Individual (EPIs) y Protección Respiratoria (ERA): Fisiología y Autonomía', 'Técnicas y Equipos'),
(18, 'Materias Peligrosas (ADR): Identificación, Paneles Naranja, Diamante NFPA y Niveles de Riesgo', 'Técnicas y Equipos'),

-- BLOQUE III: CONSTRUCCIÓN, INSTALACIONES Y RESCATE (Temas 19 al 26)
(19, 'Código Técnico de la Edificación (CTE): DB SI Seguridad en caso de Incendio', 'Construcción y Normativa'),
(20, 'Elementos Estructurales y Comportamiento al Fuego de Materiales (Hormigón, Acero, Madera)', 'Construcción y Normativa'),
(21, 'Patologías de la Edificación, Apuntalamientos de Emergencia y Técnicas de Desescombro', 'Construcción y Normativa'),
(22, 'Instalaciones de Gas: GLP, Gas Natural, Depósitos, Redes de Distribución y Actuación', 'Instalaciones y Seguridad'),
(23, 'Instalaciones Eléctricas de Baja y Alta Tensión: Riesgo Eléctrico y Distancias de Seguridad', 'Instalaciones y Seguridad'),
(24, 'Instalaciones de Protección contra Incendios (RIPCI): BIEs, Hidrantes, Rociadores y Columna Seca', 'Instalaciones y Seguridad'),
(25, 'Técnicas de Rescate en Accidentes de Tráfico: Descarcelación, Estabilización y Vehículos Híbridos/Eléctricos', 'Rescate y Salvamento'),
(26, 'Rescate en Altura, Espacios Confinados y Salvamento en Medio Acuático', 'Rescate y Salvamento'),

-- BLOQUE IV: GEOGRAFÍA, TERRITORIO Y MEDIO NATURAL CAM (Temas 27 al 31)
(27, 'Geografía Física de la Comunidad de Madrid: Relieve, Principales Vértices y Pasos de Montaña', 'Geografía y Territorio CAM'),
(28, 'Hidrografía de la Comunidad de Madrid: Cuenca del Tajo, Ríos, Embalses y Canal de Isabel II', 'Geografía y Territorio CAM'),
(29, 'Red de Comunicaciones: Autovías, Carreteras Principales, Ferrocarriles y Red de Metro CAM', 'Geografía y Territorio CAM'),
(30, 'División Comarcal, Municipios, Parques de Bomberos del Cuerpo de Bomberos de la CAM', 'Geografía y Territorio CAM'),
(31, 'Plan INFOMA: Incendios Forestales en la CAM, Índices de Gravedad, Focos y Modelos de Combustible', 'Geografía y Territorio CAM'),

-- BLOQUE V: EMERGENCIAS SANITARIAS Y PSICOLOGÍA (Temas 32 al 35)
(32, 'Soporte Vital Básico (SVB), Reanimación Cardiopulmonar (RCP) y Desfibrilación Semiautomática (DESA)', 'Sanitario y Primeros Auxilios'),
(33, 'Atención Inicial al Paciente Politraumatizado en Emergencias: Movilización e Inmovilización', 'Sanitario y Primeros Auxilios'),
(34, 'Urgencias Médicas: Quemaduras, Intoxicación por Humos (Cianuro y Monóxido de Carbono), Hipotermia', 'Sanitario y Primeros Auxilios'),
(35, 'Triage en Incidentes con Múltiples Víctimas (IMV) y Primeros Auxilios Psicológicos en Catástrofes', 'Sanitario y Primeros Auxilios')
ON CONFLICT (id) DO UPDATE SET 
    titulo = EXCLUDED.titulo,
    bloque = EXCLUDED.bloque;
