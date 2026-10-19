import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Obligatorio en Next.js App Router para evitar Timeouts en Vercel
export const maxDuration = 60;

interface MotorFichasRequest {
  temaId: number;
  userId?: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: MotorFichasRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido (debe ser JSON).' },
        { status: 400 }
      );
    }

    const { temaId, userId } = body;

    if (!temaId || typeof temaId !== 'number') {
      return NextResponse.json(
        { error: 'El parámetro temaId es obligatorio y debe ser un número entero.' },
        { status: 400 }
      );
    }

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '') : '';
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      ''
    );

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no disponible en el servidor (faltan URLs o Claves).' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener información del tema oficial
    const { data: tema, error: errorTema } = await supabase
      .from('temas')
      .select('*')
      .eq('id', temaId)
      .single();

    if (errorTema || !tema) {
      return NextResponse.json(
        { error: `No se encontró el Tema ${temaId} en la base de datos.` },
        { status: 404 }
      );
    }

    // 2. Obtener fichas existentes para no duplicar
    const { data: fichasExistentes } = await supabase
      .from('fichas_tecnicas')
      .select('concepto, valor_exacto')
      .eq('tema_id', temaId);

    // 3. Obtener temario base si existe en secciones_temario
    const { data: secciones } = await supabase
      .from('secciones_temario')
      .select('contenido_markdown, epigrafe')
      .eq('tema_id', temaId)
      .limit(2);

    const textoBase = secciones && secciones.length > 0 && secciones[0].contenido_markdown
      ? secciones.map((s) => `### ${s.epigrafe}\n${s.contenido_markdown}`).join('\n\n').slice(0, 15000)
      : `Tema ${tema.id}: ${tema.titulo} (Bloque: ${tema.bloque}) de la oposición de Bomberos de la Comunidad de Madrid.`;

    const listaExclusion = fichasExistentes && fichasExistentes.length > 0
      ? fichasExistentes.map((f, i) => `${i + 1}. Concepto: "${f.concepto}" (Valor: "${f.valor_exacto}")`).join('\n')
      : 'Ninguna ficha generada previamente en la base de datos para este tema.';

    // 4. Invocar a Gemini con el prompt oficial de profesor de oposición
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no está configurada en las variables de entorno del servidor.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const systemInstruction = `Actúa como preparador experto del Cuerpo de Bomberos de la Comunidad de Madrid.
Genera 10 NUEVAS Fichas Técnicas interactivas estilo Anki (formato doble cara) de estudio ultraconcretas para el Tema ${tema.id}: ${tema.titulo}.

REGLA DE ORO:
- Cada ficha debe ser un reto binario de examen oficial.
- "frente_pregunta": Pregunta directa o reto de examen (ej. "¿Qué presión de prueba y caudal mínimo exige la norma para una BIE de 45 mm?").
- "dorso_respuesta": Solución técnica estructurada con el dato exacto, norma aplicable y matiz pedagógico.
- "concepto": Nombre del concepto clave escueto (ej. "BIE 45 mm: Presión y Caudal").
- "valor_exacto": El dato numérico o norma concisa (ej. "Presión: 3,5 bar entrada | Caudal: 200 l/min | UNE-EN 671-1").
- "trampa_habitual": Con qué dato lo suele confundir el tribunal en el test (ej. "No confundir con los 100 l/min a 3 bar de la BIE de 25 mm").
- "categoria_dato": Etiqueta breve (ej. "Normativa", "Presión / Caudal", "Plazo", "Geografía").

LISTA DE FICHAS YA EXISTENTES (NO REPETIR NINGUNA):
---
${listaExclusion}
---`;

    const userPrompt = `TEMA ${tema.id}: ${tema.titulo} (${tema.bloque})

TEXTO Y BASE NORMATIVA DISPONIBLE:
${textoBase}

Genera EXACTAMENTE 10 Fichas Técnicas de alta precisión estilo Anki.
Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "fichas": [
    {
      "frente_pregunta": "¿Pregunta o reto directo sobre el dato oficial?",
      "dorso_respuesta": "Respuesta técnica estructurada con datos oficiales...",
      "concepto": "Nombre breve del concepto",
      "valor_exacto": "Dato o cifra exacta",
      "trampa_habitual": "Trampa de examen o confusión típica",
      "categoria_dato": "Etiqueta"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    // Tracking de tokens y coste en euros
    try {
      const usage = response.usageMetadata;
      const tokens =
        usage?.totalTokenCount ||
        ((usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0)) ||
        0;
      const costeEur = tokens * 0.00000035;

      if (userId && tokens > 0) {
        const { data: perfil } = await supabase
          .from('perfiles_usuarios')
          .select('tokens_consumidos, coste_estimado_eur')
          .eq('id', userId)
          .maybeSingle();

        if (perfil) {
          await supabase
            .from('perfiles_usuarios')
            .update({
              tokens_consumidos: (Number(perfil.tokens_consumidos) || 0) + tokens,
              coste_estimado_eur: (Number(perfil.coste_estimado_eur) || 0) + costeEur,
            })
            .eq('id', userId);
        }
      }
    } catch (e) {
      console.warn('Aviso registrando tokens consumidos:', e);
    }

    const responseText = response.text || '';
    let parsed: {
      fichas?: Array<{
        frente_pregunta?: string;
        dorso_respuesta?: string;
        concepto: string;
        valor_exacto: string;
        trampa_habitual: string;
        categoria_dato?: string;
      }>;
    };

    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('La respuesta de Gemini no contiene un JSON estructurado válido.');
      }
    }

    const fichasGeneradas = parsed.fichas || [];

    if (!fichasGeneradas || fichasGeneradas.length === 0) {
      return NextResponse.json(
        { error: 'Gemini no devolvió fichas técnicas válidas.' },
        { status: 500 }
      );
    }

    // 5. Insertar las 10 fichas en Supabase con estructura Anki
    const paraInsertar = fichasGeneradas.slice(0, 10).map((f) => ({
      tema_id: temaId,
      concepto: f.concepto.trim(),
      valor_exacto: f.valor_exacto.trim(),
      trampa_habitual: f.trampa_habitual.trim(),
      categoria_dato: f.categoria_dato?.trim() || null,
      frente_pregunta: f.frente_pregunta?.trim() || f.concepto.trim(),
      dorso_respuesta:
        f.dorso_respuesta?.trim() ||
        `${f.valor_exacto.trim()}.${f.trampa_habitual ? `\n\n⚠️ Ojo: ${f.trampa_habitual.trim()}` : ''}`,
    }));

    const { data: insertadas, error: errorInsert } = await supabase
      .from('fichas_tecnicas')
      .insert(paraInsertar)
      .select('*');

    if (errorInsert) {
      console.error('Error insertando fichas_tecnicas en Supabase:', errorInsert);
      return NextResponse.json(
        {
          error: `Error guardando en Supabase: ${errorInsert.message}.`,
          fichasEnMemoria: paraInsertar,
        },
        { status: 500 }
      );
    }

    // 6. Obtener la lista completa actualizada de este tema
    const { data: totalTema } = await supabase
      .from('fichas_tecnicas')
      .select('*')
      .eq('tema_id', temaId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      ok: true,
      temaId,
      nuevasGeneradas: insertadas?.length || 0,
      fichas: (totalTema || insertadas || []).map((f) => ({ ...f, tema })),
      mensaje: `¡Se han generado +${insertadas?.length || 0} fichas técnicas oficiales con IA!`,
    });
  } catch (error: unknown) {
    console.error('Error en /api/motor-fichas:', error);
    const msg = error instanceof Error ? error.message : 'Error interno en el motor de fichas.';
    return NextResponse.json(
      { error: `Error del servidor: ${msg}` },
      { status: 500 }
    );
  }
}
