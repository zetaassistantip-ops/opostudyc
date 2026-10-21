import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { TEMAS_CAM } from '@/lib/mock-data';
import { obtenerTextoTemario } from '@/lib/temario-loader';

// Obligatorio en Next.js App Router para evitar Timeouts en Vercel
export const maxDuration = 60;

interface MotorTemaRequest {
  temaId: number;
  forzarGeneracion?: boolean;
  userId?: string;
  cantidad?: number;
}

export async function POST(req: NextRequest) {
  try {
    let body: MotorTemaRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido (debe ser JSON).' },
        { status: 400 }
      );
    }

    const { temaId, forzarGeneracion = false, userId, cantidad = 6 } = body;
    const numGenerar = Math.max(1, Math.min(10, Number(cantidad) || 6));
    const temaIdNum = Number(temaId);

    if (!temaId || isNaN(temaIdNum) || typeof temaId !== 'number') {
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

    // 1. Obtener información del tema oficial mediante búsqueda estricta por ID
    let { data: tema } = await supabase
      .from('temas')
      .select('*')
      .eq('id', temaIdNum)
      .maybeSingle();

    if (!tema) {
      const temaRef = TEMAS_CAM.find((t) => Number(t.id) === temaIdNum);
      if (temaRef) {
        tema = { id: temaRef.id, titulo: temaRef.titulo, bloque: temaRef.bloque };
      }
    }

    if (!tema) {
      return NextResponse.json(
        { error: `No se encontró el Tema ${temaIdNum} en el temario oficial ni en la base de datos.` },
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

    // Si ya hay preguntas suficientes (>= 6) y no se solicita forzar generación adicional, devolver banco actual
    if (!forzarGeneracion && totalExistentes >= 6) {
      return NextResponse.json({
        ok: true,
        temaId,
        tema,
        preguntas: preguntasExistentes,
        nuevasGeneradas: 0,
        mensaje: `Banco cargado desde Supabase (${totalExistentes} preguntas existentes).`,
      });
    }

    // 3. Obtener texto del temario verificado (de Supabase o archivos locales PDF/TXT)
    const temarioInfo = await obtenerTextoTemario(temaIdNum, supabase);
    const textoBase = temarioInfo.texto;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel/servidor.',
          preguntas: preguntasExistentes || [],
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 4. Preparar filtro anti-duplicados exhaustivo
    const listaExclusion = preguntasExistentes && preguntasExistentes.length > 0
      ? preguntasExistentes
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.enunciado}${
                p.dato_clave_etiqueta ? ` [Dato clave: ${p.dato_clave_etiqueta}]` : ''
              }`
          )
          .join('\n')
      : 'Ninguna pregunta generada todavía en la base de datos para este tema.';

    const systemInstruction = `REGLA DE HIERRO ANTI-INTRUSIÓN: Estás generando preguntas EXCLUSIVAMENTE para el Tema ${tema.id}: '${tema.titulo}' del temario oficial de Bomberos de la Comunidad de Madrid.
1. Basa el 100% de las preguntas única y exclusivamente en el TEXTO DEL TEMARIO adjunto y en la materia estricta de '${tema.titulo}'.
2. Queda TERMINANTEMENTE PROHIBIDO mezclar materias de otros temas o usar plantillas genéricas de otras oposiciones (por ejemplo: prohibido preguntar Derechos Fundamentales o Art. 15 de la Constitución en el Tema 1 de Función Pública; prohibido mezclar temas distintos).
3. Antes de devolver el JSON, verifica una por una que cada pregunta pertenece inequívocamente a '${tema.titulo}'.

Actúa como Catedrático en Psicometría y Presidente del Tribunal Calificador de las oposiciones del Cuerpo de Bomberos de la Comunidad de Madrid (CAM).
Tu objetivo es generar un lote ultrarrápido y concentrado de EXACTAMENTE ${numGenerar} preguntas tipo test de 4 opciones de máxima exigencia discriminatoria basadas en el temario oficial del Tema ${tema.id}: ${tema.titulo}.

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

4. ENUNCIADOS NEGATIVOS (1 o 2 de las preguntas):
Al menos 1 o 2 preguntas deben buscar la opción falsa o incorrecta (ej.: "¿Cuál de las siguientes afirmaciones es INCORRECTA?", "Señale la opción que NO corresponde..."). Escribe siempre las palabras "NO", "INCORRECTA" o "EXCEPTO" en MAYÚSCULAS dentro del enunciado.

5. MATRIZ DE TRAMPAS BOMBEROS CAM:
- Si es LEGISLATIVO: Intercambia órganos (Consejo de Gobierno vs Asamblea), plazos (hábiles vs naturales), verbos modales (deberá vs podrá), mayorías.
- Si es TÉCNICO / FUEGO / HIDRÁULICA: Altera unidades (bar, MPa, m.c.a.), normas UNE/EN, euroclases de fuego, presiones/caudales, límites de inflamabilidad.
- Si es TERRITORIO CAM: Márgenes de ríos (derecha vs izquierda), cotas de Guadarrama, red viaria (Principal, Secundaria, Local), INFOMA.

6. CITA LITERAL EXACTA (cita_exacta):
Extrae una subcadena LITERAL e IDÉNTICA (copia exacta de entre 8 y 22 palabras, SIN asteriscos ** ni almohadillas #) que demuestre la respuesta.

7. EXPLICACIÓN DEL PROFESOR (explicacion_profesor):
Debe seguir OBLIGATORIAMENTE esta estructura pedagógica en 3 partes (usando saltos de línea claros y estos encabezados exactos):
- **✅ Por qué es la correcta:** Explicación directa citando el dato/norma exacta.
- **⚠️ Por qué fallan las demás (La Trampa):** Explicación explícita de por qué las otras opciones son falsas o qué trampa contienen.
- **🚒 Ejemplo práctico / Regla mnemotécnica:** Un caso práctico real de intervención de bomberos o un truco visual/mnemotécnico breve para no olvidarlo nunca.`;

    const promptUser = `TEMA NÚMERO: ${tema.id} - ${tema.titulo} (Bloque: ${tema.bloque})
FUENTE DEL TEMARIO: ${temarioInfo.fuente}

TEXTO OFICIAL DISPONIBLE DE ESTE TEMA:
${textoBase}

Genera EXACTAMENTE ${numGenerar} preguntas NUEVAS de nivel examen oficial para el Tema ${tema.id}: '${tema.titulo}' que no repitan ninguna de las existentes y pertenezcan 100% a este tema.

Devuelve ÚNICAMENTE un JSON válido con este formato:
{
  "preguntas": [
    {
      "enunciado": "Enunciado riguroso de examen...",
      "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "respuesta_correcta": 0,
      "explicacion_profesor": "**✅ Por qué es la correcta:** Explicación precisa...\\n\\n**⚠️ Por qué fallan las demás (La Trampa):** Desglose de trampas...\\n\\n**🚒 Ejemplo práctico / Regla mnemotécnica:** Caso de intervención o mnemotecnia...",
      "cita_exacta": "Frase literal idéntica sin formato...",
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
        temperature: 0.2,
      },
    });

    // Tracking de tokens consumidos y coste estimado en euros
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
      console.warn('Aviso registrando tokens en motor-tema:', e);
    }

    const responseText = response.text || '';
    let preguntasGeneradas: Array<{
      enunciado: string;
      opciones: string[];
      respuesta_correcta: number;
      explicacion_profesor: string;
      cita_exacta: string;
      dato_clave_etiqueta?: string;
    }> = [];
    let sintesisTemario: string | null = null;

    try {
      const parsed = JSON.parse(responseText);
      preguntasGeneradas = parsed.preguntas || [];
      if (parsed.contenido_sintesis_markdown) {
        sintesisTemario = parsed.contenido_sintesis_markdown;
      }
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        preguntasGeneradas = parsed.preguntas || [];
        if (parsed.contenido_sintesis_markdown) {
          sintesisTemario = parsed.contenido_sintesis_markdown;
        }
      }
    }

    if (!preguntasGeneradas || preguntasGeneradas.length === 0) {
      return NextResponse.json(
        {
          error: 'Gemini no devolvió preguntas válidas en esta llamada.',
          preguntas: preguntasExistentes || [],
        },
        { status: 500 }
      );
    }

    // Si Gemini generó la síntesis, guardarla en secciones_temario
    if (sintesisTemario) {
      await supabase
        .from('secciones_temario')
        .insert({
          tema_id: temaIdNum,
          epigrafe: `Contenido Oficial: ${tema.titulo}`,
          contenido_markdown: sintesisTemario,
          datos_criticos: [],
        });
    }

    // 5. Blindaje de seguridad: Filtrar preguntas intrusas antes de insertar
    const preguntasFiltradasSeguras = preguntasGeneradas.filter((p) => {
      if (!p.enunciado || p.enunciado.trim().length < 15) return false;
      if (!Array.isArray(p.opciones) || p.opciones.length < 4) return false;

      // Blindaje Tema 1 (La Función Pública): Prohibida Constitución Española o Art 15
      if (temaIdNum === 1) {
        const fullCheck = `${p.enunciado} ${p.opciones.join(' ')} ${p.explicacion_profesor || ''}`.toLowerCase();
        if (
          fullCheck.includes('constitución') ||
          fullCheck.includes('art. 15') ||
          fullCheck.includes('artículo 15') ||
          fullCheck.includes('integridad física') ||
          fullCheck.includes('tortura') ||
          fullCheck.includes('habeas corpus') ||
          fullCheck.includes('corona')
        ) {
          console.warn('⚠️ [motor-tema] Pregunta intrusa del Tema 1 descartada automáticamente:', p.enunciado);
          return false;
        }
      }
      return true;
    });

    if (preguntasFiltradasSeguras.length === 0) {
      return NextResponse.json(
        {
          error: 'Las preguntas generadas no superaron el filtro de coherencia temática anti-intrusión.',
          preguntas: preguntasExistentes || [],
        },
        { status: 500 }
      );
    }

    // Mapear e insertar el lote de preguntas seguras en Supabase
    const preguntasParaInsertar = preguntasFiltradasSeguras.slice(0, numGenerar).map((p) => ({
      tema_id: temaIdNum,
      seccion_id: null,
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
      console.error('Error insertando en Supabase preguntas:', errorInsert);
      return NextResponse.json(
        {
          error: `Error guardando en Supabase: ${errorInsert.message}. Revisa las políticas RLS.`,
          preguntasGeneradasEnMemoria: preguntasParaInsertar,
        },
        { status: 500 }
      );
    }

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
      mensaje: `¡Se han añadido +${insertadas?.length || 0} preguntas oficiales al banco de Supabase!`,
    });
  } catch (error: unknown) {
    console.error('Error no controlado en /api/motor-tema:', error);
    const msg = error instanceof Error ? error.message : 'Error interno en el motor de temas.';
    return NextResponse.json(
      { error: `Error del servidor: ${msg}` },
      { status: 500 }
    );
  }
}
