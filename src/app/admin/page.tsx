'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldAlert,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  ThumbsDown,
  ThumbsUp,
  Meh,
  Sparkles,
  Users,
  HardDrive,
  Eye,
  Ban,
  UserCheck,
  Crown,
  Database,
  Image as ImageIcon,
  RefreshCw,
  Coins,
  Cpu,
  CheckSquare,
  Square,
  Zap,
  Globe,
  X,
  Check,
} from 'lucide-react';
import { Pregunta, Tema, PerfilUsuario, UsoMemoriaSupabase, FichaTecnica } from '@/lib/types';
import {
  getTemas,
  getPreguntas,
  eliminarPregunta,
  resetearVotosPregunta,
  getPerfilesUsuariosAdmin,
  toggleBloquearUsuario,
  eliminarPerfilUsuario,
  getUsoMemoriaSupabase,
  eliminarPreguntasMasivo,
  resetearVotosPreguntasMasivo,
  getFichasModeracionAdmin,
  eliminarFichasMasivo,
  limpiarReportesFichasMasivo,
  aprobarImagenesPropuestasMasivo,
  rechazarImagenesPropuestasMasivo,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

type TabPrincipal = 'usuarios' | 'memoria' | 'moderacion' | 'fichas';
type PestañaFiltroPreguntas = 'malas' | 'regulares' | 'buenas' | 'todas';
type SubfiltroFichas = 'reportadas' | 'imagenes';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFecha(fechaStr?: string | null): string {
  if (!fechaStr) return 'Nunca';
  try {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fechaStr;
  }
}

export default function AdminPage() {
  const { user, esAdmin, loading: authLoading, startImpersonation } = useAuth();
  const router = useRouter();

  // Navegación de pestañas principales del Admin
  const [tabActiva, setTabActiva] = useState<TabPrincipal>('usuarios');

  // Estado pestaña 1: Usuarios
  const [usuarios, setUsuarios] = useState<PerfilUsuario[]>([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  // Estado pestaña 2: Control de Memoria
  const [memoria, setMemoria] = useState<UsoMemoriaSupabase | null>(null);
  const [cargandoMemoria, setCargandoMemoria] = useState(false);

  // Estado pestaña 3: Moderación de Preguntas
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [pestañaModeracion, setPestañaModeracion] = useState<PestañaFiltroPreguntas>('malas');
  const [temaSeleccionado, setTemaSeleccionado] = useState<number | 'all'>('all');
  const [busquedaPregunta, setBusquedaPregunta] = useState('');
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false);
  const [seleccionadasPreguntas, setSeleccionadasPreguntas] = useState<string[]>([]);

  // Estado pestaña 4: Moderación de Fichas Anki
  const [fichasModeracion, setFichasModeracion] = useState<FichaTecnica[]>([]);
  const [cargandoFichasModeracion, setCargandoFichasModeracion] = useState(false);
  const [subfiltroFichas, setSubfiltroFichas] = useState<SubfiltroFichas>('reportadas');
  const [seleccionadasFichas, setSeleccionadasFichas] = useState<string[]>([]);

  // Estado general de acciones y notificaciones
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [mensajeToast, setMensajeToast] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: 'exito' | 'error' = 'exito') => {
    setMensajeToast({ tipo, texto });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  // 1. Proteger ruta: redirigir a '/' si no es admin
  useEffect(() => {
    if (!authLoading && !esAdmin) {
      router.push('/');
    }
  }, [authLoading, esAdmin, router]);

  // 2. Cargar datos iniciales de administración
  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const data = await getPerfilesUsuariosAdmin();
      setUsuarios(data);
    } catch (e) {
      console.error('Error cargando usuarios:', e);
      mostrarToast('Error cargando lista de usuarios', 'error');
    } finally {
      setCargandoUsuarios(false);
    }
  };

  const cargarMemoria = async () => {
    setCargandoMemoria(true);
    try {
      const data = await getUsoMemoriaSupabase();
      setMemoria(data);
    } catch (e) {
      console.error('Error cargando memoria:', e);
      mostrarToast('Error calculando uso de memoria', 'error');
    } finally {
      setCargandoMemoria(false);
    }
  };

  const cargarPreguntasYTemas = async () => {
    setCargandoPreguntas(true);
    try {
      const [listaTemas, listaPreguntas] = await Promise.all([
        getTemas(),
        getPreguntas(),
      ]);
      setTemas(listaTemas);
      setPreguntas(listaPreguntas);
    } catch (e) {
      console.error('Error cargando preguntas:', e);
      mostrarToast('Error cargando preguntas', 'error');
    } finally {
      setCargandoPreguntas(false);
    }
  };

  const cargarFichasModeracion = async () => {
    setCargandoFichasModeracion(true);
    try {
      const data = await getFichasModeracionAdmin();
      setFichasModeracion(data);
    } catch (e) {
      console.error('Error cargando fichas moderación:', e);
      mostrarToast('Error cargando fichas a moderar', 'error');
    } finally {
      setCargandoFichasModeracion(false);
    }
  };

  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios();
      cargarMemoria();
      cargarPreguntasYTemas();
      cargarFichasModeracion();
    }
  }, [esAdmin]);

  // Acciones de usuarios
  const handleActivarModoDios = (targetUser: PerfilUsuario) => {
    startImpersonation(targetUser);
    mostrarToast(`⚡ Modo Dios activado: viendo la app como ${targetUser.nombre || targetUser.email}`);
    router.push('/');
  };

  const handleToggleBloquear = async (targetUser: PerfilUsuario) => {
    const nuevoEstado = !targetUser.bloqueado;
    setAccionEnCurso(targetUser.id);
    try {
      const res = await toggleBloquearUsuario(targetUser.id, nuevoEstado);
      if (res.ok) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, bloqueado: nuevoEstado } : u))
        );
        mostrarToast(
          nuevoEstado
            ? `🚫 Usuario ${targetUser.nombre || targetUser.email} bloqueado.`
            : `✅ Usuario ${targetUser.nombre || targetUser.email} desbloqueado.`
        );
      } else {
        mostrarToast(res.error || 'Error cambiando estado de bloqueo', 'error');
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error en la operación', 'error');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleEliminarUsuario = async (targetUser: PerfilUsuario) => {
    const seguro = window.confirm(
      `¿Estás seguro de eliminar DEFINITIVAMENTE a ${targetUser.nombre || targetUser.email}?\n\nEsta acción borrará todo su progreso, notas mnemotécnicas e imágenes.`
    );
    if (!seguro) return;

    setAccionEnCurso(targetUser.id);
    try {
      setUsuarios((prev) => prev.filter((u) => u.id !== targetUser.id));
      const res = await eliminarPerfilUsuario(targetUser.id);
      if (res.ok) {
        mostrarToast('Usuario eliminado correctamente.');
        cargarMemoria();
      } else {
        mostrarToast(res.error || 'No se pudo eliminar el usuario', 'error');
        cargarUsuarios();
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error al eliminar usuario', 'error');
      cargarUsuarios();
    } finally {
      setAccionEnCurso(null);
    }
  };

  // Acciones de preguntas individuales
  const handleEliminarPregunta = async (id: string, enunciado: string) => {
    const seguro = window.confirm(
      `¿Seguro que deseas eliminar definitivamente esta pregunta?\n\n"${enunciado.slice(0, 80)}..."`
    );
    if (!seguro) return;

    setAccionEnCurso(id);
    try {
      setPreguntas((prev) => prev.filter((p) => p.id !== id));
      const res = await eliminarPregunta(id);
      if (res.ok) {
        mostrarToast('Pregunta eliminada de la base de datos.');
      } else {
        mostrarToast(res.error || 'No se pudo eliminar la pregunta.', 'error');
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error al eliminar pregunta.', 'error');
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleResetearVotos = async (id: string) => {
    setAccionEnCurso(id);
    try {
      setPreguntas((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, votos_buena: 0, votos_regular: 0, votos_mala: 0 } : p
        )
      );
      const res = await resetearVotosPregunta(id);
      if (res.ok) {
        mostrarToast('Votos reseteados a 0.');
      } else {
        mostrarToast(res.error || 'Error reseteando votos.', 'error');
      }
    } catch (e) {
      console.error(e);
      mostrarToast('Error al resetear votos.', 'error');
    } finally {
      setAccionEnCurso(null);
    }
  };

  // ACCIONES MASIVAS: PREGUNTAS
  const handleToggleSeleccionPregunta = (id: string) => {
    setSeleccionadasPreguntas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSeleccionarTodasPreguntasVisibles = (ids: string[]) => {
    if (seleccionadasPreguntas.length === ids.length) {
      setSeleccionadasPreguntas([]);
    } else {
      setSeleccionadasPreguntas(ids);
    }
  };

  const handleEliminarPreguntasMasivo = async () => {
    if (seleccionadasPreguntas.length === 0) return;
    const confirmacion = window.confirm(
      `¿Deseas ELIMINAR DEFINITIVAMENTE las ${seleccionadasPreguntas.length} preguntas seleccionadas de la base de datos?`
    );
    if (!confirmacion) return;

    const idsParaEliminar = [...seleccionadasPreguntas];
    setAccionEnCurso('masivo_preguntas');
    try {
      setPreguntas((prev) => prev.filter((p) => !idsParaEliminar.includes(p.id)));
      setSeleccionadasPreguntas([]);
      const res = await eliminarPreguntasMasivo(idsParaEliminar);
      if (res.ok) {
        mostrarToast(`¡${idsParaEliminar.length} preguntas eliminadas con éxito!`);
      } else {
        mostrarToast(res.error || 'Error en borrado masivo', 'error');
        cargarPreguntasYTemas();
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleResetearVotosPreguntasMasivo = async () => {
    if (seleccionadasPreguntas.length === 0) return;
    const idsParaReset = [...seleccionadasPreguntas];
    setAccionEnCurso('masivo_preguntas');
    try {
      setPreguntas((prev) =>
        prev.map((p) =>
          idsParaReset.includes(p.id)
            ? { ...p, votos_buena: 0, votos_regular: 0, votos_mala: 0 }
            : p
        )
      );
      setSeleccionadasPreguntas([]);
      const res = await resetearVotosPreguntasMasivo(idsParaReset);
      if (res.ok) {
        mostrarToast(`¡Votos limpiados para ${idsParaReset.length} preguntas!`);
      } else {
        mostrarToast(res.error || 'Error al limpiar votos', 'error');
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  // ACCIONES MASIVAS: FICHAS ANKI
  const handleToggleSeleccionFicha = (id: string) => {
    setSeleccionadasFichas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSeleccionarTodasFichasVisibles = (ids: string[]) => {
    if (seleccionadasFichas.length === ids.length) {
      setSeleccionadasFichas([]);
    } else {
      setSeleccionadasFichas(ids);
    }
  };

  const handleEliminarFichasMasivo = async () => {
    if (seleccionadasFichas.length === 0) return;
    const confirmacion = window.confirm(
      `¿Deseas ELIMINAR DEFINITIVAMENTE las ${seleccionadasFichas.length} fichas seleccionadas de la base de datos para TODOS?`
    );
    if (!confirmacion) return;

    const idsParaEliminar = [...seleccionadasFichas];
    setAccionEnCurso('masivo_fichas');
    try {
      setFichasModeracion((prev) => prev.filter((f) => !idsParaEliminar.includes(f.id)));
      setSeleccionadasFichas([]);
      const res = await eliminarFichasMasivo(idsParaEliminar);
      if (res.ok) {
        mostrarToast(`¡${idsParaEliminar.length} fichas eliminadas con éxito!`);
      } else {
        mostrarToast(res.error || 'Error al eliminar fichas', 'error');
        cargarFichasModeracion();
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleLimpiarReportesFichasMasivo = async () => {
    if (seleccionadasFichas.length === 0) return;
    const ids = [...seleccionadasFichas];
    setAccionEnCurso('masivo_fichas');
    try {
      setFichasModeracion((prev) =>
        prev.filter((f) => !ids.includes(f.id) || f.estado_propuesta === 'pendiente')
      );
      setSeleccionadasFichas([]);
      const res = await limpiarReportesFichasMasivo(ids);
      if (res.ok) {
        mostrarToast(`¡Reportes limpiados para ${ids.length} fichas!`);
      } else {
        mostrarToast(res.error || 'Error al limpiar reportes', 'error');
        cargarFichasModeracion();
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleAprobarImagenesMasivo = async () => {
    if (seleccionadasFichas.length === 0) return;
    const ids = [...seleccionadasFichas];
    setAccionEnCurso('masivo_fichas');
    try {
      setFichasModeracion((prev) =>
        prev.filter((f) => !ids.includes(f.id) || f.reportada_eliminar)
      );
      setSeleccionadasFichas([]);
      const res = await aprobarImagenesPropuestasMasivo(ids);
      if (res.ok) {
        mostrarToast(`¡Imágenes aprobadas para todos (${ids.length} fichas)!`);
      } else {
        mostrarToast(res.error || 'Error aprobando imágenes', 'error');
        cargarFichasModeracion();
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleRechazarImagenesMasivo = async () => {
    if (seleccionadasFichas.length === 0) return;
    const ids = [...seleccionadasFichas];
    setAccionEnCurso('masivo_fichas');
    try {
      setFichasModeracion((prev) =>
        prev.filter((f) => !ids.includes(f.id) || f.reportada_eliminar)
      );
      setSeleccionadasFichas([]);
      const res = await rechazarImagenesPropuestasMasivo(ids);
      if (res.ok) {
        mostrarToast(`¡Imágenes rechazadas (${ids.length})!`);
      } else {
        mostrarToast(res.error || 'Error rechazando imágenes', 'error');
        cargarFichasModeracion();
      }
    } finally {
      setAccionEnCurso(null);
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = useMemo(() => {
    if (!busquedaUsuario.trim()) return usuarios;
    const q = busquedaUsuario.toLowerCase();
    return usuarios.filter(
      (u) =>
        (u.nombre && u.nombre.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [usuarios, busquedaUsuario]);

  // Ranking de almacenamiento de usuarios
  const rankingMemoriaUsuarios = useMemo(() => {
    return [...usuarios]
      .filter((u) => (u.bytes_almacenamiento || 0) > 0)
      .sort((a, b) => (b.bytes_almacenamiento || 0) - (a.bytes_almacenamiento || 0));
  }, [usuarios]);

  // Métricas de preguntas
  const metricasGlobales = useMemo(() => {
    const totalTokens = usuarios.reduce((acc, u) => acc + (u.tokens_consumidos || 0), 0);
    const totalCoste = usuarios.reduce((acc, u) => acc + (u.coste_estimado_eur || 0), 0);
    const totalBytesStorage = usuarios.reduce((acc, u) => acc + (u.bytes_almacenamiento || 0), 0);
    let malas = 0;
    let regulares = 0;
    let buenas = 0;
    preguntas.forEach((p) => {
      if ((p.votos_mala || 0) > 0) malas++;
      if ((p.votos_regular || 0) > 0) regulares++;
      if ((p.votos_buena || 0) > 0) buenas++;
    });

    const reportadasFichas = fichasModeracion.filter((f) => f.reportada_eliminar).length;
    const propuestasImagenes = fichasModeracion.filter((f) => f.estado_propuesta === 'pendiente').length;

    return {
      totalUsuarios: usuarios.length,
      totalTokens,
      totalCoste,
      totalBytesStorage,
      malas,
      regulares,
      buenas,
      preguntasTotal: preguntas.length,
      reportadasFichas,
      propuestasImagenes,
    };
  }, [usuarios, preguntas, fichasModeracion]);

  // Filtrado de preguntas
  const preguntasFiltradas = useMemo(() => {
    return preguntas
      .filter((p) => {
        if (temaSeleccionado !== 'all' && p.tema_id !== temaSeleccionado) return false;
        if (pestañaModeracion === 'malas' && (p.votos_mala || 0) === 0) return false;
        if (pestañaModeracion === 'regulares' && (p.votos_regular || 0) === 0) return false;
        if (pestañaModeracion === 'buenas' && (p.votos_buena || 0) === 0) return false;
        if (busquedaPregunta.trim() !== '') {
          const q = busquedaPregunta.toLowerCase();
          const enun = p.enunciado.toLowerCase();
          const expl = (p.explicacion_profesor || '').toLowerCase();
          if (!enun.includes(q) && !expl.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (pestañaModeracion === 'malas') return (b.votos_mala || 0) - (a.votos_mala || 0);
        if (pestañaModeracion === 'regulares') return (b.votos_regular || 0) - (a.votos_regular || 0);
        if (pestañaModeracion === 'buenas') return (b.votos_buena || 0) - (a.votos_buena || 0);
        return 0;
      });
  }, [preguntas, pestañaModeracion, temaSeleccionado, busquedaPregunta]);

  // Filtrado de fichas anki para moderación
  const fichasFiltradas = useMemo(() => {
    if (subfiltroFichas === 'reportadas') {
      return fichasModeracion.filter((f) => f.reportada_eliminar);
    }
    return fichasModeracion.filter((f) => f.estado_propuesta === 'pendiente');
  }, [fichasModeracion, subfiltroFichas]);

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh]">
        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-slate-600 mt-3">
          Verificando credenciales de Superadministrador...
        </span>
      </div>
    );
  }

  if (!esAdmin) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-[100dvh] pb-28 px-4 pt-3 space-y-4 animate-fadeIn relative">
      {/* Toast Notification */}
      {mensajeToast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] text-xs font-bold animate-slideDown ${
            mensajeToast.tipo === 'exito'
              ? 'bg-emerald-100 text-emerald-950'
              : 'bg-rose-100 text-rose-950'
          }`}
        >
          {mensajeToast.tipo === 'exito' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          )}
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* 1. CABECERA ADMIN */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white border-2 border-slate-900 text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shadow-[2px_2px_0px_0px_#0f172a]"
            aria-label="Volver al temario"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>Zona Superadministrador</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Control de usuarios, memoria, moderación masiva de preguntas y fichas
            </p>
          </div>
        </div>

        <Link
          href="/admin/ingesta"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-amber-700" />
          <span>Ingesta</span>
        </Link>
      </header>

      {/* 2. PESTAÑAS PRINCIPALES DEL SUPERADMIN (4 COLUMNAS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-200/90 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
        <button
          onClick={() => setTabActiva('usuarios')}
          className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            tabActiva === 'usuarios'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-900/40'
              : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-600" />
          <span>👥 Usuarios ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setTabActiva('memoria')}
          className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            tabActiva === 'memoria'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-900/40'
              : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5 text-purple-600" />
          <span>💾 Memoria</span>
        </button>

        <button
          onClick={() => setTabActiva('moderacion')}
          className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            tabActiva === 'moderacion'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-900/40'
              : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
          <span>❓ Preguntas ({metricasGlobales.malas})</span>
        </button>

        <button
          onClick={() => setTabActiva('fichas')}
          className={`py-2 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            tabActiva === 'fichas'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-900/40'
              : 'text-slate-700 hover:bg-white/50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span>⚡ Fichas ({metricasGlobales.reportadasFichas + metricasGlobales.propuestasImagenes})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USUARIOS Y MODO DIOS                               */}
      {/* ========================================================= */}
      {tabActiva === 'usuarios' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Métricas rápidas de usuarios */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">
                Total Registrados
              </span>
              <span className="text-xl font-black font-mono text-slate-900">
                {usuarios.length}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">
                Tokens IA Consumidos
              </span>
              <span className="text-xl font-black font-mono text-blue-600">
                {(metricasGlobales.totalTokens / 1000).toFixed(1)}k
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono block">
                Coste Estimado Gemini
              </span>
              <span className="text-xl font-black font-mono text-emerald-600">
                {metricasGlobales.totalCoste.toFixed(3)} €
              </span>
            </div>
          </div>

          {/* Buscador de usuarios */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              placeholder="Buscar opositor por nombre o email..."
              className="w-full bg-white border-2 border-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-medium shadow-[2px_2px_0px_0px_#0f172a]"
            />
          </div>

          {/* Lista de usuarios */}
          <div className="space-y-2">
            {cargandoUsuarios ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Cargando lista de usuarios...
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border-2 border-slate-900">
                No se encontraron usuarios.
              </div>
            ) : (
              usuariosFiltrados.map((u) => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    u.bloqueado ? 'bg-rose-50/70 border-rose-900' : ''
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {u.nombre || 'Opositor sin nombre'}
                      </span>
                      {u.es_admin && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-mono text-[9px] font-bold border border-amber-400">
                          ADMIN
                        </span>
                      )}
                      {u.bloqueado && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 font-mono text-[9px] font-bold border border-rose-400">
                          BLOQUEADO
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {u.email}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono pt-0.5">
                      <span>Tokens: {u.tokens_consumidos || 0}</span>
                      <span>·</span>
                      <span>Espacio: {formatBytes(u.bytes_almacenamiento || 0)}</span>
                      <span>·</span>
                      <span>Última vez: {formatFecha(u.ultima_conexion)}</span>
                    </div>
                  </div>

                  {/* Botones de acción rápida por usuario */}
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                    <button
                      onClick={() => handleActivarModoDios(u)}
                      disabled={u.id === user?.id}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold text-xs border border-slate-900 shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title="Suplantar a este usuario y ver la app exactamente como él"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Modo Dios</span>
                    </button>

                    <button
                      onClick={() => handleToggleBloquear(u)}
                      disabled={u.id === user?.id || accionEnCurso === u.id}
                      className={`p-1.5 rounded-lg border border-slate-900 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                        u.bloqueado
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                      title={u.bloqueado ? 'Desbloquear usuario' : 'Bloquear usuario'}
                    >
                      {u.bloqueado ? <UserCheck className="w-4 h-4 text-emerald-700" /> : <Ban className="w-4 h-4 text-rose-600" />}
                    </button>

                    <button
                      onClick={() => handleEliminarUsuario(u)}
                      disabled={u.id === user?.id || accionEnCurso === u.id}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-slate-900 text-rose-700 transition-all cursor-pointer disabled:opacity-40"
                      title="Eliminar usuario definitivamente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CONTROL DE MEMORIA Y ALMACENAMIENTO SUPABASE       */}
      {/* ========================================================= */}
      {tabActiva === 'memoria' && (
        <div className="space-y-4 animate-fadeIn">
          {cargandoMemoria ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Calculando uso real de disco y Supabase Storage...
            </div>
          ) : memoria ? (
            <>
              {/* Tarjetas de Uso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Base de datos PostgreSQL */}
                <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-600" />
                      Base de Datos (PostgreSQL)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {memoria.dbMB} MB / {memoria.dbMaxMB} MB
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-900 flex">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${Math.min(100, (memoria.dbMB / memoria.dbMaxMB) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-slate-500 font-medium">
                    <span>{((memoria.dbMB / memoria.dbMaxMB) * 100).toFixed(1)}% ocupado</span>
                    <span>Quedan {(memoria.dbMaxMB - memoria.dbMB).toFixed(1)} MB libres</span>
                  </div>
                </div>

                {/* 2. Supabase Storage (Fotos WebP) */}
                <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      Storage (Fotos Comprimidas)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      {memoria.storageMB} MB / {memoria.storageMaxMB} MB
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-900 flex">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${Math.min(100, (memoria.storageMB / memoria.storageMaxMB) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-slate-500 font-medium">
                    <span>{((memoria.storageMB / memoria.storageMaxMB) * 100).toFixed(1)}% ocupado</span>
                    <span>Quedan {(memoria.storageMaxMB - memoria.storageMB).toFixed(1)} MB libres</span>
                  </div>
                </div>
              </div>

              {/* Ranking de usuarios por consumo de almacenamiento */}
              <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Ranking de Usuarios por Consumo de Fotos
                  </h3>
                  <button
                    onClick={cargarMemoria}
                    className="text-xs text-slate-600 hover:text-slate-950 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recalcular</span>
                  </button>
                </div>

                {rankingMemoriaUsuarios.length === 0 ? (
                  <p className="text-xs text-slate-500">Ningún usuario ha subido fotos aún.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {rankingMemoriaUsuarios.map((u, idx) => (
                      <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 truncate">
                            {u.nombre || u.email}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-purple-700">
                          {formatBytes(u.bytes_almacenamiento || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MODERACIÓN MASIVA DE PREGUNTAS                     */}
      {/* ========================================================= */}
      {tabActiva === 'moderacion' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Métricas y filtros de votos */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setPestañaModeracion('malas')}
              className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                pestañaModeracion === 'malas'
                  ? 'bg-rose-100 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-white border-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-base font-black text-rose-700">{metricasGlobales.malas}</span>
              <span className="block text-[10px] text-slate-600 font-bold uppercase mt-0.5">
                👎 Malas
              </span>
            </button>

            <button
              onClick={() => setPestañaModeracion('regulares')}
              className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                pestañaModeracion === 'regulares'
                  ? 'bg-amber-100 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-white border-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-base font-black text-amber-700">{metricasGlobales.regulares}</span>
              <span className="block text-[10px] text-slate-600 font-bold uppercase mt-0.5">
                😐 Regulares
              </span>
            </button>

            <button
              onClick={() => setPestañaModeracion('buenas')}
              className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                pestañaModeracion === 'buenas'
                  ? 'bg-emerald-100 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-white border-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-base font-black text-emerald-700">{metricasGlobales.buenas}</span>
              <span className="block text-[10px] text-slate-600 font-bold uppercase mt-0.5">
                👍 Buenas
              </span>
            </button>

            <button
              onClick={() => setPestañaModeracion('todas')}
              className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                pestañaModeracion === 'todas'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                  : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className={`text-base font-black ${pestañaModeracion === 'todas' ? 'text-white' : 'text-slate-900'}`}>
                {metricasGlobales.preguntasTotal}
              </span>
              <span className={`block text-[10px] font-bold uppercase mt-0.5 ${pestañaModeracion === 'todas' ? 'text-slate-300' : 'text-slate-600'}`}>
                Todas
              </span>
            </button>
          </div>

          {/* Filtros de tema, buscador y botón de selección masiva */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={temaSeleccionado}
              onChange={(e) =>
                setTemaSeleccionado(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
              }
              className="w-full bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden cursor-pointer"
            >
              <option value="all">📚 Todos los Temas (1 al 35)</option>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  Tema {t.id}: {t.titulo.slice(0, 35)}...
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaPregunta}
                onChange={(e) => setBusquedaPregunta(e.target.value)}
                placeholder="Buscar por texto de pregunta..."
                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Barra superior de Selección Masiva */}
          {preguntasFiltradas.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleSeleccionarTodasPreguntasVisibles(preguntasFiltradas.map((p) => p.id))
                }
                className="font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                {seleccionadasPreguntas.length === preguntasFiltradas.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>
                  {seleccionadasPreguntas.length === preguntasFiltradas.length
                    ? 'Desmarcar todas'
                    : '☑️ Seleccionar todas las visibles'}
                </span>
              </button>

              <span className="font-mono text-slate-600 font-bold text-[11px]">
                {seleccionadasPreguntas.length} seleccionadas de {preguntasFiltradas.length}
              </span>
            </div>
          )}

          {/* Lista de preguntas con checkboxes */}
          {cargandoPreguntas ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Cargando preguntas...
            </div>
          ) : preguntasFiltradas.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">
                No hay preguntas con este filtro.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {preguntasFiltradas.map((p) => {
                const seleccionada = seleccionadasPreguntas.includes(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] bg-white space-y-3 transition-all ${
                      seleccionada ? 'bg-amber-50/80 ring-2 ring-slate-950' : ''
                    }`}
                  >
                    {/* Encabezado: Checkbox + Tema + Votos */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          onChange={() => handleToggleSeleccionPregunta(p.id)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-400 cursor-pointer"
                        />
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold">
                          Tema {p.tema_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px] font-black">
                        {(p.votos_mala || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-300 flex items-center gap-1">
                            <ThumbsDown className="w-3 h-3" />
                            {p.votos_mala}
                          </span>
                        )}
                        {(p.votos_regular || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Meh className="w-3 h-3" />
                            {p.votos_regular}
                          </span>
                        )}
                        {(p.votos_buena || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {p.votos_buena}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Enunciado */}
                    <p className="text-xs font-extrabold text-slate-900 leading-snug">
                      {p.enunciado}
                    </p>

                    {/* Opciones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {p.opciones.map((opcion, idx) => {
                        const esCorrecta = idx === p.respuesta_correcta;
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-[11px] font-medium border flex items-start gap-1.5 ${
                              esCorrecta
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-mono uppercase font-black shrink-0">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className="leading-tight">{opcion}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Acciones individuales */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400">ID: {p.id.slice(0, 8)}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleResetearVotos(p.id)}
                          disabled={accionEnCurso === p.id}
                          className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all shadow-[1px_1px_0px_0px_#0f172a] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-600" />
                          <span>🧹 Resetear votos</span>
                        </button>

                        <button
                          onClick={() => handleEliminarPregunta(p.id, p.enunciado)}
                          disabled={accionEnCurso === p.id}
                          className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-[1px_1px_0px_0px_#0f172a] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                          <span>🗑️ Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* BARRA FLOTANTE DE ACCIÓN MASIVA PARA PREGUNTAS */}
          {seleccionadasPreguntas.length > 0 && (
            <div className="fixed bottom-16 sm:bottom-18 left-0 right-0 z-40 px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-150">
              <div className="max-w-xl mx-auto pointer-events-auto p-3 rounded-2xl bg-slate-950 text-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {seleccionadasPreguntas.length} preguntas seleccionadas
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetearVotosPreguntasMasivo}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold border border-slate-900 cursor-pointer transition-all"
                  >
                    🧹 Limpiar votos ({seleccionadasPreguntas.length})
                  </button>

                  <button
                    onClick={handleEliminarPreguntasMasivo}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold border border-white/20 cursor-pointer transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar ({seleccionadasPreguntas.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MODERACIÓN DE FICHAS ANKI E IMÁGENES PROPUESTAS    */}
      {/* ========================================================= */}
      {tabActiva === 'fichas' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Sub-filtros: Reportadas vs Imágenes Propuestas */}
          <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-100 p-1 gap-1">
            <button
              onClick={() => {
                setSubfiltroFichas('reportadas');
                setSeleccionadasFichas([]);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subfiltroFichas === 'reportadas'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>🚩 Fichas Reportadas ({metricasGlobales.reportadasFichas})</span>
            </button>

            <button
              onClick={() => {
                setSubfiltroFichas('imagenes');
                setSeleccionadasFichas([]);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subfiltroFichas === 'imagenes'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>🖼️ Imágenes Propuestas ({metricasGlobales.propuestasImagenes})</span>
            </button>
          </div>

          {/* Barra superior de Selección Masiva de Fichas */}
          {fichasFiltradas.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() =>
                  handleSeleccionarTodasFichasVisibles(fichasFiltradas.map((f) => f.id))
                }
                className="font-bold text-slate-800 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer"
              >
                {seleccionadasFichas.length === fichasFiltradas.length ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>
                  {seleccionadasFichas.length === fichasFiltradas.length
                    ? 'Desmarcar todas'
                    : '☑️ Seleccionar todas las visibles'}
                </span>
              </button>

              <span className="font-mono text-slate-600 font-bold text-[11px]">
                {seleccionadasFichas.length} seleccionadas de {fichasFiltradas.length}
              </span>
            </div>
          )}

          {/* Lista de Fichas para Moderar */}
          {cargandoFichasModeracion ? (
            <div className="p-8 text-center text-xs text-slate-500 font-mono">
              Cargando fichas técnicas para moderación...
            </div>
          ) : fichasFiltradas.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a] space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">
                {subfiltroFichas === 'reportadas'
                  ? '¡Todo limpio! No hay fichas técnicas reportadas para eliminar.'
                  : 'No hay propuestas de imágenes pendientes de revisión.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fichasFiltradas.map((f) => {
                const seleccionada = seleccionadasFichas.includes(f.id);

                return (
                  <div
                    key={f.id}
                    className={`p-3.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] bg-white space-y-3 transition-all ${
                      seleccionada ? 'bg-amber-50/80 ring-2 ring-slate-950' : ''
                    }`}
                  >
                    {/* Encabezado: Checkbox + Tema + Reportes */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={seleccionada}
                          onChange={() => handleToggleSeleccionFicha(f.id)}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-400 cursor-pointer"
                        />
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold">
                          Tema {f.tema_id}
                        </span>
                        <span className="text-[11px] font-mono text-slate-600 font-semibold">
                          {f.tipo_ficha === 'tabla' ? '📊 Tabla' : 'Concepto'}
                        </span>
                      </div>

                      {f.reportada_eliminar && (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-mono font-bold border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Reportada ({f.votos_reporte || 1} avisos)</span>
                        </span>
                      )}

                      {f.estado_propuesta === 'pendiente' && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-mono font-bold border border-amber-300">
                          Propuesta pendiente: {f.propuesta_por_email || 'Opositor'}
                        </span>
                      )}
                    </div>

                    {/* Pregunta / Reto y Solución */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                        Pregunta:
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {f.frente_pregunta || f.concepto}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-800 block">
                        Solución:
                      </span>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 whitespace-pre-line max-h-36 overflow-y-auto">
                        {f.dorso_respuesta || f.valor_exacto}
                      </div>
                    </div>

                    {/* Vista previa de imagen propuesta */}
                    {f.imagen_propuesta_url && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                        <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-700" />
                          Foto propuesta por {f.propuesta_por_email || 'opositor'}:
                        </span>
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={f.imagen_propuesta_url}
                            alt="Propuesta de imagen"
                            className="w-20 h-20 object-contain rounded-lg border border-slate-300 bg-white"
                          />
                          <div className="text-[11px] text-slate-600 space-y-1">
                            <p>¿Aprobar para que aparezca como foto oficial global a todos los opositores?</p>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={async () => {
                                  await aprobarImagenesPropuestasMasivo([f.id]);
                                  mostrarToast('Imagen aprobada para todos.');
                                  cargarFichasModeracion();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprobar para todos</span>
                              </button>
                              <button
                                onClick={async () => {
                                  await rechazarImagenesPropuestasMasivo([f.id]);
                                  mostrarToast('Propuesta rechazada.');
                                  cargarFichasModeracion();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Acciones individuales de la Ficha */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400">ID: {f.id.slice(0, 8)}</span>

                      <div className="flex items-center gap-1.5">
                        {f.reportada_eliminar && (
                          <button
                            onClick={async () => {
                              await limpiarReportesFichasMasivo([f.id]);
                              mostrarToast('Reporte descartado.');
                              cargarFichasModeracion();
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-900 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer transition-all"
                          >
                            ✅ Limpiar reporte
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            if (confirm('¿Eliminar DEFINITIVAMENTE esta ficha de la BD para todos?')) {
                              await eliminarFichasMasivo([f.id]);
                              mostrarToast('Ficha eliminada de la base de datos.');
                              cargarFichasModeracion();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-900 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>🗑️ Eliminar BD</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* BARRA FLOTANTE DE ACCIÓN MASIVA PARA FICHAS */}
          {seleccionadasFichas.length > 0 && (
            <div className="fixed bottom-16 sm:bottom-18 left-0 right-0 z-40 px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-150">
              <div className="max-w-xl mx-auto pointer-events-auto p-3 rounded-2xl bg-slate-950 text-white border-2 border-slate-950 shadow-[4px_4px_0px_0px_#dc2626] flex items-center justify-between gap-3">
                <span className="text-xs font-mono font-bold text-amber-400">
                  {seleccionadasFichas.length} fichas seleccionadas
                </span>

                <div className="flex items-center gap-2">
                  {subfiltroFichas === 'reportadas' ? (
                    <>
                      <button
                        onClick={handleLimpiarReportesFichasMasivo}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold border border-slate-900 cursor-pointer transition-all"
                      >
                        ✅ Limpiar reportes ({seleccionadasFichas.length})
                      </button>

                      <button
                        onClick={handleEliminarFichasMasivo}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold border border-white/20 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar ({seleccionadasFichas.length})</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleRechazarImagenesMasivo}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer transition-all"
                      >
                        Rechazar ({seleccionadasFichas.length})
                      </button>

                      <button
                        onClick={handleAprobarImagenesMasivo}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all"
                      >
                        ✅ Aprobar para todos ({seleccionadasFichas.length})
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navegación inferior persistente */}
      <BottomNav />
    </div>
  );
}
