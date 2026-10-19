import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function getSupabaseClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  );

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase no configurado en servidor');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fichaId, frentePregunta, dorsoRespuesta, temaId } = body;

    if (!fichaId) {
      return NextResponse.json(
        { error: 'El parámetro fichaId es obligatorio.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Comprobar si ya existe una explicación guardada en Supabase
    try {
      const { data: fichaExistente } = await supabase
        .from('fichas_tecnicas')
        .select('explicacion_ia')
        .eq('id', fichaId)
        .single();

      if (fichaExistente?.explicacion_ia && fichaExistente.explicacion_ia.trim().length > 10) {
        return NextResponse.json({
          ok: true,
          explicacion: fichaExistente.explicacion_ia,
          origen: 'cache_bd',
        });
      }
    } catch (e) {
      console.warn('Aviso comprobando explicacion_ia existente:', e);
    }

    // 2. Si no existe, invocar a Gemini
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta configurar GEMINI_API_KEY en el servidor.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Actúa como un Suboficial y Profesor veterano del Cuerpo de Bomberos de la Comunidad de Madrid (CAM) con más de 20 años en primera línea de intervención y formando opositores.
Tu misión es explicar con cercanía, máxima precisión y de manera didáctica el porqué técnico y operativo de este dato o clasificación.

ESTRUCTURA DE TU RESPUESTA:
1. 🚒 **El Porqué Operativo**: Explica brevemente por qué la norma o la física exige este valor o esta clasificación en el trabajo real de bomberos (no solo para aprobar un test, sino para no morir en una intervención).
2. 💡 **Regla Mnemotécnica o Truco de Examen**: Da un truco mental, acrónimo, analogía o regla de tres para que el opositor memorice el número o la tabla al instante.
3. ⚠️ **Trampa Habitual del Tribunal**: Avisa del despiste típico que comete el 80% de opositores en este dato.

Mantén un tono motivador, riguroso y conciso (máximo 150-180 palabras).`;

    const userPrompt = `FICHA TÉCNICA (Tema ${temaId || 'Bomberos CAM'}):
- PREGUNTA / RETO: "${frentePregunta || 'Dato técnico'}"
- SOLUCIÓN / DATO OFICIAL: "${dorsoRespuesta || ''}"

Genera la explicación del profesor veterano.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const explicacionTexto = response.text?.trim() || '';

    if (!explicacionTexto) {
      return NextResponse.json(
        { error: 'No se pudo generar la explicación con IA.' },
        { status: 500 }
      );
    }

    // 3. Guardar la explicación en Supabase para futuras consultas
    try {
      await supabase
        .from('fichas_tecnicas')
        .update({ explicacion_ia: explicacionTexto })
        .eq('id', fichaId);
    } catch (e) {
      console.warn('Aviso guardando explicacion_ia en fichas_tecnicas:', e);
    }

    return NextResponse.json({
      ok: true,
      explicacion: explicacionTexto,
      origen: 'generada_ia',
    });
  } catch (error: unknown) {
    console.error('Error en /api/explicar-ficha:', error);
    const msg = error instanceof Error ? error.message : 'Error interno al generar explicación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
