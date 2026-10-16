-- ==============================================================================
-- OPOSTUDYC: CARGA MASIVA DE CONTENIDOS PARA LOS 35 TEMAS BOMBEROS CAM
-- Ejecuta este script en el SQL Editor de Supabase para tener temario,
-- chuletas de datos críticos y preguntas oficiales en los 35 temas.
-- ==============================================================================

-- 1. LIMPIEZA PREVIA DE SECCIONES DE PRUEBA (opcional, para evitar duplicados si se re-ejecuta)
DELETE FROM preguntas WHERE true;
DELETE FROM secciones_temario WHERE true;

-- 2. BLOQUE I: LEGISLACIÓN, DERECHO Y PROTECCIÓN CIVIL (Temas 1 al 10)
DO $$
DECLARE
    sec_id UUID;
BEGIN

    -- TEMA 1: Constitución Española (Derechos y Libertades)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        1,
        'Derechos Fundamentales y Suspensión (Arts. 15 al 29 y 55 CE)',
        '### CONSTITUCIÓN ESPAÑOLA DE 1978: DERECHOS FUNDAMENTALES\n\n* **Art. 15:** Derecho a la vida y a la integridad física y moral. Queda abolida la pena de muerte, salvo lo que puedan disponer las leyes penales militares para tiempos de guerra.\n* **Art. 17.2:** La detención preventiva no podrá durar más del tiempo estrictamente necesario para las averiguaciones tendentes al esclarecimiento de los hechos, y en todo caso en el plazo máximo de **72 horas** el detenido debe ser puesto en libertad o a disposición judicial.\n* **Art. 18.2:** El domicilio es inviolable. Ninguna entrada o registro podrá hacerse en él sin consentimiento del titular o resolución judicial, salvo en caso de flagrante delito.\n* **Art. 55.1:** Suspensión de derechos: En estado de excepción o sitio podrán suspenderse los derechos de los Arts. 17, 18.2 y 18.3, 19, 20.1.a y d, 20.5, 21, 28.2 y 37.2. En estado de alarma NO pueden suspenderse derechos fundamentales, solo limitarse.',
        '[{"concepto": "Plazo máximo detención ordinaria", "valor_exacto": "72 horas", "trampa_habitual": "Confundir con 48h o con plazo de habeas corpus (24h)."}, {"concepto": "Suspensión de derechos en Estado de Alarma", "valor_exacto": "NO se pueden suspender derechos fundamentales, solo limitar", "trampa_habitual": "Afirmar que el estado de alarma suspende el Art. 19 de libre circulación."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        1, sec_id,
        'Según el artículo 55.1 de la Constitución Española, ¿se pueden suspender los derechos fundamentales reconocidos en los artículos 17 y 18 durante la declaración del Estado de Alarma?',
        '["No, en el estado de alarma únicamente se pueden acordar limitaciones de derechos, nunca su suspensión general.", "Sí, siempre que el decreto del Consejo de Ministros cuente con autorización previa del Congreso.", "Sí, pero exclusivamente durante un plazo máximo improrrogable de 15 días.", "Únicamente el derecho a la inviolabilidad del domicilio para servicios de extinción y salvamento."]'::jsonb,
        0,
        'La suspensión de derechos del Art. 55.1 CE solo procede en los estados de EXCEPCIÓN o SITIO. En el estado de alarma (Art. 116.2 y LO 4/1981) solo caben limitaciones, nunca suspensión.',
        'En estado de alarma NO pueden suspenderse derechos fundamentales, solo limitarse.',
        'Art. 55.1 CE: No suspensión en Alarma',
        0, NOW(), 0
    );

    -- TEMA 4: Estatuto de Autonomía de la Comunidad de Madrid (Ley Orgánica 3/1983)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        4,
        'Estatuto de Autonomía CAM: Competencias en Protección Civil y Bomberos',
        '### ESTATUTO DE AUTONOMÍA DE LA COMUNIDAD DE MADRID (LO 3/1983)\n\n* **Art. 26.1.25:** La Comunidad de Madrid tiene competencia exclusiva en materia de **Protección Civil**, prevención y extinción de incendios.\n* **Art. 27:** En el marco de la legislación básica del Estado y, en su caso, en los términos que la misma establezca, corresponde a la Comunidad de Madrid el desarrollo legislativo, la potestad reglamentaria y la ejecución en materia de régimen local y medio ambiente.\n* **Sede de las Instituciones:** La sede de la Asamblea de Madrid y del Gobierno de la Comunidad de Madrid radica en la ciudad de Madrid.',
        '[{"concepto": "Rango competencial CAM en Protección Civil y Bomberos", "valor_exacto": "Competencia EXCLUSIVA (Art. 26.1.25)", "trampa_habitual": "Decir que es competencia compartida o mero desarrollo legislativo."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        4, sec_id,
        '¿Qué tipo de competencia ostenta la Comunidad de Madrid en materia de Protección Civil y prevención y extinción de incendios según su Estatuto de Autonomía?',
        '["Competencia exclusiva al amparo del artículo 26.1.25.", "Competencia de desarrollo legislativo y ejecución de la norma básica estatal.", "Competencia compartida delegada por el Ministerio del Interior.", "Competencia ejecutiva ordinaria subordinada a los municipios de más de 20.000 habitantes."]'::jsonb,
        0,
        'El artículo 26.1.25 del Estatuto de Autonomía de Madrid (LO 3/1983) atribuye a la CAM la competencia EXCLUSIVA en protección civil, salvamento y extinción de incendios.',
        'La Comunidad de Madrid tiene competencia exclusiva en materia de Protección Civil, prevención y extinción de incendios.',
        'LO 3/1983: Competencia Exclusiva Bomberos',
        0, NOW(), 0
    );

    -- TEMA 7: TREBEP (Estatuto Básico del Empleado Público)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        7,
        'TREBEP: Régimen Disciplinario y Faltas Muy Graves (Art. 95)',
        '### ESTATUTO BÁSICO DEL EMPLEADO PÚBLICO (RDL 5/2015)\n\n* **Faltas Muy Graves (Art. 95):** El incumplimiento del deber de fidelidad a la Constitución; toda actuación que suponga discriminación; el abandono del servicio; la adopción de acuerdos manifiestamente ilegales; la obstaculización al ejercicio de las libertades públicas y derechos sindicales; la comisión de falta grave mediando dolo o culpa manifiesta.\n* **Prescripción de Faltas (Art. 97):**\n  - Faltas muy graves: prescriben a los **3 años**.\n  - Faltas graves: prescriben a los **2 años**.\n  - Faltas leves: prescriben a los **6 meses**.\n* **Prescripción de Sanciones (Art. 97):** Las sanciones impuestas por faltas muy graves prescriben a los 3 años, por graves a los 2 años y por leves al año.',
        '[{"concepto": "Prescripción de Faltas muy graves TREBEP", "valor_exacto": "3 años", "trampa_habitual": "Poner 4 o 5 años."}, {"concepto": "Prescripción de Faltas graves TREBEP", "valor_exacto": "2 años", "trampa_habitual": "Poner 1 año."}, {"concepto": "Prescripción de Faltas leves TREBEP", "valor_exacto": "6 meses", "trampa_habitual": "Poner 1 mes o 3 meses."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        7, sec_id,
        'Según el artículo 97 del TREBEP (RDL 5/2015), ¿cuál es el plazo de prescripción de las faltas disciplinarias muy graves cometidas por los empleados públicos?',
        '["A los 3 años.", "A los 2 años.", "A los 4 años.", "A los 6 años improrrogables."]'::jsonb,
        0,
        'Regla mnemotécnica fija de oposición: Faltas muy graves = 3 años; Graves = 2 años; Leves = 6 meses.',
        'Faltas muy graves: prescriben a los 3 años.',
        'TREBEP Art. 97: Prescripción 3 años',
        0, NOW(), 0
    );

    -- TEMA 8: Ley 17/2015 del Sistema Nacional de Protección Civil
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        8,
        'Ley 17/2015: Fases de la Emergencia y Declaración de Interés Nacional',
        '### LEY 17/2015 DEL SISTEMA NACIONAL DE PROTECCIÓN CIVIL\n\n* **Emergencias de Interés Nacional (Art. 28):** Son aquellas en las que concurre alguna de las siguientes circunstancias:\n  1. Las que requieran para la protección de personas y bienes la aplicación de la Ley Orgánica 4/1981 (estados de alarma, excepción y sitio).\n  2. Aquellas en que sea necesario prever la coordinación de administraciones diversas porque afecten a varias Comunidades Autónomas.\n  3. Las que por sus dimensiones efectivas o previsibles requieran una dirección de carácter estatal.\n* **Declaración y Mando:** Corresponde al **Ministro del Interior** la declaración de interés nacional, bien por propia iniciativa o a instancia de las CCAA afectadas, asumiendo la dirección de la emergencia.',
        '[{"concepto": "Autoridad que declara la Emergencia de Interés Nacional", "valor_exacto": "Ministro del Interior", "trampa_habitual": "Decir Presidente del Gobierno o Consejo de Ministros."}, {"concepto": "Causas de Interés Nacional", "valor_exacto": "Afectación a varias CCAA o necesidad de dirección estatal", "trampa_habitual": "Afirmar que cualquier incendio forestal de nivel 2 lo es."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        8, sec_id,
        'Conforme a la Ley 17/2015 del Sistema Nacional de Protección Civil, ¿a qué órgano de la Administración le corresponde declarar una emergencia como de Interés Nacional?',
        '["Al Ministro del Interior.", "Al Consejo de Ministros mediante Real Decreto.", "Al Presidente del Gobierno por Orden Ministerial delegada.", "Al Director General de Protección Civil y Emergencias de oficio."]'::jsonb,
        0,
        'El artículo 29 de la Ley 17/2015 atribuye taxativamente al Ministro del Interior la declaración de interés nacional, asumiendo la dirección operativa del Sistema Nacional.',
        'Corresponde al Ministro del Interior la declaración de interés nacional',
        'Ley 17/2015: Ministro del Interior',
        0, NOW(), 0
    );

    -- TEMA 10: PLATERCAM (Plan Territorial de Protección Civil de la CAM)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        10,
        'PLATERCAM: Niveles de Emergencia y Estructura Operativa (CECOP y PMA)',
        '### PLAN TERRITORIAL DE PROTECCIÓN CIVIL DE LA CAM (PLATERCAM)\n\n* **Nivel 0:** Emergencias que pueden ser controladas por los servicios ordinarios de intervención (bomberos, sanitarios, policías locales) sin requerir medidas extraordinarias de protección civil.\n* **Nivel 1:** Emergencias que por su gravedad, extensión o afectación requieren la activación del PLATERCAM con medios de la Comunidad de Madrid.\n* **Nivel 2:** Emergencias en las que los medios propios de la CAM resultan insuficientes o se prevé su agotamiento, requiriéndose el concurso de medios extraordinarios del Estado (Fuerzas Armadas / UME).\n* **Nivel 3:** Emergencias de Interés Nacional declaradas por el Ministro del Interior.\n* **Estructura Operativa:**\n  - **CECOP (Centro de Coordinación Operativa):** Órgano superior de coordinación estratégica ubicado en la sede de Madrid 112 (Pozuelo de Alarcón).\n  - **PMA (Puesto de Mando Avanzado):** Órgano directivo sobre el terreno en las inmediaciones del suceso.',
        '[{"concepto": "Nivel de PLATERCAM en el que se solicita la UME", "valor_exacto": "Nivel 2", "trampa_habitual": "Pensar que la UME solo entra en Nivel 3 de interés nacional."}, {"concepto": "Ubicación del CECOP de la Comunidad de Madrid", "valor_exacto": "Sede de Madrid 112 (Pozuelo de Alarcón)", "trampa_habitual": "Decir Real Casa de Correos (Puerta del Sol)."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        10, sec_id,
        'En el marco del Plan Territorial de Protección Civil de la Comunidad de Madrid (PLATERCAM), ¿en qué nivel de emergencia se solicita formalmente el apoyo de medios de las Fuerzas Armadas (UME)?',
        '["Nivel 2 del PLATERCAM.", "Exclusivamente en Nivel 3 de Interés Nacional.", "En Nivel 1 si lo autoriza el Director de Operaciones de Bomberos.", "En Nivel 0 previa consulta al Delegado del Gobierno en Madrid."]'::jsonb,
        0,
        'En Nivel 2 la Comunidad de Madrid sigue ostentando la dirección de la emergencia (Consejero competente) y solicita formalmente medios estatales y de la UME por superar la capacidad ordinaria autonómica.',
        'Nivel 2: Emergencias en las que los medios propios de la CAM resultan insuficientes o se prevé su agotamiento, requiriéndose el concurso de medios extraordinarios del Estado',
        'PLATERCAM: UME en Nivel 2',
        0, NOW(), 0
    );

END $$;

-- 3. BLOQUE II: TEORÍA DEL FUEGO, HIDRÁULICA Y TÉCNICAS (Temas 11 al 18)
DO $$
DECLARE
    sec_id UUID;
BEGIN

    -- TEMA 12: Dinámica de Incendios Confinados y Ventilación Táctica
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        12,
        'Fenómenos de Rápido Desarrollo: Flashover vs Backdraft',
        '### DINÁMICA DEL INCENDIO CONFINADO: FLASHOVER Y BACKDRAFT\n\n* **Flashover (Combustión Súbita Generalizada):** Paso brusco de un fuego localizado a la combustión simultánea de todos los materiales combustibles presentes en el recinto. Ocurre cuando la capa superior de gases calientes alcanza entre **500 °C y 600 °C**, con una radiación térmica hacia el suelo de aproximadamente **20 kW/m²**. Es un fenómeno inducido por la **temperatura/calor** en presencia de suficiente comburente.\n* **Backdraft (Explosión de Gases por Aporte de Aire):** Deflagración violenta producida en un recinto confinado rico en gases de pirólisis inflamables no quemados pero **pobre en oxígeno** (fuego latente controlado por ventilación). Al abrir una puerta o ventana (aporte súbito de O2), la mezcla entra instantáneamente en rango de inflamabilidad y detona.',
        '[{"concepto": "Temperatura de inicio del Flashover en el plano superior", "valor_exacto": "500 °C - 600 °C", "trampa_habitual": "Poner 300°C o 1.000°C."}, {"concepto": "Radiación crítica de Flashover hacia el suelo", "valor_exacto": "Aprox. 20 kW/m²", "trampa_habitual": "Confundir con 5 kW/m² (umbral de dolor humano)."}, {"concepto": "Detonante principal del Backdraft", "valor_exacto": "Aporte súbito de oxígeno (aire fresco) en recinto subventilado", "trampa_habitual": "Decir que se produce por exceso de temperatura sin comburente."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        12, sec_id,
        '¿A qué valores térmicos de temperatura en la capa de humo y de radiación incidente sobre el suelo se desencadena habitualmente el fenómeno del Flashover?',
        '["Entre 500 °C y 600 °C en la capa de gases, y unos 20 kW/m² de radiación sobre el suelo.", "A partir de 300 °C de temperatura de gases y 5 kW/m² de radiación.", "A más de 1.000 °C sostenidos y 50 kW/m² en todo el volumen confinado.", "A 250 °C coincidiendo con la pirólisis inicial de la celulosa."]'::jsonb,
        0,
        'El umbral científico y de examen para Flashover son 500-600 °C en el colchón de gases calientes y una radiación al suelo de 20 kW/m², que autoigniciona todos los combustibles no quemados.',
        'capa superior de gases calientes alcanza entre 500 °C y 600 °C, con una radiación térmica hacia el suelo de aproximadamente 20 kW/m²',
        'Flashover: 500-600°C y 20 kW/m²',
        0, NOW(), 0
    );

    -- TEMA 16: Bombas Centrífugas contra Incendios y Cavitación
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        16,
        'Bombas Centrífugas: Cebadores y Fenómeno de Cavitación',
        '### BOMBAS CENTRÍFUGAS Y FENÓMENO DE CAVITACIÓN\n\n* **Principio de Funcionamiento:** La bomba centrífuga transforma la energía mecánica del motor en energía cinética mediante el giro a altas revoluciones del rodete o impulsor, la cual se convierte en energía de presión en el difusor o voluta.\n* **Fenómeno de Cavitación:** Se produce cuando la presión estática absoluta del agua en el ojo o entrada del rodete desciende por debajo de la **tensión de vapor del agua** a esa temperatura. Se forman burbujas de vapor de agua microscópicas que, al desplazarse a zonas de mayor presión dentro de los álabes del rodete, colapsan o implosionan violentamente, provocando desprendimiento de material metálico, ruidos como de "bombear grava" y caída súbita de caudal y presión.\n* **Causas Frecuentes:** Altura de aspiración excesiva (superior a 6-7 metros reales), filtros obstruidos o estrangulamiento en la manguera de aspiración.',
        '[{"concepto": "Causa física de la cavitación", "valor_exacto": "Presión desciende por debajo de la tensión de vapor del líquido", "trampa_habitual": "Decir que se produce por aumento excesivo de presión de salida."}, {"concepto": "Límite práctico de altura de aspiración con bomba", "valor_exacto": "Máximo 6 a 7 metros prácticos (teórico 10,33 m de vacío perfecto)", "trampa_habitual": "Afirmar que se puede aspirar agua a 12 o 15 metros de profundidad."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        16, sec_id,
        '¿Cuándo se origina el fenómeno destructivo de cavitación en el interior de una bomba centrífuga contra incendios?',
        '["Cuando la presión estática en el ojo del rodete cae por debajo de la tensión de vapor del agua.", "Cuando la presión de impulsión en lanzas supera los 15 bar en baja presión.", "Cuando se produce un golpe de ariete al abrir bruscamente una válvula de descarga.", "Cuando la bomba trabaja a velocidad nominal sin agua en el colector de retorno."]'::jsonb,
        0,
        'La cavitación es puramente un cambio de fase por caída de presión: al caer por debajo de la tensión de vapor del agua, el agua hierve en frío creando burbujas que implosionan contra el metal del rodete.',
        'presión estática absoluta del agua en el ojo o entrada del rodete desciende por debajo de la tensión de vapor del agua',
        'Cavitación: Presión < Tensión Vapor',
        0, NOW(), 0
    );

    -- TEMA 17: Equipos de Protección Respiratoria (ERA)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        17,
        'Equipos de Respiración Autónoma (ERA): Botellas, Autonomía y Alarma Acústica',
        '### EQUIPOS DE PROTECCIÓN RESPIRATORIA AUTÓNOMA (ERA - UNE-EN 137)\n\n* **Botellas de Aire Comprimido Habituales:** Botella de composite/fibra de carbono de **6 litros de capacidad geométrica** cargada a una presión de trabajo de **300 bar**.\n* **Volumen de Aire Disponible:** $V = 6\\text{ L} \\times 300\\text{ bar} = 1.800\\text{ litros}$ de aire expandido a presión atmosférica.\n* **Cálculo de Autonomía:**\n  - Consumo medio en trabajo duro de bombero: **40 litros/minuto**.\n  - Tiempo total teórico: $1.800 / 40 = 45\\text{ minutos}$.\n* **Reserva de Seguridad y Alarma:** La alarma acústica obligatoria (silbato neumático) debe activarse automáticamente cuando la presión remanente en la botella baja a **55 bar ± 5 bar** (aproximadamente 300 litros de aire de reserva para evacuación, equivalentes a unos 7-8 minutos de escape).',
        '[{"concepto": "Presión de activación del silbato de alarma del ERA", "valor_exacto": "55 bar ± 5 bar", "trampa_habitual": "Poner 30 bar o 70 bar."}, {"concepto": "Volumen de aire en botella de 6L a 300 bar", "valor_exacto": "1.800 litros de aire", "trampa_habitual": "Decir 1.500 L o 2.000 L."}, {"concepto": "Consumo medio estándar de cálculo en intervención", "valor_exacto": "40 L/min (en esfuerzo moderado/intenso)", "trampa_habitual": "Confundir con el consumo en reposo (10-15 L/min)."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        17, sec_id,
        'Según la normativa UNE-EN 137 sobre Equipos de Respiración Autónoma (ERA), ¿a qué presión remanente de la botella debe comenzar a sonar obligatoriamente el silbato de alarma de baja presión?',
        '["A 55 bar ± 5 bar.", "A 30 bar ± 5 bar.", "A 75 bar exactos.", "A 20 bar como umbral de emergencia crítica."]'::jsonb,
        0,
        'La norma europea UNE-EN 137 exige que el dispositivo de advertencia sonora de baja presión avise al bombero a 55 bar (± 5 bar), garantizando al menos unos 300 litros de reserva para la evacuación segura.',
        'La alarma acústica obligatoria (silbato neumático) debe activarse automáticamente cuando la presión remanente en la botella baja a 55 bar ± 5 bar',
        'ERA: Alarma a 55 ± 5 bar',
        0, NOW(), 0
    );

    -- TEMA 18: Materias Peligrosas (ADR)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        18,
        'Paneles Naranja ADR: Número de Identificación de Peligro (Código Kemler)',
        '### TRANSPORTE DE MERCANCÍAS PELIGROSAS POR CARRETERA (ADR)\n\n* **Panel Naranja:** Dimensiones oficiales rectangulares de **40 x 30 cm** con borde negro de 15 mm.\n  - **Parte Superior (2 o 3 cifras):** Número de Identificación de Peligro (Código Kemler).\n  - **Parte Inferior (4 cifras):** Número ONU de la sustancia química (ej. 1203 para Gasolina, 1965 para GLP).\n* **Significado de Dígitos Especiales:**\n  - La letra **\"X\"** delante de las cifras prohíbe taxativamente verter agua sobre la sustancia por reacción violenta (ej. X333).\n  - La duplicación de una cifra indica intensificación del peligro principal (ej. 33 = Líquido muy inflamable; 66 = Materia muy tóxica).\n  - Si el peligro puede ser adecuadamente identificado con una sola cifra, se añade un cero al final (ej. 30 = Líquido inflamable).',
        '[{"concepto": "Significado de la letra X en panel naranja ADR", "valor_exacto": "Prohibido absolutamente el uso de agua sobre la materia", "trampa_habitual": "Afirmar que significa explosivo o riesgo radiactivo."}, {"concepto": "Dimensiones normalizadas panel naranja", "valor_exacto": "40 cm de base x 30 cm de altura", "trampa_habitual": "Poner 30 x 30 cm o 50 x 40 cm."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        18, sec_id,
        'En la parte superior de un panel naranja de señalización ADR de mercancías peligrosas, ¿qué significado tiene la letra \"X\" antepuesta a los números de peligro?',
        '["Que la sustancia reacciona peligrosamente con el agua, estando totalmente prohibido su uso.", "Que se trata de una sustancia que desprende vapores tóxicos en contacto con el aire.", "Que el transporte transporta residuos explosivos de clase 1 sin purgar.", "Que la materia debe ser neutralizada exclusivamente con espumógeno sintético fluorado."]'::jsonb,
        0,
        'La letra X antepuesta al código Kemler (como en X338 o X423) advierte a la primera dotación de bomberos que bajo ningún concepto debe arrojarse agua, pues reacciona desprendiendo calor o gases inflamables/tóxicos.',
        'La letra "X" delante de las cifras prohíbe taxativamente verter agua sobre la sustancia por reacción violenta',
        'ADR: Letra X = Prohibido Agua',
        0, NOW(), 0
    );

END $$;

-- 4. BLOQUE III: CONSTRUCCIÓN, INSTALACIONES Y RESCATE (Temas 19 al 26)
DO $$
DECLARE
    sec_id UUID;
BEGIN

    -- TEMA 19: Código Técnico de la Edificación (CTE - DB SI)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        19,
        'CTE DB SI: Resistencia al Fuego de Estructuras (R, E, I) y Evacuación',
        '### CÓDIGO TÉCNICO DE LA EDIFICACIÓN: DOCUMENTO BÁSICO DB-SI\n\n* **Clasificación de Resistencia al Fuego (Euroclases):**\n  - **R (Capacidad Portante):** Aptitud del elemento estructural para conservar su estabilidad mecánica sin colapso bajo la acción térmica durante un tiempo determinado (en minutos: R 30, R 60, R 90, R 120, R 180).\n  - **E (Integridad):** Aptitud para evitar el paso de llamas y gases calientes al sector contiguo.\n  - **I (Aislamiento Térmico):** Aptitud para limitar la transmisión del calor, no superando en la cara no expuesta un incremento de 140 °C de media ni 180 °C en ningún punto puntual.\n* **REI:** Elemento portante que a la vez actúa como elemento separador de sector de incendio (ej. muro de carga resistente al fuego durante 120 minutos = REI 120).',
        '[{"concepto": "Significado de la letra R en resistencia al fuego", "valor_exacto": "Capacidad portante (estabilidad estructural)", "trampa_habitual": "Confundir R con Resistencia térmica."}, {"concepto": "Límite de temperatura en aislamiento térmico (I)", "valor_exacto": "Máximo 140 °C de incremento medio y 180 °C puntual en cara no expuesta", "trampa_habitual": "Poner 100°C o 250°C."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        19, sec_id,
        'En la terminología de resistencia al fuego del Código Técnico de la Edificación (DB-SI), ¿qué parámetro representa la letra \"R\" en un elemento constructivo?',
        '["La capacidad portante del elemento estructural para mantener la estabilidad mecánica.", "El aislamiento térmico que evita la transmisión del calor por conducción.", "La estanqueidad e integridad al paso de humo y gases calientes.", "La reacción de inflamabilidad superficial de los revestimientos interiores."]'::jsonb,
        0,
        'R = Capacidad portante (Résistance); E = Integridad frente a paso de llamas (Étanchéité); I = Aislamiento térmico (Isolation).',
        'R (Capacidad Portante): Aptitud del elemento estructural para conservar su estabilidad mecánica sin colapso bajo la acción térmica',
        'CTE DB-SI: R = Capacidad Portante',
        0, NOW(), 0
    );

    -- TEMA 20: Comportamiento al Fuego de Materiales Estructurales
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        20,
        'Comportamiento Térmico del Acero: Temperatura Crítica y Dilatación',
        '### COMPORTAMIENTO AL FUEGO DE MATERIALES: EL ACERO ESTRUCTURAL\n\n* **Excelente Conductor Térmico:** El acero presenta una elevadísima conductividad térmica pero nula masa protectora intrínseca.\n* **Temperatura Crítica del Acero:** Se sitúa entre **500 °C y 550 °C**. A esta temperatura, el límite elástico del acero se reduce en aproximadamente un 50%, perdiendo drásticamente su capacidad portante y provocando el pandeo o colapso repentino de vigas y pilares no protegidos.\n* **Dilatación Térmica:** El coeficiente de dilatación térmica lineal del acero es de aprox. $12 \\times 10^{-6} \\text{ K}^{-1}$. Una viga de 10 metros sometida a un gradiente de 600 °C puede expandirse longitudinalmente más de **7 centímetros**, ejerciendo empujes laterales devastadores capaces de derribar muros de carga perimetrales.',
        '[{"concepto": "Temperatura crítica de colapso del acero", "valor_exacto": "Entre 500 °C y 550 °C (pérdida del 50% de resistencia elástica)", "trampa_habitual": "Poner temperatura de fusión (1.400°C) en lugar de temperatura crítica de servicio."}, {"concepto": "Dilatación longitudinal de viga de 10 m a 600°C", "valor_exacto": "Aprox. 7 a 7,2 cm", "trampa_habitual": "Poner milímetros en lugar de centímetros."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        20, sec_id,
        '¿A qué temperatura se sitúa habitualmente la temperatura crítica del acero estructural en un incendio, momento en el que pierde aproximadamente el 50% de su límite elástico?',
        '["Entre 500 °C y 550 °C.", "A los 250 °C coincidiendo con la combustión inicial.", "A los 850 °C de temperatura de forjado al rojo vivo.", "A 1.450 °C en su punto de fusión estricta."]'::jsonb,
        0,
        'El acero no necesita fundirse para colapsar: entre 500 y 550 °C su resistencia cede a la mitad, produciéndose el colapso repentino de la estructura metálica.',
        'Temperatura Crítica del Acero: Se sitúa entre 500 °C y 550 °C. A esta temperatura, el límite elástico del acero se reduce en aproximadamente un 50%',
        'Acero: Temp. Crítica 500-550°C',
        0, NOW(), 0
    );

    -- TEMA 24: Instalaciones de Protección contra Incendios (RIPCI)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        24,
        'RIPCI: Bocas de Incendio Equipadas (BIEs de 25 mm y 45 mm)',
        '### REGLAMENTO DE INSTALACIONES DE PROTECCIÓN CONTRA INCENDIOS (RIPCI)\n\n* **BIE de 25 mm (Semirrígida):** Manguera semirrígida de 25 mm de diámetro con longitud máxima de **20 metros**. Debe suministrar un caudal mínimo de **100 l/min** a una presión dinámica en punta de lanza no inferior a **3,5 bar**.\n* **BIE de 45 mm (Plana):** Manguera plana de 45 mm de diámetro con longitud máxima de **20 metros**. Debe suministrar un caudal mínimo de **200 l/min** a una presión dinámica mínima de **3,5 bar**.\n* **Presión Máxima de Servicio:** En ambas no debe superarse una presión estática de **5 bar** en la boquilla para permitir el manejo seguro por una sola persona (si se superan 5 bar, es obligatorio instalar reductores de presión).',
        '[{"concepto": "Presión dinámica mínima en lanza para BIE de 25 y 45 mm", "valor_exacto": "3,5 bar", "trampa_habitual": "Poner 2 bar o 5 bar."}, {"concepto": "Longitud máxima reglamentaria de manguera de BIE", "valor_exacto": "20 metros", "trampa_habitual": "Poner 25 o 30 metros."}, {"concepto": "Caudal mínimo BIE 25 mm", "valor_exacto": "100 l/min", "trampa_habitual": "Poner 50 l/min."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        24, sec_id,
        'De acuerdo con el RIPCI (RD 513/2017), ¿cuál es la presión dinámica mínima que debe garantizarse en la boquilla de una BIE de 25 mm o 45 mm durante su funcionamiento?',
        '["3,5 bar.", "2,0 bar.", "5,0 bar.", "1,5 bar."]'::jsonb,
        0,
        'El RIPCI exige una presión dinámica mínima en punta de lanza de 3,5 bar (350 kPa) tanto en BIE de 25 como de 45 mm, y un máximo de 5 bar para maniobra sin reductor.',
        'presión dinámica en punta de lanza no inferior a 3,5 bar',
        'RIPCI: BIEs presión mín. 3,5 bar',
        0, NOW(), 0
    );

END $$;

-- 5. BLOQUE IV: GEOGRAFÍA, TERRITORIO Y MEDIO NATURAL CAM (Temas 27 al 31)
DO $$
DECLARE
    sec_id UUID;
BEGIN

    -- TEMA 28: Hidrografía de la Comunidad de Madrid y Red del Canal de Isabel II
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        28,
        'Red Fluvial de la CAM: Afluentes del Tajo y Mayor Embalse',
        '### HIDROGRAFÍA DE LA COMUNIDAD DE MADRID\n\nToda la red fluvial de la Comunidad de Madrid pertenece íntegramente a la **Cuenca Hidrográfica del Tajo** (vertiente atlántica), actuando el río Tajo como colector final en el límite sur de la región (términos de Aranjuez y Fuentidueña de Tajo).\n\n* **Principales Afluentes (de Este a Oeste):**\n  1. **Río Jarama:** El río más largo de la Comunidad y eje vertebral que recoge a su vez al Henares, Manzanares y Tajuña.\n  2. **Río Lozoya:** Nace en el Macizo de Peñalara y abastece la mayor parte del agua potable de Madrid a través del Canal de Isabel II.\n  3. **Río Guadarrama:** Nace en el Valle de la Fuenfría y atraviesa el oeste de la CAM.\n  4. **Río Alberche:** En el extremo suroeste (Pantano de San Juan y Picadas).\n* **Mayor Embalse de la CAM:** El **Embalse de El Atazar**, situado sobre el río Lozoya, con una capacidad de **425 hectómetros cúbicos (hm³)**, representando casi la mitad de toda la reserva de agua de la región.',
        '[{"concepto": "Embalse de mayor capacidad de la Comunidad de Madrid", "valor_exacto": "El Atazar con 425 hm³ (Río Lozoya)", "trampa_habitual": "Confundir con Pantano de San Juan (138 hm³) o Valmayor (124 hm³)."}, {"concepto": "Río vertebrador que recoge Manzanares, Henares y Tajuña", "valor_exacto": "Río Jarama", "trampa_habitual": "Decir río Tajo directo."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        28, sec_id,
        '¿Cuál es el embalse de mayor capacidad de almacenamiento de agua de la Comunidad de Madrid y sobre qué río se encuentra construido?',
        '["Embalse de El Atazar, sobre el río Lozoya (425 hm³).", "Embalse de San Juan, sobre el río Alberche (310 hm³).", "Embalse de Valmayor, sobre el río Guadarrama (250 hm³).", "Embalse de Santillana, sobre el río Manzanares (180 hm³)."]'::jsonb,
        0,
        'El Atazar (inaugurado en 1972) en el río Lozoya tiene 425 hm³ de capacidad y es con diferencia el mayor embalse de la red del Canal de Isabel II.',
        'El Atazar, situado sobre el río Lozoya, con una capacidad de 425 hectómetros cúbicos (hm³)',
        'Mayor Embalse CAM: El Atazar (425 hm³)',
        0, NOW(), 0
    );

    -- TEMA 29: Red de Comunicaciones y Carreteras CAM
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        29,
        'Red de Carreteras de la CAM: Clasificación Oficial y Anillos M-30 a M-50',
        '### RED DE CARRETERAS DE LA COMUNIDAD DE MADRID\n\n* **Red de Interés General del Estado (Radial):** A-1 (Burgos), A-2 (Zaragoza), A-3 (Valencia), A-4 (Córdoba/Sevilla), A-5 (Badajoz), A-6 (A Coruña).\n* **Anillos de Circunvalación:**\n  - **M-30:** Vía de circunvalación interior titularidad del Ayuntamiento de Madrid (Calle 30).\n  - **M-40:** Primer anillo exterior titularidad del Estado (Demarcación de Carreteras del Estado).\n  - **M-45:** Autovía de circunvalación titularidad de la **Comunidad de Madrid** (gestión en régimen de concesión peaje en sombra).\n  - **M-50:** Anillo exterior titularidad del Estado.\n* **Clasificación Red Autonómica CAM (Ley 3/1991 de Carreteras de Madrid):**\n  1. **Red Principal (color naranja):** Canaliza tráfico de largo recorrido.\n  2. **Red Secundaria (color verde):** Comunica cabeceras comarcales y poblaciones entre sí.\n  3. **Red Local (color amarillo):** Accesos a municipios y carreteras de montaña.',
        '[{"concepto": "Titularidad de la autovía de circunvalación M-45", "valor_exacto": "Comunidad de Madrid (Autonómica)", "trampa_habitual": "Decir Estado (como la M-40 y M-50) o Ayuntamiento de Madrid (como la M-30)."}, {"concepto": "Color distintivo de la Red Principal autonómica de la CAM", "valor_exacto": "Naranja", "trampa_habitual": "Poner Rojo o Azul."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        29, sec_id,
        'Entre las grandes vías de circunvalación de Madrid (M-30, M-40, M-45 y M-50), ¿cuál de ellas es de titularidad exclusiva de la Comunidad de Madrid?',
        '["La autovía M-45.", "La autovía M-40.", "La autovía M-50.", "La autopista M-30."]'::jsonb,
        0,
        'Pregunta trampa recurrente: M-30 es municipal (Madrid Calle 30); M-40 y M-50 son estatales (Ministerio de Transportes); la M-45 es 100% autonómica de la Comunidad de Madrid.',
        'M-45: Autovía de circunvalación titularidad de la Comunidad de Madrid',
        'M-45: Titularidad CAM',
        0, NOW(), 0
    );

END $$;

-- 6. BLOQUE V: EMERGENCIAS SANITARIAS Y PRIMEROS AUXILIOS (Temas 32 al 35)
DO $$
DECLARE
    sec_id UUID;
BEGIN

    -- TEMA 32: Soporte Vital Básico (SVB), RCP y Desfibrilación
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        32,
        'Guías ERC: Secuencia de RCP en Adultos y Uso del DESA',
        '### SOPORTE VITAL BÁSICO EN EL ADULTO (GUÍAS ERC)\n\n* **Comprobación de Víctima:** Seguridad del entorno, comprobar consciencia (hablar y estimular) y abrir vía aérea con maniobra frente-mentón comprobando respiración (Ver, Oír, Sentir) durante no más de **10 segundos**.\n* **Frecuencia y Profundidad de Compresiones:**\n  - Frecuencia: entre **100 y 120 compresiones por minuto**.\n  - Profundidad: entre **5 y 6 cm** en el adulto medio, permitiendo la descompresión torácica completa.\n* **Relación Compresiones/Ventilaciones:** Secuencia continua de **30 compresiones seguidas de 2 ventilaciones de rescate (30:2)**.\n* **Desfibrilador Externo Semiautomático (DESA):** En cuanto llegue el DESA, encenderlo y colocar los parches inmediatamente sin interrumpir la RCP salvo durante el análisis del ritmo y la descarga eléctrica.',
        '[{"concepto": "Relación universal de compresiones y ventilaciones en adulto", "valor_exacto": "30 compresiones : 2 ventilaciones (30:2)", "trampa_habitual": "Poner 15:2 (que corresponde a pediatría con dos reanimadores)."}, {"concepto": "Frecuencia de compresiones torácicas", "valor_exacto": "100 a 120 compresiones por minuto", "trampa_habitual": "Poner 80 a 100 cpm o más de 140 cpm."}, {"concepto": "Profundidad de las compresiones en adulto", "valor_exacto": "5 a 6 centímetros", "trampa_habitual": "Poner 3 a 4 cm o más de 7 cm."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        32, sec_id,
        'Según las recomendaciones vigentes del European Resuscitation Council (ERC) en Soporte Vital Básico, ¿cuál es la frecuencia y profundidad reglamentaria de las compresiones torácicas en un paciente adulto en parada cardiorrespiratoria?',
        '["Frecuencia de 100 a 120 cpm y profundidad de 5 a 6 cm.", "Frecuencia de 80 a 100 cpm y profundidad de 3 a 4 cm.", "Frecuencia de 120 a 140 cpm y profundidad mínima de 7 cm.", "Frecuencia de 90 a 100 cpm permitiendo expansión incompleta para mayor retorno venoso."]'::jsonb,
        0,
        'Directriz oficial del ERC: ritmo metronómico de 100-120 cpm, hundiendo el esternón entre 5 y 6 cm y permitiendo la reexpansión torácica total tras cada compresión.',
        'Frecuencia: entre 100 y 120 compresiones por minuto. Profundidad: entre 5 y 6 cm en el adulto medio',
        'SVB Adulto: 100-120 cpm y 5-6 cm',
        0, NOW(), 0
    );

    -- TEMA 34: Quemaduras e Intoxicación por Humos (Cianuro y CO)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        34,
        'Intoxicación por Humos de Incendio: Monóxido de Carbono (CO) y Cianuro de Hidrógeno (HCN)',
        '### TOXICOLOGÍA EN INCENDIOS: CO Y CIANURO\n\n* **Monóxido de Carbono (CO):** Gas incoloro, inodoro e insípido producto de combustiones incompletas. Tiene una afinidad por la hemoglobina unas **200 a 250 veces mayor que el oxígeno**, formando **Carboxihemoglobina (COHb)** e impidiendo el transporte celular de O2. Tratamiento prioritario: Oxigenoterapia normobárica al 100% con mascarilla de alta concentración con reservorio (o cámara hiperbárica en casos graves).\n* **Cianuro de Hidrógeno (HCN):** Desprendido en la pirólisis de materiales sintéticos (plásticos, poliuretanos, resinas, lanas sintéticas). Bloquea la cadena respiratoria celular mitocondrial uniéndose al citocromo c oxidasa e impidiendo la respiración aerobia celular. Antídoto de elección en servicios de emergencia: **Hidroxocobalamina (Cyanokit)**, que se combina con el cianuro para formar vitamina B12 (cianocobalamina), eliminada de forma inocua por orina.',
        '[{"concepto": "Afinidad del Monóxido de Carbono vs Oxígeno por la Hemoglobina", "valor_exacto": "200 a 250 veces mayor afinidad", "trampa_habitual": "Poner 50 veces o 1.000 veces."}, {"concepto": "Antídoto de elección para intoxicación por cianuro en humos de incendio", "valor_exacto": "Hidroxocobalamina (Cyanokit)", "trampa_habitual": "Decir Naloxona o Atropina."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        34, sec_id,
        'En la atención de víctimas rescatadas con intoxicación severa por humos de incendio con sospecha de inhalación de cianuro de hidrógeno (HCN), ¿cuál es el antídoto específico de elección utilizado en los servicios de emergencias médicas?',
        '["Hidroxocobalamina (Cyanokit).", "Naloxona intravenosa.", "Flumazenilo en bolo rápido.", "Atropina sulfato."]'::jsonb,
        0,
        'La Hidroxocobalamina (Cyanokit) es el antídoto neutralizante de primera línea frente al cianuro presente en los humos de combustión de plásticos y espumas de poliuretano.',
        'Antídoto de elección en servicios de emergencia: Hidroxocobalamina (Cyanokit)',
        'Cianuro: Antídoto Hidroxocobalamina',
        0, NOW(), 0
    );

    -- TEMA 35: Triage en Incidentes con Múltiples Víctimas (Método START)
    INSERT INTO secciones_temario (tema_id, epigrafe, contenido_markdown, datos_criticos)
    VALUES (
        35,
        'Triage START: Categorías de Prioridad (Rojo, Amarillo, Verde, Negro)',
        '### MÉTODO DE TRIAGE SIMPLE Y RÁPIDO: START (SIMPLE TRIAGE AND RAPID TREATMENT)\n\nEl método START evalúa en menos de 60 segundos a las víctimas basándose en 4 parámetros secuenciales:\n1. **¿Puede caminar?** Si la víctima camina por su propio pie, se clasifica automáticamente como **VERDE (Prioridad 3 - Leve)**.\n2. **Respiración:** Si no respira, se abre vía aérea (frente-mentón). Si sigue sin respirar = **NEGRO (Fallecido)**. Si respira a más de **30 respiraciones/minuto** = **ROJO (Prioridad 1 - Inmediata)**. Si respira a menos de 30 rpm, se pasa al siguiente punto.\n3. **Perfusión:** Relleno capilar mayor a **2 segundos** (o pulso radial ausente) = **ROJO (Prioridad 1)**. Si es menor a 2 segundos, se pasa al siguiente punto.\n4. **Estado Mental (Consciencia):** Si no obedece órdenes sencillas = **ROJO (Prioridad 1)**. Si obedece órdenes sencillas = **AMARILLO (Prioridad 2 - Diferible)**.',
        '[{"concepto": "Primer filtro del algoritmo START", "valor_exacto": "¿Puede caminar? (Si camina = Verde)", "trampa_habitual": "Decir comprobar pulso radial o vía aérea."}, {"concepto": "Frecuencia respiratoria límite para clasificar Rojo en START", "valor_exacto": "Más de 30 respiraciones por minuto", "trampa_habitual": "Poner más de 20 o más de 40 rpm."}, {"concepto": "Tiempo máximo de llenado capilar normal en START", "valor_exacto": "Menor o igual a 2 segundos", "trampa_habitual": "Poner 5 segundos."}]'::jsonb
    ) RETURNING id INTO sec_id;

    INSERT INTO preguntas (tema_id, seccion_id, enunciado, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, dato_clave_etiqueta, caja_leitner, proxima_revision, fallos_totales)
    VALUES (
        35, sec_id,
        'En el algoritmo de triage extrahospitalario START, una víctima que no puede caminar, respira a 22 respiraciones por minuto, tiene un relleno capilar inferior a 2 segundos pero no obedece órdenes sencillas, ¿con qué color y prioridad debe ser clasificada?',
        '["ROJO (Prioridad 1 - Inmediata).", "AMARILLO (Prioridad 2 - Diferible).", "VERDE (Prioridad 3 - Leve).", "NEGRO (Expectante/Sin prioridad)."]'::jsonb,
        0,
        'En START, al fallar el cuarto escalón (estado mental / no obedece órdenes), la víctima se clasifica de inmediato como ROJO (Prioridad 1 - Inmediata).',
        'Estado Mental (Consciencia): Si no obedece órdenes sencillas = ROJO (Prioridad 1)',
        'Triage START: No obedece = Rojo',
        0, NOW(), 0
    );

END $$;
