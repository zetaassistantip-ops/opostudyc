import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Obligatorio en Next.js App Router para evitar Timeouts en Vercel
export const maxDuration = 60;

interface MotorTemaRequest {
  temaId: number;
  forzarGeneracion?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: MotorTemaRequest = await req.json();
    const { temaId, forzarGeneracion = false } = body;

    if (!temaId || typeof temaId !== 'number') {
      return NextResponse.json(
        { error: 'El parámetro temaId es obligatorio y debe ser numérico.' },
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
        { error: 'Configuración de Supabase no disponible en el servidor.' },
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

    // 2. Obtener preguntas existentes para este tema
    const { data: preguntasExistentes, error: errorExistentes } = await supabase
      .from('preguntas')
      .select('id, enunciado, dato_clave_etiqueta, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, caja_leitner, proxima_revision, fallos_totales, aciertos_consecutivos, ultima_vez_vista, seccion_id, tema_id')
      .eq('tema_id', temaId);

    if (errorExistentes) {
      console.warn('Aviso consultando preguntas existentes:', errorExistentes);
    }

    const totalExistentes = preguntasExistentes?.length || 0;

    // Si ya hay preguntas suficientes (>= 10) y no se solicita forzar generación adicional, devolver banco actual
    if (!forzarGeneracion && totalExistentes >= 10) {
      return NextResponse.json({
        ok: true,
        temaId,
        tema,
        preguntas: preguntasExistentes,
        nuevasGeneradas: 0,
        mensaje: `Banco cargado desde Supabase (${totalExistentes} preguntas existentes).`,
      });
    }

    // 3. Obtener o crear sección con contenido de temario
    let { data: secciones } = await supabase
      .from('secciones_temario')
      .select('*')
      .eq('tema_id', temaId);

    let seccionPrincipal = secciones && secciones.length > 0 ? secciones[0] : null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Falta la variable GEMINI_API_KEY para generar preguntas con IA.',
          preguntas: preguntasExistentes || [],
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Si no hay sección o el texto es inferior a 400 caracteres, generar contenido estructurado primero
    if (!seccionPrincipal || !seccionPrincipal.contenido_markdown || seccionPrincipal.contenido_markdown.length < 400) {
      const promptGenerarTemario = `Actúa como Catedrático y Redactor Oficial del temario de Bomberos de la Comunidad de Madrid.
Redacta el texto técnico y legislativo íntegro del Tema ${tema.id}: "${tema.titulo}" (Bloque: ${tema.bloque}).
Incluye de forma rigurosa:
- Articulado legal exacto, plazos, competencias y mayorías.
- Normativa técnica (normas UNE, CTE DB-SI, RIPCI, ADR, UNE-EN según corresponda).
- Fórmulas, valores de presión, caudales, temperaturas, unidades o distancias de seguridad.
- Picos, carreteras, ríos o zonas de la CAM si es tema de territorio.

Devuelve ÚNICAMENTE un JSON con:
{
  "contenido_markdown": "Texto estructurado en Markdown claro y exhaustivo...",
  "datos_criticos": [
    { "concepto": "Dato o plazo clave", "valor_exacto": "Cifra/Valor oficial", "trampa_habitual": "Confusión habitual" }
  ]
}`;

      const resTemario = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptGenerarTemario,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      let parsedTemario = {
        contenido_markdown: `## Tema ${tema.id}: ${tema.titulo}\nContenido oficial de estudio para Bomberos CAM.`,
        datos_criticos: [],
      };

      try {
        parsedTemario = JSON.parse(resTemario.text || '{}');
      } catch (e) {
        console.error('Error parseando temario generado:', e);
      }

      const { data: nuevaSeccion, error: errSec } = await supabase
        .from('secciones_temario')
        .insert({
          tema_id: temaId,
          epigrafe: `Contenido Oficial: ${tema.titulo}`,
          contenido_markdown: parsedTemario.contenido_markdown,
          datos_criticos: parsedTemario.datos_criticos || [],
        })
        .select()
        .single();

      if (!errSec && nuevaSeccion) {
        seccionPrincipal = nuevaSeccion;
      }
    }

    // 4. Preparar filtro anti-duplicados exhaustivo
    const listaExclusion = preguntasExistentes && preguntasExistentes.length > 0
      ? preguntasExistentes
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.enunciado}${
                p.dato_clave_etiqueta ? ` [Dato: ${p.dato_clave_etiqueta}]` : ''
              }`
          )
          .join('\n')
      : 'Ninguna pregunta generada todavía en la base de datos para este tema.';

    const systemInstruction = `Actúa como Catedrático en Psicometría y Presidente del Tribunal Calificador de las oposiciones del Cuerpo de Bomberos de la Comunidad de Madrid (CAM).
Tu objetivo es generar una batería exhaustiva de 12 a 15 preguntas tipo test de 4 opciones de máxima exigencia discriminatoria basadas estrictamente en el texto del temario proporcionado.

REGLAS INQUEBRANTABLES:
1. REGLA CRÍTICA DE NO DUPLICACIÓN:
Aquí tienes la lista de preguntas y conceptos que YA EXISTEN en la base de datos para este tema:
---
${listaExclusion}
---
Queda TERMINANTEMENTE PROHIBIDO repetir estas preguntas o evaluar exactamente el mismo dato de la misma manera. Busca otros artículos, fórmulas, plazos, presiones, caudales, excepciones, normas UNE o matices del texto que aún no estén cubiertos.

2. PROHIBICIÓN DE OPCIONES POSICIONALES (CRÍTICO PARA BARAJADO):
Como la aplicación baraja aleatoriamente el orden de las 4 opciones, queda TERMINANTEMENTE PROHIBIDO generar opciones como "Todas las anteriores son correctas", "Ninguna de las anteriores", "A y B son correctas" o "Ambas son ciertas". Las 4 opciones deben ser enunciados autónomos e independientes.

3. ISOMORFISMO Y CONTROL DE SESGO DE LONGITUD:
La opción correcta NO puede ser sistemáticamente la más larga ni la más detallada. Los 3 distractores deben tener exactamente la misma estructura gramatical, nivel de tecnicismo y longitud aproximada (en palabras) que la opción correcta.

4. PROPORCIÓN DE ENUNCIADOS NEGATIVOS (25% - 30%):
Entre una cuarta y una tercera parte de las preguntas deben buscar la opción falsa o incorrecta (ej.: "¿Cuál de las siguientes afirmaciones es INCORRECTA?", "Señale la opción que NO corresponde..."). Escribe siempre las palabras "NO", "INCORRECTA" o "EXCEPTO" en MAYÚSCULAS dentro del enunciado.

5. MATRIZ DE TRAMPAS BOMBEROS CAM:
- Si es LEGISLATIVO: Intercambia órganos (Consejo de Gobierno vs Asamblea), plazos (hábiles vs naturales), verbos modales (deberá vs podrá), mayorías.
- Si es TÉCNICO / FUEGO / HIDRÁULICA: Altera unidades (bar, MPa, m.c.a.), normas UNE/EN, euroclases de fuego, presiones/caudales, límites de inflamabilidad.
- Si es TERRITORIO CAM: Márgenes de ríos (derecha vs izquierda), cotas de Guadarrama, red viaria (Principal, Secundaria, Local), INFOMA.

6. CITA LITERAL EXACTA (cita_exacta):
Extrae una subcadena LITERAL e IDÉNTICA (copia exacta de entre 8 y 22 palabras, SIN asteriscos ** ni almohadillas #) que exista dentro del texto del temario y demuestre la respuesta.

7. EXPLICACIÓN DEL PROFESOR (explicacion_profesor):
Sé directo, quirúrgico y pedagógico. Cita el dato clave y desglosa en una línea la trampa de los distractores.`;

    const textoTemario = seccionPrincipal?.contenido_markdown?.slice(0, 30000) || `Tema ${tema.id}: ${tema.titulo}`;

    const promptUser = `TEMA NÚMERO: ${tema.id} - ${tema.titulo} (Bloque: ${tema.bloque})

TEXTO OFICIAL DEL TEMARIO:
${textoTemario}

Genera entre 12 y 15 preguntas NUEVAS que cumplan todas las reglas psicométricas y no repitan ninguna de las ya existentes.
Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "preguntas": [
    {
      "enunciado": "Enunciado riguroso de examen...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0,
      "explicacion_profesor": "Por qué es correcta y trampa de las falsas...",
      "cita_exacta": "Frase literal idéntica sin formato del texto...",
      "dato_clave_etiqueta": "Plazo / Cifra / Norma"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptUser,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    const responseText = response.text || '';
    let preguntasGeneradas: Array<{
      enunciado: string;
      opciones: string[];
      respuesta_correcta: number;
      explicacion_profesor: string;
      cita_exacta: string;
      dato_clave_etiqueta?: string;
    }> = [];

    try {
      const parsed = JSON.parse(responseText);
      preguntasGeneradas = parsed.preguntas || [];
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        preguntasGeneradas = parsed.preguntas || [];
      }
    }

    if (preguntasGeneradas.length === 0) {
      return NextResponse.json(
        {
          error: 'No se pudieron generar preguntas válidas en esta iteración.',
          preguntas: preguntasExistentes || [],
        },
        { status: 500 }
      );
    }

    // 5. Mapear e insertar las nuevas preguntas en Supabase
    const preguntasParaInsertar = preguntasGeneradas.map((p) => ({
      tema_id: temaId,
      seccion_id: seccionPrincipal?.id || null,
      enunciado: p.enunciado.trim(),
      opciones: p.opciones,
      respuesta_correcta: p.respuesta_correcta,
      explicacion_profesor: p.explicacion_profesor,
      cita_exacta: p.cita_exacta || '',
      dato_clave_etiqueta: p.dato_clave_etiqueta || null,
      caja_leitner: 0,
      proxima_revision: new Date().toISOString(),
      fallos_totales: 0,
      aciertos_consecutivos: 0,
      ultima_vez_vista: null,
    }));

    const { data: insertadas, error: errorInsert } = await supabase
      .from('preguntas')
      .insert(preguntasParaInsertar)
      .select('id, enunciado, dato_clave_etiqueta, opciones, respuesta_correcta, explicacion_profesor, cita_exacta, caja_leitner, proxima_revision, fallos_totales, aciertos_consecutivos, ultima_vez_vista, seccion_id, tema_id');

    if (errorInsert) {
      console.error('Error insertando nuevas preguntas en Supabase:', errorInsert);
      return NextResponse.json(
        {
          error: `Error guardando en Supabase: ${errorInsert.message}`,
          preguntasGeneradasEnMemoria: preguntasParaInsertar,
        },
        { status: 500 }
      );
    }

    // Devolver lista combinada y actualizada del banco
    const totalActualizadas = [
      ...(preguntasExistentes || []),
      ...(insertadas || []),
    ];

    return NextResponse.json({
      ok: true,
      temaId,
      tema,
      preguntas: totalActualizadas,
      nuevasGeneradas: insertadas?.length || 0,
      mensaje: `¡Se han generado y guardado ${insertadas?.length || 0} preguntas oficiales nuevas en el banco de Supabase!`,
    });
  } catch (error: unknown) {
    console.error('Error en /api/motor-tema:', error);
    const msg = error instanceof Error ? error.message : 'Error interno en el motor de temas.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
