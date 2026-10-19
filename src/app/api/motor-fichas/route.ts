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

    const systemInstruction = `Actúa como Catedrático y Preparador de Élite del Cuerpo de Bomberos de la Comunidad de Madrid (CAM).
Tu objetivo es generar Fichas Técnicas estilo Anki (formato doble cara) de MÁXIMA CALIDAD PEDAGÓGICA Y SENTIDO COMPLETO para el Tema ${tema.id}: ${tema.titulo}.

PROHIBICIONES CRÍTICAS:
- PROHIBIDO generar títulos o conceptos genéricos como "Dato técnico en...", "Normativa de...", "Artículo 5".
- PROHIBIDO generar respuestas huérfanas como "15 años", "3,5 bar", "6 meses" sin contexto gramatical que explique qué significa esa cifra.
- PROHIBIDO usar preguntas incompletas o telegráficas.

TIPOS DE FICHA OBLIGATORIOS (tipo_ficha):
Cada ficha debe pertenecer OBLIGATORIAMENTE a uno de estos dos tipos:

1. "tabla" (Agrupación de Tablas, Escalas o Clasificaciones):
   - Aplica cuando el temario describe una tabla, escala, clasificación o catálogo normativo (ejemplos: Euroclases de reacción al fuego A1-F, clases de fuego A-F, presiones/caudales de BIEs de 25 y 45 mm, dotaciones mínimas de extintores según superficie/uso, épocas de peligro y fechas del Plan INFOMA, clasificación de túneles, cotas y puertos de montaña).
   - REGLA: NO despieces los datos en 10 fichas sueltas. Crea UNA ÚNICA FICHA donde:
     * "frente_pregunta": Pregunta por la tabla, clasificación o escala completa (ej: "¿Cuáles son las épocas de peligro del Plan INFOMA y qué fechas exactas comprende cada una?").
     * "dorso_respuesta": Muestra la tabla o lista completa perfectamente estructurada en Markdown, comparando las categorías con sus valores exactos.
     * "concepto": Nombre descriptivo de la tabla/clasificación (ej: "INFOMA: Épocas de Peligro y Fechas").
     * "valor_exacto": Resumen sintético del rango o clave clasificatoria.
     * "trampa_habitual": La confusión típica que pone el tribunal entre categorías.
     * "categoria_dato": "Tabla / Clasificación"

2. "concepto" (Pregunta Quirúrgica Contextualizada):
   - Aplica a datos críticos puntuales de alta exigencia (artículos clave, plazos, presiones, distancias, composiciones).
   - REGLA:
     * "frente_pregunta": Debe ser una PREGUNTA COMPLETA que incluya la norma/reglamento y qué se pregunta exactamente (ej: "Según el RIPCI (RD 513/2017), ¿a qué presión máxima debe someterse una prueba hidrostática de manguera de extinción y durante cuánto tiempo?").
     * "dorso_respuesta": Debe responder con la cifra/concepto EXACTO y CONTEXTUALIZADO (ej: "Presión de prueba: 15 bar durante 5 minutos según UNE 23091, sin que se produzcan fugas ni deformaciones permanentes.").
     * "concepto": Nombre técnico conciso del dato (ej: "RIPCI: Prueba de Presión Hidrostática de Mangueras").
     * "valor_exacto": La cifra o término exacto.
     * "trampa_habitual": La trampa clásica de test del tribunal.
     * "categoria_dato": Etiqueta breve (ej. "Normativa", "Hidráulica", "Legislación").

LISTA DE FICHAS YA EXISTENTES (NO REPETIR NINGUNA):
---
${listaExclusion}
---`;

    const userPrompt = `TEMA ${tema.id}: ${tema.titulo} (${tema.bloque})

TEXTO Y BASE NORMATIVA DISPONIBLE:
${textoBase}

Genera EXACTAMENTE 8 Fichas Técnicas de alta precisión estilo Anki (combina fichas de tipo "tabla" si hay clasificaciones/escalas en el texto y fichas de tipo "concepto" para datos quirúrgicos).
Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "fichas": [
    {
      "tipo_ficha": "tabla" o "concepto",
      "frente_pregunta": "¿Pregunta completa con contexto normativo y exactitud?",
      "dorso_respuesta": "Solución completa estructurada (en tabla markdown o texto contextualizado)...",
      "concepto": "Título descriptivo no genérico",
      "valor_exacto": "Dato o resumen clave",
      "trampa_habitual": "Trampa habitual de examen",
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
        tipo_ficha?: 'tabla' | 'concepto';
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

    // 5. Insertar las fichas en Supabase con estructura Anki y tipo_ficha
    const paraInsertar = fichasGeneradas.map((f) => {
      const tipo = f.tipo_ficha === 'tabla' ? 'tabla' : 'concepto';
      const frente = f.frente_pregunta?.trim() || f.concepto.trim();
      const dorso =
        f.dorso_respuesta?.trim() ||
        `${f.valor_exacto.trim()}.${f.trampa_habitual ? `\n\n⚠️ Ojo con la trampa: ${f.trampa_habitual.trim()}` : ''}`;

      return {
        tema_id: temaId,
        concepto: f.concepto.trim(),
        valor_exacto: f.valor_exacto.trim(),
        trampa_habitual: f.trampa_habitual.trim(),
        categoria_dato: f.categoria_dato?.trim() || (tipo === 'tabla' ? 'Tabla / Clasificación' : 'Concepto'),
        tipo_ficha: tipo,
        frente_pregunta: frente,
        dorso_respuesta: dorso,
      };
    });

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
