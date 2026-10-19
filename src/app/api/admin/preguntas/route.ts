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

// DELETE: Eliminar pregunta permanentemente
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el id de la pregunta' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Eliminar también registros dependientes en usuario_progreso_srs si no tienen ON DELETE CASCADE
    await supabase.from('usuario_progreso_srs').delete().eq('pregunta_id', id);

    const { error } = await supabase
      .from('preguntas')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: 'Pregunta eliminada con éxito' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al eliminar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Resetear votos de una pregunta
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Falta el id de la pregunta' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('preguntas')
      .update({
        votos_buena: 0,
        votos_regular: 0,
        votos_mala: 0,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: 'Votos reseteados a 0' });
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
