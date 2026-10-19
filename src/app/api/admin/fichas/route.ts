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

// GET: Obtener fichas reportadas y propuestas de imágenes para moderación
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const subfiltro = searchParams.get('subfiltro'); // 'reportadas' | 'imagenes' | 'todas'

    let query = supabase
      .from('fichas_tecnicas')
      .select('*, tema:temas(id, titulo, bloque)');

    if (subfiltro === 'reportadas') {
      query = query.eq('reportada_eliminar', true).order('votos_reporte', { ascending: false });
    } else if (subfiltro === 'imagenes') {
      query = query.eq('estado_propuesta', 'pendiente').order('created_at', { ascending: false });
    } else {
      query = query
        .or('reportada_eliminar.eq.true,estado_propuesta.eq.pendiente')
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fichas: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Eliminar ficha(s) técnica(s) permanentemente (solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ids, resetTotal } = body;

    const supabase = getSupabaseAdmin();

    if (resetTotal) {
      await supabase.from('usuario_fichas_srs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await supabase.from('fichas_tecnicas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mensaje: 'Banco de fichas técnicas reseteado por completo' });
    }

    const targetIds: string[] = ids || (id ? [id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'Falta el id o ids de fichas' }, { status: 400 });
    }

    // Eliminar dependencias en usuario_fichas_srs
    await supabase.from('usuario_fichas_srs').delete().in('ficha_id', targetIds);

    const { error } = await supabase
      .from('fichas_tecnicas')
      .delete()
      .in('id', targetIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      mensaje: `${targetIds.length} ficha(s) eliminada(s) con éxito`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al eliminar fichas';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Acciones de moderación en lote (Aprobar imágenes, Rechazar imágenes, Limpiar reportes)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion, ids } = body;

    if (!accion || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (accion === 'limpiar_reportes') {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          reportada_eliminar: false,
          votos_reporte: 0,
        })
        .in('id', ids);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mensaje: 'Reportes limpiados con éxito' });
    }

    if (accion === 'aprobar_imagenes') {
      // Para cada ficha seleccionada, copiar imagen_propuesta_url -> imagen_oficial_url y estado_propuesta = 'aprobada'
      const { data: fichasAprobar, error: fetchErr } = await supabase
        .from('fichas_tecnicas')
        .select('id, imagen_propuesta_url')
        .in('id', ids);

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

      for (const f of fichasAprobar || []) {
        if (f.imagen_propuesta_url) {
          await supabase
            .from('fichas_tecnicas')
            .update({
              imagen_oficial_url: f.imagen_propuesta_url,
              estado_propuesta: 'aprobada',
            })
            .eq('id', f.id);
        }
      }

      return NextResponse.json({ ok: true, mensaje: 'Imágenes aprobadas para todos' });
    }

    if (accion === 'rechazar_imagenes') {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          estado_propuesta: 'rechazada',
        })
        .in('id', ids);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mensaje: 'Imágenes rechazadas' });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno de moderación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Reportar ficha o proponer imagen (disponible para usuarios autenticados)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accion, fichaId, imagenUrl, email } = body;

    if (!accion || !fichaId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (accion === 'reportar') {
      const { data } = await supabase
        .from('fichas_tecnicas')
        .select('votos_reporte')
        .eq('id', fichaId)
        .single();

      const votos = (data?.votos_reporte || 0) + 1;

      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          reportada_eliminar: true,
          votos_reporte: votos,
        })
        .eq('id', fichaId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mensaje: 'Ficha reportada al administrador' });
    }

    if (accion === 'proponer_imagen') {
      if (!imagenUrl) {
        return NextResponse.json({ error: 'Falta imagenUrl' }, { status: 400 });
      }

      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({
          imagen_propuesta_url: imagenUrl,
          estado_propuesta: 'pendiente',
          propuesta_por_email: email || null,
        })
        .eq('id', fichaId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, mensaje: 'Propuesta de imagen enviada al administrador' });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno al procesar solicitud';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
