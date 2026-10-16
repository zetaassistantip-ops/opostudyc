import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

interface IngestaRequestBody {
  tema_id: number;
  epigrafe: string;
  texto_bruto: string;
}

// Obligatorio en Next.js App Router para evitar Timeouts en Vercel al generar baterías grandes
export const maxDuration = 60;

const SYSTEM_PROMPT = `Actúa como Catedrático en Psicometría y Presidente del Tribunal Calificador de las oposiciones del Cuerpo de Bomberos de la Comunidad de Madrid (CAM).
Tu objetivo es procesar el texto oficial adjunto y transformarlo en material de estudio de alto rendimiento y preguntas de examen de máxima exigencia discriminatoria.

### FASE 1: ESTRUCTURACIÓN MARKDOWN (contenido_markdown)
- Limpia y estructura el texto en Markdown claro y escaneable.
- PROHIBIDO resumir u omitir artículos, cifras, presiones, caudales, temperaturas, normas UNE/EN, plazos, mayorías o excepciones. Todo dato susceptible de pregunta debe permanecer íntegro.

### FASE 2: EXTRACCIÓN DE DATOS CRÍTICOS (datos_criticos)
- Extrae una lista exhaustiva de pares { concepto, valor_exacto, trampa_habitual }.
- Enfócate en: cifras exactas, artículos legales, plazos (hábiles vs naturales), normas UNE, euroclases de fuego, presiones/caudales, altitudes de picos, carreteras de la CAM y competencias de órganos.

### FASE 3: DISEÑO PSICOMÉTRICO DE PREGUNTAS (REGLAS ESTRICTAS DE TRIBUNAL CAM)
Genera una batería exhaustiva de preguntas tipo test de 4 opciones aplicando estas reglas inquebrantables:

1. PROHIBICIÓN DE OPCIONES POSICIONALES (CRÍTICO PARA BARAJADO):
   - Como la aplicación baraja aleatoriamente el orden de las 4 opciones en cada partida, queda TERMINANTEMENTE PROHIBIDO generar opciones como "Todas las anteriores son correctas", "Ninguna de las anteriores", "A y B son correctas" o "Ambas son ciertas". Las 4 opciones deben ser enunciados autónomos e independientes.

2. ISOMORFISMO Y CONTROL DE SESGO DE LONGITUD:
   - La opción correcta NO puede ser sistemáticamente la más larga ni la más detallada.
   - Los 3 distractores deben tener exactamente la misma estructura gramatical, nivel de tecnicismo y longitud aproximada (en palabras) que la opción correcta.

3. PROPORCIÓN DE ENUNCIADOS NEGATIVOS (25% - 30%):
   - Entre una cuarta y una tercera parte de las preguntas deben buscar la opción falsa (ej.: "Según la Ley 17/2015 del Sistema Nacional de Protección Civil, señale la afirmación INCORRECTA:", "¿Cuál de los siguientes municipios NO pertenece a la zona de actuación...?"). Escribe siempre las palabras "NO", "INCORRECTA" o "EXCEPTO" en MAYÚSCULAS dentro del enunciado.

4. MATRIZ DE TRAMPAS POR BLOQUE TEMÁTICO (BOMBEROS CAM):
   - Si el texto es LEGISLATIVO (Constitución, Estatuto CAM, Ley 17/2015, TREBEP, PRL, Igualdad): Crea distractores intercambiando órganos (Consejo de Gobierno vs Asamblea de Madrid; Congreso vs Senado), verbos modales ("deberá" por "podrá", "será preceptivo" por "será vinculante"), plazos ("días hábiles" por "naturales") y mayorías ("mayoría absoluta" por "tres quintos" o "mayoría simple").
   - Si el texto es TÉCNICO / ESPECÍFICO (Teoría del fuego, Hidráulica, Bombas, CTE DB-SI, RIPCI, Mercancías Peligrosas ADR, Construcción, Sanitario): Crea distractores alterando unidades (bar, MPa, m.c.a., kg/cm²), códigos UNE/EN (ej. UNE-EN 2 vs UNE-EN 3), resistencias al fuego (R, RE, REI, EI-60 vs EI-120), límites de inflamabilidad (LII/LSI) o relaciones matemáticas (ej. pérdida de carga respecto al caudal o diámetro).
   - Si el texto es TERRITORIO / GEOGRAFÍA CAM (Orografía, Hidrografía, Red Viaria, INFOMA): Crea distractores cruzando afluentes por margen derecha/izquierda (ríos Jarama, Lozoya, Guadarrama, Alberche, Tajuña, Henares), cotas de picos de la Sierra de Guadarrama, o clasificaciones de la Red de Carreteras de la CAM (Red Principal, Secundaria y Local).

5. INTEGRIDAD DE CITA EXACTA (cita_exacta):
   - Extrae una subcadena LITERAL e IDÉNTICA (copia exacta carácter por carácter, de entre 8 y 22 palabras, SIN signos de formato Markdown como asteriscos ** o almohadillas #) que exista dentro de tu propio "contenido_markdown" y demuestre la respuesta.

6. EXPLICACIÓN DEL PROFESOR (explicacion_profesor):
   - Sé directo, quirúrgico y pedagógico. Empieza indicando por qué la correcta es verdadera citando el dato/artículo clave, y desglosa en una línea qué trampa específica contiene cada uno de los distractores.`;

export async function POST(req: NextRequest) {
  try {
    const body: IngestaRequestBody = await req.json();
    const { tema_id, epigrafe, texto_bruto } = body;

    if (!tema_id || !epigrafe || !texto_bruto) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: tema_id, epigrafe o texto_bruto.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    let resultadoIA: {
      contenido_markdown: string;
      datos_criticos: Array<{ concepto: string; valor_exacto: string; trampa_habitual: string }>;
      preguntas: Array<{
        enunciado: string;
        opciones: string[];
        respuesta_correcta: number;
        explicacion_profesor: string;
        cita_exacta: string;
        dato_clave_etiqueta: string;
      }>;
    };

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      const promptUser = `TEMA NÚMERO: ${tema_id}
EPÍGRAFE: ${epigrafe}

TEXTO EN BRUTO OFICIAL PARA DESTRIPAR:
${texto_bruto}

Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura exacta:
{
  "contenido_markdown": "Texto íntegro limpio y bien estructurado en Markdown...",
  "datos_criticos": [
    { "concepto": "Nombre del dato o plazo", "valor_exacto": "Cifra/Dato oficial", "trampa_habitual": "Trampa de examen" }
  ],
  "preguntas": [
    {
      "enunciado": "Pregunta maliciosa de examen oficial...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0,
      "explicacion_profesor": "Por qué la correcta lo es y trampa de las otras...",
      "cita_exacta": "Frase literal idéntica de entre 10 y 25 palabras del markdown...",
      "dato_clave_etiqueta": "Plazo / Cifra / Norma"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptUser,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '';
      try {
        resultadoIA = JSON.parse(responseText);
      } catch {
        // En caso de que venga con bloques markdown ```json
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resultadoIA = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No se pudo parsear la respuesta JSON de Gemini');
        }
      }
    } else {
      // Fallback pedagógico si no hay GEMINI_API_KEY configurada
      resultadoIA = {
        contenido_markdown: `### ${epigrafe.toUpperCase()}\n\n${texto_bruto}\n\n*(Procesado en modo local sin GEMINI_API_KEY)*`,
        datos_criticos: [
          {
            concepto: 'Epígrafe analizado',
            valor_exacto: epigrafe,
            trampa_habitual: 'Atención a plazos y competencias en este punto del temario.',
          },
        ],
        preguntas: [
          {
            enunciado: `Respecto a ${epigrafe}, según lo dispuesto en el temario oficial de Bomberos CAM:`,
            opciones: [
              `De acuerdo con el texto oficial analizado en este epígrafe.`,
              `Se aplicará en todo caso sin requerir informe previo del órgano competente.`,
              `El plazo ordinario será de 10 días naturales en lugar de hábiles.`,
              `Corresponde exclusivamente a la Administración General del Estado.`,
            ],
            respuesta_correcta: 0,
            explicacion_profesor: `La opción A refleja el texto verificado. Las opciones B, C y D contienen las típicas trampas de tribunal (naturales vs hábiles, alteración de competencias).`,
            cita_exacta: texto_bruto.slice(0, 80).trim(),
            dato_clave_etiqueta: `Tema ${tema_id}: ${epigrafe.slice(0, 20)}`,
          },
        ],
      };
    }

    // Guardado en Supabase si está disponible
    let seccionId = 'sec-' + Date.now();
    if (supabase) {
      try {
        const { data: secData, error: secErr } = await supabase
          .from('secciones_temario')
          .insert([
            {
              tema_id,
              epigrafe,
              contenido_markdown: resultadoIA.contenido_markdown,
              datos_criticos: resultadoIA.datos_criticos,
            },
          ])
          .select()
          .single();

        if (!secErr && secData) {
          seccionId = secData.id;

          const batchPreguntas = resultadoIA.preguntas.map((p) => ({
            tema_id,
            seccion_id: seccionId,
            enunciado: p.enunciado,
            opciones: p.opciones,
            respuesta_correcta: p.respuesta_correcta,
            explicacion_profesor: p.explicacion_profesor,
            cita_exacta: p.cita_exacta,
            dato_clave_etiqueta: p.dato_clave_etiqueta,
            caja_leitner: 0,
            proxima_revision: new Date().toISOString(),
            fallos_totales: 0,
            aciertos_consecutivos: 0,
            ultima_vez_vista: null,
          }));

          await supabase.from('preguntas').insert(batchPreguntas);
        }
      } catch (dbErr) {
        console.warn('Error al persistir en Supabase desde API route:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      seccionId,
      seccion: {
        id: seccionId,
        tema_id,
        epigrafe,
        contenido_markdown: resultadoIA.contenido_markdown,
        datos_criticos: resultadoIA.datos_criticos,
      },
      preguntas: resultadoIA.preguntas.map((p, idx) => ({
        ...p,
        id: `preg-${Date.now()}-${idx}`,
        tema_id,
        seccion_id: seccionId,
        caja_leitner: 0,
        proxima_revision: new Date().toISOString(),
        fallos_totales: 0,
        aciertos_consecutivos: 0,
        ultima_vez_vista: null,
      })),
      totalPreguntas: resultadoIA.preguntas.length,
    });
  } catch (error: unknown) {
    console.error('Error en /api/ingesta:', error);
    const msg = error instanceof Error ? error.message : 'Error procesando la ingesta con el Tribunal de Gemini.';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
