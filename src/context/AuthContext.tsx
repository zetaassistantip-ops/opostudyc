'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { PerfilUsuario } from '@/lib/types';
import { ShieldAlert, Zap, LogOut } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: PerfilUsuario | null;
  loading: boolean;
  esAdmin: boolean;
  bloqueado: boolean;
  impersonatedUser: PerfilUsuario | null;
  effectiveUserId: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  startImpersonation: (usuario: PerfilUsuario) => void;
  stopImpersonation: () => void;
  recargarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  perfil: null,
  loading: true,
  esAdmin: false,
  bloqueado: false,
  impersonatedUser: null,
  effectiveUserId: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  startImpersonation: () => {},
  stopImpersonation: () => {},
  recargarPerfil: async () => {},
});

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [impersonatedUser, setImpersonatedUser] = useState<PerfilUsuario | null>(null);

  // Cargar usuario suplantado desde sessionStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('opostudy_impersonated_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setImpersonatedUser(parsed);
        }
      } catch (e) {
        console.error('Error cargando usuario suplantado:', e);
      }
    }
  }, []);

  // Función para registrar / actualizar el perfil en perfiles_usuarios
  const sincronizarPerfil = async (currentUser: User) => {
    if (!supabase) return null;
    try {
      // 1. Obtener perfil existente
      const { data: perfilExistente } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const userEmail = currentUser.email?.trim().toLowerCase();
      const esAdminPorEmail = Boolean(ADMIN_EMAIL && userEmail && userEmail === ADMIN_EMAIL);

      // Comprobar si hay algún admin registrado en el sistema
      let ningunAdmin = false;
      try {
        const { count } = await supabase
          .from('perfiles_usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('es_admin', true);
        ningunAdmin = count === 0;
      } catch {
        // En caso de que falle la consulta de conteo
      }

      const debeSerAdmin =
        esAdminPorEmail ||
        Boolean(perfilExistente?.es_admin) ||
        ningunAdmin;

      const datosActualizar = {
        id: currentUser.id,
        email: currentUser.email || '',
        nombre:
          currentUser.user_metadata?.full_name ||
          perfilExistente?.nombre ||
          currentUser.email?.split('@')[0] ||
          'Opositor',
        avatar_url:
          currentUser.user_metadata?.avatar_url ||
          perfilExistente?.avatar_url ||
          null,
        es_admin: debeSerAdmin,
        bloqueado: Boolean(perfilExistente?.bloqueado),
        tokens_consumidos: perfilExistente?.tokens_consumidos ?? 0,
        coste_estimado_eur: perfilExistente?.coste_estimado_eur ?? 0,
        bytes_almacenamiento: perfilExistente?.bytes_almacenamiento ?? 0,
        ultima_conexion: new Date().toISOString(),
      };

      const { data: upserted, error } = await supabase
        .from('perfiles_usuarios')
        .upsert(datosActualizar, { onConflict: 'id' })
        .select('*')
        .single();

      if (!error && upserted) {
        setPerfil(upserted as PerfilUsuario);
        return upserted as PerfilUsuario;
      } else if (perfilExistente) {
        setPerfil(perfilExistente as PerfilUsuario);
        return perfilExistente as PerfilUsuario;
      }
    } catch (e) {
      console.warn('Aviso sincronizando perfil de usuario:', e);
    }
    return null;
  };

  const recargarPerfil = async () => {
    if (user) {
      await sincronizarPerfil(user);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        sincronizarPerfil(currentUser).finally(() => setLoading(false));
      } else {
        setPerfil(null);
        setLoading(false);
      }
    });

    // Suscripción a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await sincronizarPerfil(currentUser);
      } else {
        setPerfil(null);
        stopImpersonation();
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('Error al iniciar sesión con Google:', error.message);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    stopImpersonation();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPerfil(null);
  };

  // Activar modo Dios (suplantación)
  const startImpersonation = (usuario: PerfilUsuario) => {
    setImpersonatedUser(usuario);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('opostudy_impersonated_user', JSON.stringify(usuario));
      sessionStorage.setItem('opostudy_impersonated_user_id', usuario.id);
    }
  };

  // Salir de modo Dios
  const stopImpersonation = () => {
    setImpersonatedUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('opostudy_impersonated_user');
      sessionStorage.removeItem('opostudy_impersonated_user_id');
    }
  };

  // Cálculo de si es Administrador
  const esAdmin = useMemo(() => {
    if (!user) return false;
    const emailNorm = user.email?.trim().toLowerCase();
    if (ADMIN_EMAIL && emailNorm === ADMIN_EMAIL) return true;
    return Boolean(perfil?.es_admin);
  }, [user, perfil]);

  // Si está bloqueado
  const bloqueado = Boolean(perfil?.bloqueado && !esAdmin);

  // ID efectivo para todas las consultas (SRS, Fichas, etc.)
  const effectiveUserId = useMemo(() => {
    if (impersonatedUser) return impersonatedUser.id;
    return user?.id || null;
  }, [impersonatedUser, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        perfil,
        loading,
        esAdmin,
        bloqueado,
        impersonatedUser,
        effectiveUserId,
        signInWithGoogle,
        signOut,
        startImpersonation,
        stopImpersonation,
        recargarPerfil,
      }}
    >
      {/* 1. BARRA SUPERIOR FIJA DE MODO DIOS (SI ESTÁ ACTIVO) */}
      {impersonatedUser && esAdmin && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold border-b-2 border-slate-900 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping flex-shrink-0" />
            <Zap className="w-4 h-4 text-red-700 fill-red-600 flex-shrink-0" />
            <span className="truncate">
              ⚡ <strong>MODO DIOS:</strong> Viendo la app como{' '}
              <span className="underline decoration-2">
                {impersonatedUser.nombre || impersonatedUser.email}
              </span>
            </span>
          </div>

          <button
            onClick={stopImpersonation}
            className="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-[11px] font-mono hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 active:scale-95"
          >
            <LogOut className="w-3 h-3" />
            <span>Salir del Modo Dios</span>
          </button>
        </aside>
      )}

      {/* 2. PANTALLA DE ACCESO BLOQUEADO (SI EL ADMIN LO HA BLOQUEADO) */}
      {bloqueado ? (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] rounded-2xl p-6 sm:p-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 border-2 border-rose-600 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-black text-slate-900">Acceso Restringido</h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                ⛔ Tu acceso a OpostudyC ha sido restringido por el administrador de la plataforma.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={signOut}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border-2 border-slate-900"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={impersonatedUser && esAdmin ? 'pt-10' : ''}>
          {children}
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
