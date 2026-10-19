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
} from 'lucide-react';
import { Pregunta, Tema, PerfilUsuario, UsoMemoriaSupabase } from '@/lib/types';
import {
  getTemas,
  getPreguntas,
  eliminarPregunta,
  resetearVotosPregunta,
  getPerfilesUsuariosAdmin,
  toggleBloquearUsuario,
  eliminarPerfilUsuario,
  getUsoMemoriaSupabase,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/BottomNav';

type TabPrincipal = 'usuarios' | 'memoria' | 'moderacion';
type PestañaFiltroPreguntas = 'malas' | 'regulares' | 'buenas' | 'todas';

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

  useEffect(() => {
    if (esAdmin) {
      cargarUsuarios();
      cargarMemoria();
      cargarPreguntasYTemas();
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

  // Acciones de preguntas
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

  // Métricas generales calculadas
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
    return {
      totalUsuarios: usuarios.length,
      totalTokens,
      totalCoste,
      totalBytesStorage,
      preguntasTotal: preguntas.length,
      malas,
      regulares,
      buenas,
    };
  }, [usuarios, preguntas]);

  // Filtrado de preguntas
  const preguntasFiltradas = useMemo(() => {
    return preguntas
      .filter((p) => {
        if (pestañaModeracion === 'malas') {
          if ((p.votos_mala || 0) <= 0) return false;
        } else if (pestañaModeracion === 'regulares') {
          if ((p.votos_regular || 0) <= 0) return false;
        } else if (pestañaModeracion === 'buenas') {
          if ((p.votos_buena || 0) <= 0) return false;
        }

        if (temaSeleccionado !== 'all') {
          if (p.tema_id !== temaSeleccionado) return false;
        }

        if (busquedaPregunta.trim() !== '') {
          const q = busquedaPregunta.toLowerCase();
          const matchEnunciado = p.enunciado.toLowerCase().includes(q);
          const matchExplicacion = p.explicacion_profesor.toLowerCase().includes(q);
          if (!matchEnunciado && !matchExplicacion) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (pestañaModeracion === 'malas') return (b.votos_mala || 0) - (a.votos_mala || 0);
        if (pestañaModeracion === 'regulares') return (b.votos_regular || 0) - (a.votos_regular || 0);
        if (pestañaModeracion === 'buenas') return (b.votos_buena || 0) - (a.votos_buena || 0);
        return b.tema_id - a.tema_id;
      });
  }, [preguntas, pestañaModeracion, temaSeleccionado, busquedaPregunta]);

  if (authLoading || (!esAdmin && !user)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-bold text-slate-800">Verificando credenciales de Administrador...</p>
      </div>
    );
  }

  if (!esAdmin) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
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
              Control de usuarios, memoria Supabase y moderación
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

      {/* 2. PESTAÑAS PRINCIPALES DEL SUPERADMIN */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-200/90 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
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
          <span>👎 Moderación ({metricasGlobales.malas})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: USUARIOS Y MODO DIOS                               */}
      {/* ========================================================= */}
      {tabActiva === 'usuarios' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Métricas rápidas de usuarios */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-blue-700">{metricasGlobales.totalUsuarios}</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Total Registrados
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-amber-700">
                {metricasGlobales.totalTokens.toLocaleString()}
              </span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Tokens IA Consumidos
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-emerald-700">
                {metricasGlobales.totalCoste.toFixed(4)} €
              </span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Coste Gemini Total
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-purple-700">
                {formatBytes(metricasGlobales.totalBytesStorage)}
              </span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Fotos Almacenadas
              </span>
            </div>
          </div>

          {/* Buscador de usuarios */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                placeholder="Buscar por nombre o correo de Google..."
                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 font-medium placeholder-slate-400 shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden"
              />
            </div>
            <button
              onClick={cargarUsuarios}
              disabled={cargandoUsuarios}
              className="p-2 rounded-xl bg-white border-2 border-slate-900 hover:bg-slate-100 active:scale-95 shadow-[2px_2px_0px_0px_#0f172a] cursor-pointer"
              title="Refrescar usuarios"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${cargandoUsuarios ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Listado de usuarios */}
          {cargandoUsuarios ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a]">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold text-slate-700">Cargando perfiles...</p>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a]">
              <p className="text-xs font-bold text-slate-600">No se encontraron usuarios.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {usuariosFiltrados.map((u) => {
                const esYo = user?.id === u.id;
                return (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] bg-white space-y-2.5 transition-all ${
                      u.bloqueado ? 'opacity-70 bg-rose-50/40' : ''
                    }`}
                  >
                    {/* Fila superior: Avatar, Nombre, Correo y Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.nombre || 'Avatar'}
                            className="w-10 h-10 rounded-full border-2 border-slate-900 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0 text-sm">
                            {(u.nombre || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">
                              {u.nombre || 'Sin nombre'}
                            </span>
                            {esYo && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-900/40">
                                Tú
                              </span>
                            )}
                            {u.es_admin && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-200 text-amber-950 border border-amber-900/50 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" />
                                Admin
                              </span>
                            )}
                            {u.bloqueado && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white border border-slate-900 flex items-center gap-0.5">
                                <Ban className="w-2.5 h-2.5" />
                                Bloqueado
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] font-mono text-slate-500 break-all">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        <span className="block font-bold text-slate-700">Última conexión</span>
                        <span>{formatFecha(u.ultima_conexion)}</span>
                      </div>
                    </div>

                    {/* Fila de estadísticas del usuario */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Tests / Preg</span>
                        <span className="text-xs font-black text-slate-900">
                          {u.preguntas_respondidas || 0}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">% Acierto</span>
                        <span className="text-xs font-black text-emerald-700">
                          {u.porcentaje_aciertos ? `${u.porcentaje_aciertos.toFixed(0)}%` : '0%'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Tokens IA</span>
                        <span className="text-xs font-black text-amber-700">
                          {(u.tokens_consumidos || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Coste IA</span>
                        <span className="text-xs font-black text-purple-700">
                          {(u.coste_estimado_eur || 0).toFixed(4)} €
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Fotos Fichas</span>
                        <span className="text-xs font-black text-blue-700">
                          {formatBytes(u.bytes_almacenamiento || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 flex-wrap">
                      {/* Botón Modo Dios */}
                      <button
                        onClick={() => handleActivarModoDios(u)}
                        disabled={esYo}
                        className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          esYo
                            ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                            : 'bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 shadow-[1px_1px_0px_0px_#0f172a]'
                        }`}
                        title={esYo ? 'Ya eres este usuario' : 'Ver la app como este usuario'}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-950" />
                        <span>👁️ Modo Dios</span>
                      </button>

                      {/* Botón Bloquear / Desbloquear */}
                      <button
                        onClick={() => handleToggleBloquear(u)}
                        disabled={esYo || accionEnCurso === u.id}
                        className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          esYo
                            ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                            : u.bloqueado
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[1px_1px_0px_0px_#0f172a]'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-900 shadow-[1px_1px_0px_0px_#0f172a]'
                        }`}
                      >
                        {u.bloqueado ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Desbloquear</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Bloquear</span>
                          </>
                        )}
                      </button>

                      {/* Botón Eliminar Usuario */}
                      <button
                        onClick={() => handleEliminarUsuario(u)}
                        disabled={esYo || accionEnCurso === u.id}
                        className={`px-2.5 py-1 rounded-lg border-2 border-slate-900 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          esYo
                            ? 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                            : 'bg-white hover:bg-rose-50 text-rose-700 shadow-[1px_1px_0px_0px_#0f172a]'
                        }`}
                        title="Eliminar usuario y todos sus datos"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CONTROL DE MEMORIA SUPABASE                        */}
      {/* ========================================================= */}
      {tabActiva === 'memoria' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Tarjetas de Uso de Memoria */}
          <div className="space-y-3">
            {/* Tarjeta 1: Base de Datos */}
            {(() => {
              const dbMB = memoria?.dbMB || 15;
              const dbMax = memoria?.dbMaxMB || 500;
              const pctDB = Math.min(100, Math.round((dbMB / dbMax) * 100));
              const alertaColor =
                pctDB > 90
                  ? 'bg-rose-500'
                  : pctDB > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-100 border border-slate-900 text-blue-900">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                          Base de Datos PostgreSQL
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Tablas, preguntas, perfiles, sesiones y respuestas SRS
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {pctDB}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 border-2 border-slate-900 rounded-full h-4 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${alertaColor}`}
                      style={{ width: `${pctDB}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-600">
                    <span>{dbMB.toFixed(1)} MB en uso</span>
                    <span>{dbMax} MB (Límite Plan Gratis)</span>
                  </div>
                </div>
              );
            })()}

            {/* Tarjeta 2: Almacenamiento de Fotos */}
            {(() => {
              const stMB = memoria?.storageMB || 0;
              const stMax = memoria?.storageMaxMB || 1000;
              const pctStorage = Math.min(100, Math.round((stMB / stMax) * 100));
              const alertaColor =
                pctStorage > 90
                  ? 'bg-rose-500'
                  : pctStorage > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-purple-100 border border-slate-900 text-purple-900">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                          Almacenamiento de Fotos (Storage)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Bucket fichas-imagenes (comprimidas WebP en navegador)
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-slate-900">
                      {pctStorage}%
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 border-2 border-slate-900 rounded-full h-4 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${alertaColor}`}
                      style={{ width: `${Math.max(1, pctStorage)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-600">
                    <span>{stMB.toFixed(2)} MB en uso</span>
                    <span>{stMax} MB (1 GB Límite Gratis)</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Ranking de Usuarios que más espacio ocupan en fotos */}
          <div className="p-4 rounded-xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏆 Ranking de Consumo de Fotos</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Usuarios que más espacio ocupan con sus imágenes mnemotécnicas
                </p>
              </div>
              <button
                onClick={cargarMemoria}
                disabled={cargandoMemoria}
                className="p-1.5 rounded-lg border-2 border-slate-900 bg-slate-50 hover:bg-slate-100 active:scale-95 shadow-[1px_1px_0px_0px_#0f172a] cursor-pointer"
                title="Recalcular memoria"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${cargandoMemoria ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {rankingMemoriaUsuarios.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                Aún ningún usuario ha subido imágenes a sus fichas técnicas.
              </p>
            ) : (
              <div className="space-y-1.5">
                {rankingMemoriaUsuarios.map((u, idx) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black font-mono text-slate-400 w-4">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block leading-none">
                          {u.nombre || 'Usuario'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {u.email}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-black text-purple-700">
                      {formatBytes(u.bytes_almacenamiento || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MODERACIÓN DE PREGUNTAS (VALORACIONES)             */}
      {/* ========================================================= */}
      {tabActiva === 'moderacion' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Barra de métricas de votos */}
          <div className="grid grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-rose-600">{metricasGlobales.malas}</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                👎 Malas
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-amber-600">{metricasGlobales.regulares}</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                😐 Regulares
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-emerald-600">{metricasGlobales.buenas}</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                👍 Buenas
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border-2 border-slate-900 text-center shadow-[2px_2px_0px_0px_#0f172a]">
              <span className="text-base font-black text-slate-900">{metricasGlobales.preguntasTotal}</span>
              <span className="block text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                Total
              </span>
            </div>
          </div>

          {/* Filtros de estado de votos */}
          <div className="flex border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-100 p-1 gap-1">
            <button
              onClick={() => setPestañaModeracion('malas')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                pestañaModeracion === 'malas'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>Malas ({metricasGlobales.malas})</span>
            </button>

            <button
              onClick={() => setPestañaModeracion('regulares')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                pestañaModeracion === 'regulares'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Meh className="w-3.5 h-3.5" />
              <span>Regulares ({metricasGlobales.regulares})</span>
            </button>

            <button
              onClick={() => setPestañaModeracion('buenas')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                pestañaModeracion === 'buenas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Buenas ({metricasGlobales.buenas})</span>
            </button>

            <button
              onClick={() => setPestañaModeracion('todas')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                pestañaModeracion === 'todas'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Todas ({metricasGlobales.preguntasTotal})</span>
            </button>
          </div>

          {/* Filtros secundarios: Tema y Buscador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
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
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaPregunta}
                onChange={(e) => setBusquedaPregunta(e.target.value)}
                placeholder="Buscar por texto o explicación..."
                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 shadow-[2px_2px_0px_0px_#0f172a] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Lista de preguntas */}
          {cargandoPreguntas ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a]">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-amber-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-bold text-slate-700">Cargando preguntas...</p>
            </div>
          ) : preguntasFiltradas.length === 0 ? (
            <div className="p-8 text-center bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#0f172a]">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-900">
                {pestañaModeracion === 'malas'
                  ? '¡Excelente! No hay preguntas marcadas como malas.'
                  : 'No se encontraron preguntas con estos filtros.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {preguntasFiltradas.map((p) => {
                const temaAsociado = temas.find((t) => t.id === p.tema_id);

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] bg-white space-y-3 transition-all"
                  >
                    {/* Encabezado: Tema y Votos */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-mono font-bold">
                          Tema {p.tema_id}
                        </span>
                        {temaAsociado && (
                          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">
                            {temaAsociado.titulo}
                          </span>
                        )}
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

                    {/* Explicación estructurada */}
                    {p.explicacion_profesor && (
                      <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px] text-slate-800 space-y-1">
                        <span className="font-black text-amber-900 block uppercase text-[10px]">
                          💡 Explicación del Profesor:
                        </span>
                        <p className="whitespace-pre-line leading-relaxed">
                          {p.explicacion_profesor}
                        </p>
                      </div>
                    )}

                    {/* Acciones del Admin */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400">ID: {p.id.slice(0, 8)}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleResetearVotos(p.id)}
                          disabled={accionEnCurso === p.id}
                          className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 text-xs font-bold transition-all shadow-[1px_1px_0px_0px_#0f172a] flex items-center gap-1 cursor-pointer"
                          title="Poner todos los votos de esta pregunta a 0"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-600" />
                          <span>🧹 Resetear votos</span>
                        </button>

                        <button
                          onClick={() => handleEliminarPregunta(p.id, p.enunciado)}
                          disabled={accionEnCurso === p.id}
                          className="px-2.5 py-1 rounded-lg border-2 border-slate-900 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition-all shadow-[1px_1px_0px_0px_#0f172a] flex items-center gap-1 cursor-pointer"
                          title="Eliminar pregunta definitivamente de Supabase"
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
        </div>
      )}

      {/* Navegación inferior persistente */}
      <BottomNav />
    </div>
  );
}
