import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function getSupabaseAdmin() {
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

// GET: Obtener preguntas para el panel de administración
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const temaId = searchParams.get('temaId');
    const filtro = searchParams.get('filtro'); // 'malas', 'regulares', 'buenas', 'todas'

    let query = supabase
      .from('preguntas')
      .select('*, tema:temas(id, titulo, bloque)');

    if (temaId && temaId !== 'all') {
      const parsedTema = parseInt(temaId, 10);
      if (!isNaN(parsedTema)) {
        query = query.eq('tema_id', parsedTema);
      }
    }

    if (filtro === 'malas') {
      query = query.gt('votos_mala', 0).order('votos_mala', { ascending: false });
    } else if (filtro === 'regulares') {
      query = query.gt('votos_regular', 0).order('votos_regular', { ascending: false });
    } else if (filtro === 'buenas') {
      query = query.gt('votos_buena', 0).order('votos_buena', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, preguntas: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Eliminar pregunta(s) permanentemente o autolimpieza de intrusas
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids, limpiarIntrusasTema1 } = body;
    const supabase = getSupabaseAdmin();

    if (limpiarIntrusasTema1) {
      const { data: preguntasTema1, error: errFetch } = await supabase
        .from('preguntas')
        .select('id, enunciado, opciones, explicacion_profesor, dato_clave_etiqueta')
        .eq('tema_id', 1);

      if (errFetch) {
        return NextResponse.json({ error: errFetch.message }, { status: 500 });
      }

      const terminosIntrusos = [
        'constitución',
        'constitucion',
        'art. 15',
        'artículo 15',
        'articulo 15',
        'integridad física',
        'integridad fisica',
        'tortura',
        'habeas corpus',
        'corona',
      ];

      const intrusas = (preguntasTema1 || []).filter((p) => {
        const full = `${p.enunciado} ${(p.opciones || []).join(' ')} ${p.explicacion_profesor || ''} ${p.dato_clave_etiqueta || ''}`.toLowerCase();
        return terminosIntrusos.some((term) => full.includes(term));
      });

      const idsIntrusas = intrusas.map((p) => p.id);

      if (idsIntrusas.length > 0) {
        await supabase.from('usuario_progreso_srs').delete().in('pregunta_id', idsIntrusas);
        await supabase.from('preguntas').delete().in('id', idsIntrusas);
      }

      return NextResponse.json({
        ok: true,
        eliminadas: idsIntrusas.length,
        mensaje: `Se han purgado ${idsIntrusas.length} preguntas intrusas de la Constitución en el Tema 1.`,
      });
    }

    const targetIds: string[] = ids || (id ? [id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Falta el id o ids de preguntas' }, { status: 400 });
    }

    // Eliminar también registros dependientes en usuario_progreso_srs si no tienen ON DELETE CASCADE
    await supabase.from('usuario_progreso_srs').delete().in('pregunta_id', targetIds);

    const { error } = await supabase
      .from('preguntas')
      .delete()
      .in('id', targetIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: `${targetIds.length} pregunta(s) eliminada(s) con éxito` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al eliminar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Resetear votos de pregunta(s)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids } = body;
    const targetIds: string[] = ids || (id ? [id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Falta el id o ids de preguntas' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('preguntas')
      .update({
        votos_buena: 0,
        votos_regular: 0,
        votos_mala: 0,
      })
      .in('id', targetIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: `Votos reseteados a 0 para ${targetIds.length} pregunta(s)` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al resetear votos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Votar pregunta (incrementar +1)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { preguntaId, tipo } = body;

    if (!preguntaId || !tipo || !['buena', 'regular', 'mala'].includes(tipo)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const columna = tipo === 'buena' ? 'votos_buena' : tipo === 'regular' ? 'votos_regular' : 'votos_mala';
    const supabase = getSupabaseAdmin();

    const { data: preg, error: fetchErr } = await supabase
      .from('preguntas')
      .select('votos_buena, votos_regular, votos_mala')
      .eq('id', preguntaId)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 404 });
    }

    const actual = (preg as Record<string, number>)?.[columna] || 0;
    const { error: updateErr } = await supabase
      .from('preguntas')
      .update({ [columna]: actual + 1 })
      .eq('id', preguntaId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, nuevoValor: actual + 1 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al votar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
