import { Tema, SeccionTemario, Pregunta } from './types';

export const TEMAS_CAM: Tema[] = [
  { id: 1, titulo: 'La Función Pública', bloque: 'Legislación y Organización' },
  { id: 2, titulo: 'Igualdad de Oportunidades y No Discriminación', bloque: 'Legislación y Organización' },
  { id: 3, titulo: 'Prevención de Riesgos Laborales (PRL) y EPI', bloque: 'Legislación y Organización' },
  { id: 4, titulo: 'Decreto Legislativo 1/2006 (Cuerpo de Bomberos CAM)', bloque: 'Legislación y Organización' },
  { id: 5, titulo: 'Sistema Nacional de Protección Civil (SNPC)', bloque: 'Legislación y Organización' },
  { id: 6, titulo: 'Plan Territorial de Protección Civil (PLATERCAM)', bloque: 'Legislación y Organización' },
  { id: 7, titulo: 'Código Técnico de la Edificación (CTE DB SI)', bloque: 'Construcción y Normativa' },
  { id: 8, titulo: 'Territorio y Red de Infraestructuras de la CM', bloque: 'Geografía y Territorio CAM' },
  { id: 9, titulo: 'Organización del Cuerpo de Bomberos de la CM (CBCM)', bloque: 'Legislación y Organización' },
  { id: 10, titulo: 'Mecánica Básica de Vehículos de Bomberos', bloque: 'Técnicas y Conducción' },
  { id: 11, titulo: 'Comunicaciones en Emergencias (TETRA)', bloque: 'Técnicas y Conducción' },
  { id: 12, titulo: 'Soporte Vital Básico I (SVB I)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 13, titulo: 'Soporte Vital Básico II (SVB II)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 14, titulo: 'Psicología para Intervinientes en Emergencias', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 15, titulo: 'Hidráulica de Bomberos y Mecánica de Fluidos', bloque: 'Teoría del Fuego e Hidráulica' },
  { id: 16, titulo: 'Naturaleza del Fuego, Métodos y Agentes Extintores', bloque: 'Teoría del Fuego e Hidráulica' },
  { id: 17, titulo: 'Incendios en la Edificación I', bloque: 'Técnicas de Intervención' },
  { id: 18, titulo: 'Incendios en la Edificación II', bloque: 'Técnicas de Intervención' },
  { id: 19, titulo: 'Incendios de Vegetación I (Combustibles y Comportamiento)', bloque: 'Técnicas de Intervención' },
  { id: 20, titulo: 'Incendios de Vegetación II (Tácticas y Medios INFOMA)', bloque: 'Técnicas de Intervención' },
  { id: 21, titulo: 'Riesgo Químico y Biológico I (RBQ I - ADR)', bloque: 'Técnicas y Materias Peligrosas' },
  { id: 22, titulo: 'Riesgo Químico y Biológico II (RBQ II - Descontaminación)', bloque: 'Técnicas y Materias Peligrosas' },
  { id: 23, titulo: 'Construcción I (Materiales y Estructuras)', bloque: 'Construcción y Normativa' },
  { id: 24, titulo: 'Construcción II (Patologías y Apuntalamientos)', bloque: 'Construcción y Normativa' },
  { id: 25, titulo: 'Rescate en Accidentes de Tráfico I (RAT I)', bloque: 'Rescate y Salvamento' },
  { id: 26, titulo: 'Rescate en Accidentes de Tráfico II (RAT II - Descarcelación)', bloque: 'Rescate y Salvamento' },
  { id: 27, titulo: 'Apeos y Apuntalamientos en Estructuras Colapsadas', bloque: 'Construcción y Normativa' },
  { id: 28, titulo: 'Riesgo Eléctrico y Distancias de Seguridad', bloque: 'Instalaciones y Seguridad' },
  { id: 29, titulo: 'Suministros de Gas (GLP y Gas Natural)', bloque: 'Instalaciones y Seguridad' },
  { id: 30, titulo: 'Intervenciones con Abejas y Avispas (Himenópteros)', bloque: 'Técnicas Especiales' },
  { id: 31, titulo: 'Ascensores y Aperturas Forzosas', bloque: 'Técnicas Especiales' },
  { id: 32, titulo: 'Apeos y Tala de Arbolado en Emergencias', bloque: 'Técnicas Especiales' },
  { id: 33, titulo: 'Actuación en Conductas Autolíticas (Prevención del Suicidio)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 34, titulo: 'Rescate Acuático y en Inundaciones', bloque: 'Rescate y Salvamento' },
  { id: 35, titulo: 'Conducción Segura en Emergencias', bloque: 'Técnicas y Conducción' }
];

export const MOCK_SECCIONES: SeccionTemario[] = [
  {
    id: 'sec-1-1',
    tema_id: 1,
    epigrafe: 'Art. 14 al 29 - Sección 1ª: Derechos Fundamentales y Libertades Públicas',
    contenido_markdown: `### TÍTULO I: DE LOS DERECHOS Y DEBERES FUNDAMENTALES
**Capítulo Segundo: Derechos y libertades**
**Sección 1ª: De los derechos fundamentales y de las libertades públicas (Artículos 15 a 29)**

* **Artículo 15:** Todos tienen derecho a la vida y a la integridad física y moral, sin que, en ningún caso, puedan ser sometidos a tortura ni a penas o tratos inhumanos o degradantes. Queda abolida la pena de muerte, salvo lo que puedan disponer las leyes penales militares para tiempos de guerra.
* **Artículo 17:** Toda persona tiene derecho a la libertad y a la seguridad. Nadie puede ser privado de su libertad, sino con la observancia de lo establecido en este artículo y en los casos y en la forma previstos en la ley. La detención preventiva no podrá durar más del tiempo estrictamente necesario para la realización de las averiguaciones tendentes al esclarecimiento de los hechos, y, en todo caso, en el plazo máximo de setenta y dos horas, el detenido deberá ser puesto en libertad o a disposición de la autoridad judicial.
* **Artículo 18.2:** El domicilio es inviolable. Ninguna entrada o registro podrá hacerse en él sin consentimiento del titular o resolución judicial, salvo en caso de flagrante delito.
* **Artículo 168 (Reforma agravada):** Cuando se propusiere la revisión total de la Constitución o una parcial que afecte al Título preliminar, al Capítulo segundo, Sección primera del Título I, o al Título II, se procederá a la aprobación del principio por mayoría de dos tercios de cada Cámara, y a la disolución inmediata de las Cortes.`,
    datos_criticos: [
      {
        concepto: 'Plazo máximo detención preventiva ordinaria',
        valor_exacto: '72 horas',
        trampa_habitual: 'Confundir con 48 horas o 24 horas del plazo de habeas corpus.',
      },
      {
        concepto: 'Garantía del domicilio (Art. 18.2)',
        valor_exacto: 'Consentimiento del titular, resolución judicial o flagrante delito',
        trampa_habitual: 'Añadir estado de alarma como causa ordinaria sin mediar decreto de suspensión individual.',
      },
      {
        concepto: 'Mayoría requerida para reforma agravada (Art. 168)',
        valor_exacto: 'Mayoría de dos tercios de cada Cámara + disolución de Cortes',
        trampa_habitual: 'Poner mayoría de tres quintos (que corresponde al Art. 167 ordinario).',
      },
    ],
  },
  {
    id: 'sec-11-1',
    tema_id: 11,
    epigrafe: 'Física del Fuego: Triángulo, Tetraedro y Mecanismos de Extinción',
    contenido_markdown: `### TEORÍA DEL FUEGO Y DE LA COMBUSTIÓN
La combustión es una reacción físico-química de oxidación-reducción fuertemente exotérmica, en la que intervienen cuatro factores interdependientes que configuran el **Tetraedro del Fuego**:
1. **Combustible (Agente Reductor):** Materia capaz de oxidarse.
2. **Comburente (Agente Oxidante):** Generalmente el oxígeno atmosférico (concentración normal 21%). Por debajo del 14-15% la mayoría de fuegos con llama cesan.
3. **Energía de Activación (Calor):** Temperatura necesaria para alcanzar el punto de inflamación (*flash point*) o autoignición.
4. **Reacción en Cadena:** Propagación de radicales libres activos (H·, OH·, O·) en la fase gaseosa.

#### Mecanismos Tácticos de Extinción:
* **Enfriamiento:** Actúa sobre el calor eliminando energía térmica por debajo de la temperatura de ignición. El agua tiene un calor específico de 1 cal/g·°C y un altísimo calor latente de vaporización de 539 cal/g a 100°C.
* **Sofocación:** Actúa sobre el comburente reduciendo la concentración de O2 por debajo del límite crítico de combustión mediante inertización con CO2 o aislamiento físico con mantas ignífugas/espuma.
* **Desalimentación (Dilución/Segregación):** Retirada o corte del aporte del combustible (ej. cierre de válvula de paso de gas combustible).
* **Inhibición Química (Catálisis Negativa):** Desactivación de los radicales libres en la zona de llama mediante la interposición de polvos químicos secos o halones/agentes limpios.`,
    datos_criticos: [
      {
        concepto: 'Calor latente de vaporización del agua a 100°C',
        valor_exacto: '539 cal/g (o aprox. 2.260 kJ/kg)',
        trampa_habitual: 'Confundir con calor específico (1 cal/g·°C) o poner cifras redondas como 500 cal/g.',
      },
      {
        concepto: 'Mecanismo principal del Polvo Polivalente ABC',
        valor_exacto: 'Inhibición química (fase llama) y Sofocación/Aislamiento (fase brasa por ácido metafosfórico)',
        trampa_habitual: 'Afirmar que solo actúa por enfriamiento.',
      },
      {
        concepto: 'Límite de O2 para cese de llama abierta',
        valor_exacto: 'Por debajo del 14% - 15% de O2',
        trampa_habitual: 'Poner 10% (que es el límite para fuegos incandescentes/brasas profundas).',
      },
    ],
  },
  {
    id: 'sec-13-1',
    tema_id: 13,
    epigrafe: 'UNE-EN 2: Clasificación Normalizada de Fuegos y Agentes Extintores',
    contenido_markdown: `### NORMA UNE-EN 2: CLASIFICACIÓN DE LAS CLASES DE FUEGO
La norma europea UNE-EN 2 establece la clasificación oficial de los fuegos según la naturaleza del combustible:

* **Clase A:** Fuegos de combustibles sólidos, generalmente de naturaleza orgánica, cuya combustión se realiza normalmente con formación de brasas (madera, papel, carbón, tejidos). Agente idóneo: Agua a chorro o pulverizada.
* **Clase B:** Fuegos de combustibles líquidos o de sólidos licuables (gasolinas, aceites, disolventes, parafinas). Agente idóneo: Espuma física, polvo seco BC/ABC, CO2.
* **Clase C:** Fuegos de gases inflamables (metano, propano, butano, acetileno, gas natural). El primer paso táctico OBLIGATORIO es el corte de suministro de gas antes de extinguir la llama para evitar nube explosiva (UVCE).
* **Clase D:** Fuegos de metales combustibles (magnesio, sodio, potasio, titanio, circonio). ¡PROHIBIDO EL AGUA! El agua reacciona violentamente liberando hidrógeno (H2) altamente explosivo. Se emplean polvos específicos para metales (polvo D).
* **Clase F:** Fuegos derivados de la utilización de ingredientes para cocinar (aceites y grasas vegetales o animales) en aparatos de cocina. Incorporada por la norma UNE-EN 2/A1:2005. Agente idóneo: Acetato potásico por saponificación.
* **NOTA CRÍTICA:** No existe la "Clase E" en la norma UNE-EN 2. El riesgo eléctrico se considera un riesgo adicional de presencia de tensión, no una clase de fuego.`,
    datos_criticos: [
      {
        concepto: 'Existencia de Clase E en UNE-EN 2',
        valor_exacto: 'NO EXISTE Clase E en la normativa europea UNE-EN 2',
        trampa_habitual: 'Preguntar si la clase E corresponde a fuegos de origen eléctrico (norma americana NFPA sí la tiene, UNE-EN 2 NO).',
      },
      {
        concepto: 'Agente extintor específico para Clase F',
        valor_exacto: 'Acetato potásico o soluciones acuosas salinas (Saponificación)',
        trampa_habitual: 'Decir agua pulverizada (peligro extremo de boilover) o CO2 a alta presión.',
      },
      {
        concepto: 'Reacción del agua en fuegos Clase D (sodio/potasio)',
        valor_exacto: 'Reacción exotérmica violenta con desprendimiento de Hidrógeno gas (H2)',
        trampa_habitual: 'Afirmar que desprende monóxido de carbono o que apaga por sofocación.',
      },
    ],
  },
  {
    id: 'sec-14-1',
    tema_id: 14,
    epigrafe: 'Hidráulica de Bomberos: Presión, Caudales y Pérdida de Carga',
    contenido_markdown: `### HIDRÁULICA APLICADA A SERVICIOS DE EXTINCIÓN
**Principios Fundamentales:**
1. **Presión Hidrostática:** $P = \\rho \\cdot g \\cdot h$. Cada 10 metros de columna de agua (m.c.a.) equivalen exactamente a 1 bar (aprox. 0,981 bar = 100 kPa).
2. **Caudal ($Q$):** Volumen de fluido que circula por unidad de tiempo. $Q = S \\cdot v$ (Superficie por velocidad).
3. **Pérdida de Carga ($J$ o $\\Delta P$):** Es la energía perdida por rozamiento del agua contra las paredes internas de la manguera y rozamiento interno entre las láminas del fluido.

#### Leyes de la Pérdida de Carga en Mangueras:
* La pérdida de carga es **directamente proporcional a la longitud** de la manguera ($L$). A doble longitud, doble pérdida de carga.
* La pérdida de carga es **directamente proporcional al cuadrado del caudal** ($Q^2$). Si duplicamos el caudal de una lanza de 150 l/min a 300 l/min, la pérdida de carga se multiplica por 4.
* La pérdida de carga es **inversamente proporcional a la quinta potencia del diámetro interior** ($D^5$). Por eso una manguera de 45 mm tiene enormemente menos pérdida de carga que una de 25 mm a igualdad de caudal.
* La pérdida de carga es **independiente de la presión** de trabajo del fluido.`,
    datos_criticos: [
      {
        concepto: 'Relación pérdida de carga vs caudal',
        valor_exacto: 'Proporcional al CUADRADO del caudal (Q²)',
        trampa_habitual: 'Decir que es directamente proporcional al caudal (lineal). Si duplicas Q, la pérdida se cuadruplica.',
      },
      {
        concepto: 'Relación pérdida de carga vs diámetro interior',
        valor_exacto: 'Inversamente proporcional a la 5ª potencia del diámetro (1/D⁵)',
        trampa_habitual: 'Poner al cuadrado (1/D²) o al cubo (1/D³).',
      },
      {
        concepto: 'Equivalencia de presión por cota de altura',
        valor_exacto: '1 bar por cada 10 metros de desnivel (columna de agua)',
        trampa_habitual: 'Olvidar restar o sumar 1 bar al calcular presión en bomba si la lanza está en una 3ª planta (+10m = 1 bar de pérdida hidrostática).',
      },
    ],
  },
  {
    id: 'sec-27-1',
    tema_id: 27,
    epigrafe: 'Geografía Física CAM: Orografía, Vértices Cimeros y Puertos de Montaña',
    contenido_markdown: `### OROGRAFÍA Y RELIEVE DE LA COMUNIDAD DE MADRID
El territorio de la Comunidad de Madrid se estructura en dos grandes unidades morfoestructurales: la Sierra de Guadarrama (Sistema Central) al norte y noroeste, y la Fosa del Tajo (Rampa y Campiña/Vegas) al sur y sureste.

#### Principales Cumbres y Altitudes Oficiales:
* **Peñalara:** 2.428 metros (Punto más alto de la Comunidad de Madrid, Macizo de Peñalara).
* **Cabezas de Hierro:** 2.383 metros (Mayor altitud de la Cuerda Larga).
* **Dos Hermanas:** 2.284 metros.
* **Maliciosa:** 2.227 metros.
* **Siete Picos:** 2.138 metros (Pico Mayor o Séptimo Pico).
* **Punto más bajo de la CAM:** Confluencia del río Alberche con el río Tajo / término de Villa del Prado (río Alberche a 430 metros sobre el nivel del mar).

#### Pasos y Puertos de Montaña Estratégicos:
* **Puerto de Navacerrada:** 1.860 m (Carretera M-601).
* **Puerto de Cotos:** 1.830 m (Carretera M-604).
* **Puerto de la Morcuera:** 1.796 m (Carretera M-611).
* **Puerto de Canencia:** 1.524 m (Carretera M-629).
* **Puerto de Somosierra:** 1.440 m (Autovía A-1, paso natural estratégico de la Meseta Norte).
* **Puerto de los Leones (Guadarrama):** 1.511 m (Carretera N-VI).`,
    datos_criticos: [
      {
        concepto: 'Punto de mayor altitud de la CAM',
        valor_exacto: 'Peñalara con 2.428 metros de altitud',
        trampa_habitual: 'Confundir con Cabezas de Hierro (2.383 m, que es el más alto de Cuerda Larga, pero no de la CAM).',
      },
      {
        concepto: 'Punto más bajo de la CAM',
        valor_exacto: 'Villa del Prado (salida del río Alberche a 430 m)',
        trampa_habitual: 'Decir Aranjuez (río Tajo, 489 m).',
      },
      {
        concepto: 'Altitud oficial del Puerto de Navacerrada',
        valor_exacto: '1.860 metros',
        trampa_habitual: 'Poner 1.830 m (que corresponde al Puerto de Cotos).',
      },
    ],
  },
  {
    id: 'sec-31-1',
    tema_id: 31,
    epigrafe: 'Plan INFOMA: Épocas de Peligro, Índices de Gravedad y Mando Operativo',
    contenido_markdown: `### PLAN ESPECIAL DE PROTECCIÓN CIVIL CONTRA INCENDIOS FORESTALES DE LA CAM (INFOMA)
El Plan INFOMA establece el marco organizativo y los procedimientos de actuación ante emergencias por incendios forestales en el ámbito territorial de la Comunidad de Madrid.

#### Épocas de Peligro:
1. **Época de Peligro Alto:** Comprende con carácter general del **15 de junio al 30 de septiembre**. Todos los retenes, helicópteros bombardeo (bombarderos y de coordinación) y medios pesados se encuentran en activación máxima.
2. **Época de Peligro Medio:** Habitualmente del **16 de mayo al 14 de junio** y del **1 de octubre al 31 de octubre**.
3. **Época de Peligro Bajo:** Del **1 de noviembre al 15 de mayo**.

#### Situaciones Operativas (Directriz Básica / INFOMA):
* **Situación 0:** Emergencia provocada por uno o varios incendios que pueden ser controlados con los medios del Plan y que no suponen peligro para personas no relacionadas con la extinción ni para bienes no forestales.
* **Situación 1:** Incendios que pueden afectar gravemente a bienes forestales o levemente a la población y bienes de naturaleza no forestal, requiriendo medidas de protección civil menores.
* **Situación 2:** Incendios que amenazan gravemente a núcleos de población o infraestructuras críticas, o el daño forestal es muy extenso; pueden requerir la incorporación de medios extraordinarios del Estado (UME).
* **Situación 3:** Declaración de interés nacional por el Ministerio del Interior.`,
    datos_criticos: [
      {
        concepto: 'Fechas oficiales Época de Peligro Alto INFOMA',
        valor_exacto: 'Del 15 de junio al 30 de septiembre',
        trampa_habitual: 'Decir del 1 de junio al 30 de septiembre o del 15 de junio al 15 de octubre.',
      },
      {
        concepto: 'Situación operativa en la que interviene la UME',
        valor_exacto: 'Situación 2 (medios extraordinarios estatales a petición de la CAM)',
        trampa_habitual: 'Pensar que la UME solo entra en Situación 3 de interés nacional.',
      },
      {
        concepto: 'Director del Plan INFOMA en Situación 1 y 2',
        valor_exacto: 'Consejero competente en materia de Protección Civil / Emergencias de la CAM',
        trampa_habitual: 'Decir Delegado del Gobierno (solo en Situación 3) o el Oficial de Guardia de Bomberos.',
      },
    ],
  },
];

export const MOCK_PREGUNTAS: Pregunta[] = [
  {
    id: 'preg-1-1',
    tema_id: 1,
    seccion_id: 'sec-1-1',
    enunciado: 'Según el artículo 17 de la Constitución Española de 1978, ¿cuál es el plazo máximo absoluto en el que un detenido debe ser puesto en libertad o a disposición judicial en detención ordinaria?',
    opciones: [
      'En el plazo estrictamente necesario, con un límite máximo improrrogable de 72 horas.',
      'En el plazo máximo de 48 horas, prorrogables por otras 24 horas por el Juez de Instrucción.',
      'En el plazo improrrogable de 24 horas, debiendo incoarse de oficio el procedimiento de habeas corpus.',
      'En el plazo de 72 horas naturales, ampliable a 5 días adicionales en cualquier delito común.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'El Art. 17.2 CE es tajante: la detención no podrá durar más del tiempo estrictamente necesario y, "en todo caso, en el plazo máximo de setenta y dos horas, el detenido deberá ser puesto en libertad o a disposición de la autoridad judicial". Las 48 horas no existen en la CE y la prórroga de hasta 48 horas más solo cabe para bandas armadas/terrorismo (Art. 520 bis LECrim), no en régimen general.',
    cita_exacta: 'y, en todo caso, en el plazo máximo de setenta y dos horas, el detenido deberá ser puesto en libertad o a disposición de la autoridad judicial.',
    dato_clave_etiqueta: 'Art. 17.2 CE: 72 horas',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T10:00:00.000Z', // Vencida (en llamas)
    fallos_totales: 2,
    aciertos_consecutivos: 0,
    ultima_vez_vista: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'preg-1-2',
    tema_id: 1,
    seccion_id: 'sec-1-1',
    enunciado: '¿Qué mayoría y procedimiento exige el artículo 168 de la Constitución Española para la revisión parcial que afecte a la Sección 1ª del Capítulo II del Título I?',
    opciones: [
      'Aprobación del principio por mayoría de dos tercios de cada Cámara y disolución inmediata de las Cortes Generales.',
      'Aprobación por mayoría de tres quintos de cada Cámara sin necesidad de disolver las Cortes Generales.',
      'Aprobación por mayoría absoluta del Congreso de los Diputados y ratificación por dos tercios del Senado.',
      'Aprobación por dos tercios del Congreso y ratificación obligatoria en referéndum sin disolución de Cortes.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'La reforma agravada (Art. 168 CE) afecta al Título Preliminar, Sección 1ª Cap. II Tít. I (Arts. 15-29) o Título II (Corona). Exige 2/3 de cada Cámara, disolución inmediata de Cortes, ratificación por las nuevas Cámaras elegidas (2/3) y referéndum obligatorio. La mayoría de 3/5 es para el procedimiento ordinario del Art. 167.',
    cita_exacta: 'se procederá a la aprobación del principio por mayoría de dos tercios de cada Cámara, y a la disolución inmediata de las Cortes.',
    dato_clave_etiqueta: 'Art. 168 CE: 2/3 + disolución Cortes',
    caja_leitner: 1,
    proxima_revision: '2026-10-16T11:00:00.000Z', // Vencida
    fallos_totales: 1,
    aciertos_consecutivos: 1,
    ultima_vez_vista: '2026-10-15T11:00:00.000Z',
  },
  {
    id: 'preg-11-1',
    tema_id: 11,
    seccion_id: 'sec-11-1',
    enunciado: 'A 100 °C y a nivel del mar, ¿cuál es el calor latente de vaporización del agua utilizado en las maniobras de extinción por enfriamiento?',
    opciones: [
      'Aproximadamente 539 cal/g (unos 2.260 kJ/kg).',
      'Exactamente 1 cal/g·°C.',
      'Aproximadamente 80 cal/g (unos 334 kJ/kg).',
      'Aproximadamente 1.000 cal/g (unos 4.184 kJ/kg).',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'Trampa clásica de tribunal de bombero: 1 cal/g·°C es el calor específico (energía para subir 1°C el agua líquida). 80 cal/g es el calor latente de fusión (hielo a agua). El calor latente de vaporización del agua líquida a vapor a 100°C es de 539 cal/g (aprox. 2.260 kJ/kg), lo que convierte al agua en el mejor agente refrigerante por absorción masiva de energía.',
    cita_exacta: 'un altísimo calor latente de vaporización de 539 cal/g a 100°C.',
    dato_clave_etiqueta: 'Agua: 539 cal/g a 100°C',
    caja_leitner: 2,
    proxima_revision: '2026-10-16T12:00:00.000Z', // Vencida
    fallos_totales: 0,
    aciertos_consecutivos: 2,
    ultima_vez_vista: '2026-10-14T10:00:00.000Z',
  },
  {
    id: 'preg-13-1',
    tema_id: 13,
    seccion_id: 'sec-13-1',
    enunciado: 'De acuerdo con la norma europea UNE-EN 2, ¿a qué categoría corresponde un fuego en el que existe presencia de riesgo eléctrico?',
    opciones: [
      'No existe la Clase E en la norma UNE-EN 2; el riesgo eléctrico es un peligro adicional y no una clase de fuego.',
      'A la Clase E, definida como fuegos en instalaciones o equipos bajo tensión eléctrica superior a 1.000 V.',
      'A la Clase C de fuegos energizados, según la enmienda UNE-EN 2/A1.',
      'A la Clase D especial de componentes semiconductores y conductores metálicos.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: '¡Cazatrampas número 1 de oposiciones! En la normativa europea UNE-EN 2 SOLO existen las clases A, B, C, D y F. La clase E existió hace décadas en normas antiguas y se mantiene en la NFPA estadounidense, pero la norma europea suprimió deliberadamente la clase E porque la electricidad no arde por sí misma, sino que es una fuente de ignición o un riesgo suplementario.',
    cita_exacta: 'No existe la "Clase E" en la norma UNE-EN 2. El riesgo eléctrico se considera un riesgo adicional de presencia de tensión, no una clase de fuego.',
    dato_clave_etiqueta: 'UNE-EN 2: NO existe Clase E',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T13:00:00.000Z', // Vencida
    fallos_totales: 3,
    aciertos_consecutivos: 0,
    ultima_vez_vista: '2026-10-16T08:00:00.000Z',
  },
  {
    id: 'preg-13-2',
    tema_id: 13,
    seccion_id: 'sec-13-1',
    enunciado: '¿Por qué está estrictamente contraindicado el uso de agua sobre fuegos de metales reactivos como el sodio o el potasio (Clase D)?',
    opciones: [
      'Porque reaccionan exotérmicamente de forma violenta liberando gas Hidrógeno (H2), sumamente explosivo.',
      'Porque el agua actúa como catalizador positivo provocando la emisión de fosgeno y cianuro.',
      'Porque los metales alcalinos absorben el oxígeno del agua transformándola en monóxido de carbono.',
      'Porque el choque térmico vitrifica la escoria metálica impidiendo la sofocación con arena seca.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'Los metales alcalinos y alcalinotérreos (Clase D) tienen una afinidad extrema por el oxígeno del agua, descomponiéndola en hidróxidos y liberando gas Hidrógeno (H2), el cual arde de forma explosiva al contacto con la temperatura del propio metal. Deben extinguirse con polvos específicos Clase D.',
    cita_exacta: 'El agua reacciona violentamente liberando hidrógeno (H2) altamente explosivo.',
    dato_clave_etiqueta: 'Clase D + Agua = Desprendimiento H2 explosivo',
    caja_leitner: 3,
    proxima_revision: '2026-10-22T10:00:00.000Z', // No vencida
    fallos_totales: 0,
    aciertos_consecutivos: 3,
    ultima_vez_vista: '2026-10-13T10:00:00.000Z',
  },
  {
    id: 'preg-14-1',
    tema_id: 14,
    seccion_id: 'sec-14-1',
    enunciado: 'En una instalación de extinción con mangueras, si duplicamos el caudal (Q) que suministra una lanza manteniendo idéntico el diámetro y la longitud, ¿qué sucede con la pérdida de carga por rozamiento?',
    opciones: [
      'Se multiplica por 4, ya que la pérdida de carga es directamente proporcional al cuadrado del caudal (Q²).',
      'Se duplica exactamente, ya que la pérdida de carga es directamente proporcional al caudal (relación lineal).',
      'Se multiplica por 16, al ser inversamente proporcional a la cuarta potencia de la velocidad.',
      'Permanece constante, pues la pérdida de carga solo depende del diámetro y la rugosidad del material.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'Ley fundamental de la hidráulica de fluidos: la pérdida de carga (J) es directamente proporcional al CUADRADO del caudal (Q²). Si Q se multiplica por 2, J se multiplica por 2² = 4. Si el caudal se triplica, la pérdida de carga se multiplica por 9.',
    cita_exacta: 'La pérdida de carga es directamente proporcional al cuadrado del caudal ($Q^2$).',
    dato_clave_etiqueta: 'Pérdida de Carga ∝ Q²',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T14:00:00.000Z',
    fallos_totales: 1,
    aciertos_consecutivos: 0,
    ultima_vez_vista: '2026-10-16T09:00:00.000Z',
  },
  {
    id: 'preg-14-2',
    tema_id: 14,
    seccion_id: 'sec-14-1',
    enunciado: '¿Cómo varía la pérdida de carga en una manguera en función del diámetro interior (D) de la misma, según la fórmula general de Darcy-Weisbach?',
    opciones: [
      'Es inversamente proporcional a la quinta potencia del diámetro interior (1/D⁵).',
      'Es inversamente proporcional al cuadrado del diámetro interior (1/D²).',
      'Es directamente proporcional a la raíz cuadrada del diámetro interior (√D).',
      'Es inversamente proporcional al cubo del diámetro interior (1/D³).',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'La pérdida de carga varía con 1/D⁵. Esto explica por qué tender manguera de 45 mm en lugar de 25 mm reduce drásticamente las presiones de salida necesarias en bomba para suministrar el mismo caudal a punta de lanza.',
    cita_exacta: 'La pérdida de carga es inversamente proporcional a la quinta potencia del diámetro interior ($D^5$).',
    dato_clave_etiqueta: 'Pérdida Carga ∝ 1/D⁵',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T15:00:00.000Z',
    fallos_totales: 0,
    aciertos_consecutivos: 0,
    ultima_vez_vista: null, // Pregunta NUEVA
  },
  {
    id: 'preg-27-1',
    tema_id: 27,
    seccion_id: 'sec-27-1',
    enunciado: '¿Cuál es la altitud oficial y el punto de mayor cota orográfica de la Comunidad de Madrid?',
    opciones: [
      'Pico Peñalara, con 2.428 metros de altitud.',
      'Cabezas de Hierro, con 2.383 metros de altitud.',
      'Risco de los Claveles, con 2.388 metros de altitud.',
      'La Maliciosa, con 2.227 metros de altitud.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'Peñalara es el techo de la Comunidad de Madrid con 2.428 metros. Cabezas de Hierro (2.383 m) es la máxima altitud de la alineación de Cuerda Larga, pero no el punto más alto de la Comunidad.',
    cita_exacta: 'Peñalara: 2.428 metros (Punto más alto de la Comunidad de Madrid, Macizo de Peñalara).',
    dato_clave_etiqueta: 'Peñalara: 2.428 m (Techo CAM)',
    caja_leitner: 4,
    proxima_revision: '2026-10-30T10:00:00.000Z',
    fallos_totales: 0,
    aciertos_consecutivos: 4,
    ultima_vez_vista: '2026-10-10T10:00:00.000Z',
  },
  {
    id: 'preg-27-2',
    tema_id: 27,
    seccion_id: 'sec-27-1',
    enunciado: 'En la red de pasos y carreteras de montaña de la Comunidad de Madrid, ¿cuál es la altitud del Puerto de Navacerrada por el que discurre la carretera M-601?',
    opciones: [
      '1.860 metros.',
      '1.830 metros.',
      '1.796 metros.',
      '1.511 metros.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'Navacerrada está a 1.860 metros. 1.830 m corresponde al Puerto de Cotos (M-604), 1.796 m al Puerto de la Morcuera (M-611) y 1.511 m al Puerto de los Leones (N-VI). Es pregunta fija de topografía en Bomberos CAM.',
    cita_exacta: 'Puerto de Navacerrada: 1.860 m (Carretera M-601).',
    dato_clave_etiqueta: 'Navacerrada: 1.860 m',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T16:00:00.000Z',
    fallos_totales: 0,
    aciertos_consecutivos: 0,
    ultima_vez_vista: null, // NUEVA
  },
  {
    id: 'preg-31-1',
    tema_id: 31,
    seccion_id: 'sec-31-1',
    enunciado: 'Según el Plan Especial de Protección Civil de Emergencia por Incendios Forestales en la CAM (INFOMA), ¿qué periodo temporal comprende con carácter general la Época de Peligro Alto?',
    opciones: [
      'Del 15 de junio al 30 de septiembre.',
      'Del 1 de junio al 30 de septiembre.',
      'Del 15 de junio al 15 de octubre.',
      'Del 1 de julio al 31 de agosto.',
    ],
    respuesta_correcta: 0,
    explicacion_profesor: 'El Plan INFOMA fija la Época de Peligro Alto estrictamente del 15 de junio al 30 de septiembre. Del 16 de mayo al 14 de junio y del 1 al 31 de octubre es Peligro Medio, y del 1 de noviembre al 15 de mayo es Peligro Bajo.',
    cita_exacta: 'Época de Peligro Alto: Comprende con carácter general del 15 de junio al 30 de septiembre.',
    dato_clave_etiqueta: 'INFOMA Peligro Alto: 15 jun - 30 sep',
    caja_leitner: 0,
    proxima_revision: '2026-10-16T09:00:00.000Z',
    fallos_totales: 1,
    aciertos_consecutivos: 0,
    ultima_vez_vista: '2026-10-15T09:00:00.000Z',
  },
];
