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

// GET: Obtener lista completa de usuarios con métricas para admin
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: perfiles, error } = await supabase
      .from('perfiles_usuarios')
      .select('*')
      .order('ultima_conexion', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, perfiles: perfiles || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Bloquear / Desbloquear usuario
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, bloquear } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('perfiles_usuarios')
      .update({ bloqueado: Boolean(bloquear) })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bloqueado: Boolean(bloquear) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al actualizar usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Eliminar usuario y sus datos asociados
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Falta userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Eliminar datos relacionados
    await supabase.from('usuario_progreso_srs').delete().eq('user_id', userId);
    await supabase.from('usuario_fichas_srs').delete().eq('user_id', userId);
    await supabase.from('historial_sesiones').delete().eq('user_id', userId);

    const { error } = await supabase
      .from('perfiles_usuarios')
      .delete()
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al eliminar usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
