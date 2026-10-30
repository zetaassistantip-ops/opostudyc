"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthScreen() {
  const [mostrarEmailForm, setMostrarEmailForm] = useState(false);
  const [modoAuth, setModoAuth] = useState<"login" | "registro" | "recuperar">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mostrarInfoModal, setMostrarInfoModal] = useState(false);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!mostrarInfoModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMostrarInfoModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mostrarInfoModal]);

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setErrorMsg("Configuración de base de datos no disponible.");
      return;
    }
    setCargando(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setCargando(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Configuración de base de datos no disponible.");
      return;
    }
    setCargando(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (modoAuth === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/restablecer-password`,
        });
        if (error) throw error;
        setSuccessMsg(
          "Si el correo está registrado, te hemos enviado un enlace para crear una nueva clave. Revisa tu bandeja de entrada y la carpeta de spam."
        );
      } else if (modoAuth === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: nombre.trim() || email.split("@")[0],
            },
          },
        });
        if (error) throw error;
        // Si Supabase requiere confirmación por correo pero no hay sesión inmediata:
        if (data.user && !data.session) {
          setSuccessMsg("Cuenta creada. Si no entras automáticamente, revisa tu correo o inicia sesión.");
          setModoAuth("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(
        err.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : err.message || "Error al procesar la solicitud."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8fafc] flex flex-col justify-between p-5 select-none">
      {/* Cabecera / Logo */}
      <div className="w-full max-w-md mx-auto pt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMostrarInfoModal(true)}
          className="flex items-center gap-3 text-left group cursor-pointer"
          title="¿Qué es OpoStudyC? - Haz clic para ver información"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_#ef4444] group-active:translate-y-0.5 transition-all">
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
        </button>

        <button
          type="button"
          onClick={() => setMostrarInfoModal(true)}
          className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 cursor-pointer transition-all"
        >
          ¿Qué es esto?
        </button>
      </div>

      {/* Tarjeta Central de Acceso */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-[6px_6px_0px_0px_#0f172a]">
          <div className="inline-block px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-md text-[11px] font-extrabold uppercase tracking-wider mb-3">
            Acceso exclusivo opositores
          </div>

          <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">
            Entrena el temario con mentalidad de tribunal.
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Inicia sesión para guardar tu curva del olvido, tus estadísticas por tema y acceder al banco colaborativo de preguntas y fichas.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border-2 border-red-600 text-red-700 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-emerald-800 text-xs font-bold leading-relaxed">
              ✅ {successMsg}
            </div>
          )}

          {/* BOTÓN PRINCIPAL: GOOGLE */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={cargando}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#ef4444] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_#ef4444] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 16c1.9 3.9 5.8 7 10.4 7z"
              />
            </svg>
            <span>{cargando ? "Conectando..." : "Continuar con Google"}</span>
          </button>

          {/* OPCIÓN PEQUEÑA SECUNDARIA: CORREO Y CONTRASEÑA */}
          <div className="mt-5 pt-4 border-t border-slate-200 text-center">
            {!mostrarEmailForm ? (
              <button
                type="button"
                onClick={() => setMostrarEmailForm(true)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
              >
                ¿Prefieres acceder con correo y contraseña?
              </button>
            ) : (
              <form onSubmit={handleEmailAuth} className="text-left space-y-3 mt-2" autoComplete="on">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black uppercase text-slate-700">
                    {modoAuth === "recuperar"
                      ? "Recuperar contraseña"
                      : modoAuth === "registro"
                      ? "Crear cuenta nueva"
                      : "Acceso con correo"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarEmailForm(false);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Ocultar ▲
                  </button>
                </div>

                {modoAuth === "recuperar" && (
                  <p className="text-xs text-slate-600 leading-relaxed pb-1">
                    Introduce tu correo electrónico para recibir un enlace seguro de restablecimiento de contraseña.
                  </p>
                )}

                {modoAuth === "registro" && (
                  <div>
                    <label htmlFor="name" className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tu nombre o apodo
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required={modoAuth === "registro"}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Carlos"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:bg-white"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-[11px] font-bold text-slate-600 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:bg-white"
                  />
                </div>

                {modoAuth !== "recuperar" && (
                  <div>
                    <label htmlFor="password" className="block text-[11px] font-bold text-slate-600 mb-1">
                      Contraseña
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={modoAuth === "registro" ? "new-password" : "current-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border-2 border-slate-900 rounded-lg focus:outline-none focus:bg-white"
                    />

                    {modoAuth === "login" && (
                      <div className="flex justify-end pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModoAuth("recuperar");
                            setErrorMsg(null);
                            setSuccessMsg(null);
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
                        >
                          ¿Has olvidado tu contraseña?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  {cargando
                    ? "Procesando..."
                    : modoAuth === "recuperar"
                    ? "Enviar enlace de recuperación"
                    : modoAuth === "registro"
                    ? "Crear cuenta y entrar"
                    : "Entrar con mi correo"}
                </button>

                <div className="text-center pt-1">
                  {modoAuth === "recuperar" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModoAuth("login");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-bold text-slate-700 hover:underline cursor-pointer"
                    >
                      ← Volver a iniciar sesión
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setModoAuth(modoAuth === "registro" ? "login" : "registro");
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      {modoAuth === "registro"
                        ? "¿Ya tienes cuenta? Inicia sesión aquí"
                        : "¿No tienes cuenta? Regístrate con tu correo"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Pie de pantalla */}
      <div className="w-full max-w-md mx-auto pb-2 text-center">
        <button
          type="button"
          onClick={() => setMostrarInfoModal(true)}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
        >
          ℹ️ ¿Qué es OpoStudyC y cómo funciona?
        </button>
      </div>

      {/* MODAL "¿QUÉ ES OPOSTUDYC?" */}
      {mostrarInfoModal && (
        <div
          className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMostrarInfoModal(false)}
        >
          <div
            className="bg-white border-2 border-slate-900 rounded-2xl max-w-md w-full p-6 shadow-[6px_6px_0px_0px_#0f172a] max-h-[85dvh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-100">
              <h3 className="text-lg font-black text-slate-900">¿Qué es OpoStudyC?</h3>
              <button
                type="button"
                onClick={() => setMostrarInfoModal(false)}
                className="w-8 h-8 rounded-lg border-2 border-slate-900 font-black text-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <p>
                OpoStudyC es una herramienta pensada para estudiar y repasar el temario de la oposición sin depender de los típicos bancos de preguntas fijos que acabas aprendiéndote de memoria.
              </p>
              <p className="font-bold text-slate-900">
                El funcionamiento es sencillo y se apoya en el trabajo en equipo:
              </p>
              <p>
                🎯 <strong>Preguntas enfocadas al examen:</strong> El sistema intenta escanear los temas buscando lo que le gusta preguntar a un tribunal: tablas normativas, plazos exactos, cifras técnicas y excepciones.
              </p>
              <p>
                🌍 <strong>Un banco de preguntas compartido:</strong> La aplicación es colaborativa. Cada vez que generas una tanda de preguntas nuevas, se guardan en un banco común. Cuanto más la usamos, más amplio y variado es el repertorio para todos.
              </p>
              <p>
                ⚖️ <strong>El filtro de la comunidad:</strong> Para evitar preguntas dudosas o con erratas, cualquiera puede valorarlas. Si una pregunta está mal formulada, se puntúa negativo para cribarla y que solo queden las que de verdad sirven.
              </p>
              <p>
                🧠 <strong>Repaso inteligente:</strong> En vez de hacer test al azar, el sistema registra tus aciertos y fallos para programar repasos automáticos, insistiendo en los conceptos que más se te atragantan.
              </p>
              <p className="pt-2 border-t border-slate-100 font-medium text-slate-900">
                Al final, es simplemente una herramienta práctica para ayudarnos entre compañeros a machacar el temario y llegar al examen oficial con los datos frescos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarInfoModal(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl border-2 border-slate-900 cursor-pointer shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
