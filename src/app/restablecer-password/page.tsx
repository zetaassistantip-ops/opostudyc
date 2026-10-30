'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { KeyRound, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function RestablecerPasswordPage() {
  const router = useRouter();

  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setVerificando(false);
      setTokenValido(false);
      return;
    }

    // Comprobar errores directos en la URL (p.ej. enlaces expirados)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('error=') ||
        search.includes('error=') ||
        hash.includes('otp_expired') ||
        search.includes('otp_expired')
      ) {
        setTokenValido(false);
        setVerificando(false);
        return;
      }
    }

    // Escuchar el evento de recuperación de contraseña de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setTokenValido(true);
        setVerificando(false);
      }
    });

    // Comprobar si ya hay una sesión activa o recuperación en curso
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTokenValido(true);
        setVerificando(false);
      } else {
        // Margen breve para dar tiempo al cliente Supabase de procesar el hash en URL
        const timer = setTimeout(() => {
          supabase?.auth.getSession().then(({ data: { session: s2 } }) => {
            if (s2) {
              setTokenValido(true);
            } else {
              setTokenValido(false);
            }
            setVerificando(false);
          });
        }, 1200);

        return () => clearTimeout(timer);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleActualizarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (nuevaPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setErrorMsg('Las contraseñas no coinciden. Verifícalas e inténtalo de nuevo.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Error de configuración con el servicio de autenticación.');
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword,
      });

      if (error) {
        throw error;
      }

      setExito(true);
      // Breve pausa para mostrar el mensaje de éxito y redirigir
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar la contraseña.');
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8fafc] flex flex-col justify-center items-center p-5 select-none">
      <div className="w-full max-w-md">
        {/* Cabecera / Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#ef4444]">
            🔥
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Opostudy<span className="text-slate-400">C</span>
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              35 Temas · Bomberos CAM
            </p>
          </div>
        </div>

        {/* Tarjeta Central */}
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a]">
          {verificando ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-red-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">
                Verificando enlace de recuperación...
              </p>
            </div>
          ) : !tokenValido ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-600 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900">
                  Enlace caducado o inválido
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ⚠️ El enlace de recuperación ha caducado o no es válido. Los enlaces de restablecimiento expiran por motivos de seguridad o una vez utilizados.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#ef4444] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer inline-flex"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a la pantalla de acceso</span>
                </Link>
              </div>
            </div>
          ) : exito ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border-2 border-emerald-600 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black text-slate-900">
                ¡Contraseña restablecida con éxito!
              </h2>
              <p className="text-xs text-slate-600">
                Entrando a OpostudyC con tu nueva clave...
              </p>
            </div>
          ) : (
            <div>
              <div className="inline-block px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-[11px] font-extrabold uppercase tracking-wider mb-3">
                Seguridad de cuenta
              </div>

              <h2 className="text-xl font-black text-slate-900 leading-tight mb-1 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-700" />
                <span>Crea tu nueva contraseña</span>
              </h2>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                Introduce tu nueva contraseña para volver a acceder a tu cuenta y a tus estadísticas de estudio.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-600 text-red-700 text-xs font-bold">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleActualizarPassword} className="space-y-4" autoComplete="on">
                <div>
                  <label
                    htmlFor="nueva-password"
                    className="block text-[11px] font-bold text-slate-600 mb-1"
                  >
                    Nueva contraseña
                  </label>
                  <input
                    id="nueva-password"
                    name="nueva-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmar-password"
                    className="block text-[11px] font-bold text-slate-600 mb-1"
                  >
                    Confirmar nueva contraseña
                  </label>
                  <input
                    id="confirmar-password"
                    name="confirmar-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#ef4444] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#ef4444] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar nueva contraseña y entrar</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

