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

    // 2. Obtener fichas existentes para no duplicar y calcular capa de profundidad
    const { data: fichasExistentes } = await supabase
      .from('fichas_tecnicas')
      .select('concepto, frente_pregunta, valor_exacto, tipo_ficha')
      .eq('tema_id', temaId);

    const numExistentes = fichasExistentes?.length || 0;
    const esCapa1 = numExistentes < 10;

    // 3. Obtener temario base si existe en secciones_temario
    const { data: secciones } = await supabase
      .from('secciones_temario')
      .select('contenido_markdown, epigrafe')
      .eq('tema_id', temaId)
      .limit(3);

    const textoBase = secciones && secciones.length > 0 && secciones[0].contenido_markdown
      ? secciones.map((s) => `### ${s.epigrafe}\n${s.contenido_markdown}`).join('\n\n').slice(0, 16000)
      : `Tema ${tema.id}: ${tema.titulo} (Bloque: ${tema.bloque}) de la oposición de Bomberos de la Comunidad de Madrid.`;

    const listaExclusion = fichasExistentes && fichasExistentes.length > 0
      ? fichasExistentes.map((f, i) => `${i + 1}. [${f.tipo_ficha || 'concepto'}] Reto: "${f.frente_pregunta || f.concepto}" (Valor: "${f.valor_exacto}")`).join('\n')
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

    const directrizCapa = esCapa1
      ? `ESTRATEGIA ACTUAL: CAPA 1 - CAZA PRIORITARIA 100% EXAMEN (El tema tiene ${numExistentes} fichas en BD).
Tu objetivo en esta Capa 1 es extraer EXCLUSIVAMENTE los datos MÁS CRÍTICOS Y PREGUNTADOS DEL TEMA:
- Tablas normativas completas y clasificaciones oficiales de memoria obligatoria.
- Escalas, presiones de trabajo y prueba, caudales nominales, cotas y distancias mínimas/máximas.
- Plazos fatales de revisión e inspección según reglamento.`
      : `ESTRATEGIA ACTUAL: CAPA 2 - HILAR FINO (El tema ya cuenta con ${numExistentes} fichas consolidadas en BD).
Tu objetivo en esta Capa 2 es profundizar pedagógicamente SIN REPETIR ninguno de los conceptos o tablas ya existentes:
- Excepciones a las reglas generales y notas técnicas al pie de página.
- Casos especiales de intervención o diseño normativo.
- Diferencias sutiles y trampas clásicas entre conceptos muy parecidos que el tribunal suele confundir a propósito.
- Artículos específicos y factores de corrección técnicos.`;

    const systemInstruction = `Actúa como Presidente del Tribunal Calificador de Oposiciones a Bomberos de la Comunidad de Madrid (CAM) y Preparador de Élite.
Tu misión es diseñar Fichas Técnicas estilo Anki (formato doble cara) con FORMATO "RETO GUIADO" para el Tema ${tema.id}: ${tema.titulo}.

${directrizCapa}

REGLAS PEDAGÓGICAS ESTRICTAS (TOLERANCIA CERO):
1. PROHIBIDO generar títulos o conceptos genéricos como "Dato técnico en...", "Normativa de...", "Artículo 5".
2. PROHIBIDO generar respuestas huérfanas como "15 años", "3,5 bar", "6 meses" sin contexto gramatical completo.
3. PROHIBIDO usar preguntas abiertas o telegráficas.

FORMATO OBLIGATORIO DE CADA CARA:
- CARA A (frente_pregunta) - "RETO GUIADO":
  NUNCA puede ser un título ni una pregunta ambigua. DEBE indicar siempre:
  1) Norma / Bloque exacto (ej. "Según el RIPCI (RD 513/2017)...", "En Hidráulica / Bombas...", "En el CTE DB-SI...").
  2) Qué datos exactos debe recitar mentalmente el opositor antes de girar la carta (ej. "¿Cuáles son los 2 tipos de BIE y qué diámetro, longitud máxima de manguera y presión dinámica mínima exige la norma para cada una?").

- CARA B (dorso_respuesta) - "SOLUCIÓN MAQUETADA":
  Debe responder con total claridad y exactitud.
  * Si es de tipo "tabla": Devuelve una TABLA COMPLETA en formato Markdown (| Col1 | Col2 |...) perfectamente tabulada y comparada.
  * Si es de tipo "concepto": Respuesta contextualizada con su unidad técnica exacta + bloque final "⚠️ Trampa de examen: [aviso de qué cifra suelen cambiar en los tests para hacerte caer]".

TIPOS DE FICHA (tipo_ficha):
- "tabla": Cuando el contenido describe una tabla, catálogo, escala o clasificación (Euroclases, clases de fuego, presiones/caudales BIEs, dotación extintores, épocas INFOMA, túneles, cotas de puertos). Crea UNA SOLA FICHA que agrupe la tabla completa, NO la despieces en datos sueltos.
- "concepto": Para 2-3 cifras críticas hermanadas o un dato quirúrgico con su trampa de examen.

LISTA DE FICHAS YA EXISTENTES (PROHIBIDO DUPLICAR O REPETIR):
---
${listaExclusion}
---`;

    const userPrompt = `TEMA ${tema.id}: ${tema.titulo} (${tema.bloque})

TEXTO Y BASE NORMATIVA DISPONIBLE:
${textoBase}

Genera EXACTAMENTE 8 Fichas Técnicas con formato "Reto Guiado" aplicando rigurosamente la ${esCapa1 ? 'CAPA 1 (Prioridad 100% examen)' : 'CAPA 2 (Hilar fino sin repetir las existentes)'}.
Devuelve ÚNICAMENTE un JSON estructurado válido:
{
  "fichas": [
    {
      "tipo_ficha": "tabla" o "concepto",
      "frente_pregunta": "Según la norma X, ¿cuáles son los datos exactos que debes recitar...?",
      "dorso_respuesta": "Tabla Markdown completa o solución explicada con cifra exacta + bloque ⚠️ Trampa de examen: ...",
      "concepto": "Título descriptivo no genérico",
      "valor_exacto": "Resumen clave o cifra exacta",
      "trampa_habitual": "La trampa típica de tribunal",
      "categoria_dato": "Etiqueta técnica (ej. Tabla Normativa, Presiones, Dotaciones)"
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
