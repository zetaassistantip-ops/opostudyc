import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

interface IngestaRequestBody {
  tema_id: number;
  epigrafe: string;
  texto_bruto: string;
}

const SYSTEM_PROMPT = `Actúa como un miembro veterano del Tribunal Calificador de las oposiciones de Bombero de la Comunidad de Madrid. Tu objetivo es destripar este texto oficial.
1. Limpia y estructura el texto en Markdown claro conservando TODOS los datos técnicos, artículos, plazos, fórmulas y excepciones (contenido_markdown).
2. Extrae una lista exhaustiva de datos_criticos (cifras, presiones, normas UNE, artículos, plazos, competencias, carreteras, picos, poblaciones).
3. Genera una batería intensiva de preguntas tipo test de 4 opciones sobre todos los puntos susceptibles de examen.

REGLAS DE LAS PREGUNTAS (NIVEL OPOSICIÓN REAL):
- Prohibido hacer preguntas obvias o de relleno.
- Los 3 distractores (opciones falsas) deben ser maliciosos y plausibles: cambia 'días hábiles' por 'naturales', cambia 'podrá' por 'deberá', altera ligeramente una cifra o presión, o intercambia competencias entre órganos (ej. Consejo de Gobierno vs Asamblea).
- Incluye en cita_exacta una frase literal idéntica (copia y pega exacto de entre 10 y 25 palabras) extraída de tu contenido_markdown donde se demuestra la respuesta correcta.
- En explicacion_profesor, explica de forma directa y contundente por qué la correcta es esa y cuál es la trampa exacta de las otras opciones.`;

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
