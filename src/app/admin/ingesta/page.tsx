'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { Tema, SeccionTemario, Pregunta } from '@/lib/types';
import { getTemas, guardarSeccionConPreguntas } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function PaginaAdminIngesta() {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [temaId, setTemaId] = useState<number>(1);
  const [epigrafe, setEpigrafe] = useState('');
  const [textoBruto, setTextoBruto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resultado devuelto por el tribunal IA
  const [resultado, setResultado] = useState<{
    seccion: SeccionTemario;
    preguntas: Pregunta[];
  } | null>(null);

  useEffect(() => {
    async function cargar() {
      const lista = await getTemas();
      setTemas(lista);
      if (lista.length > 0) setTemaId(lista[0].id);
    }
    cargar();
  }, []);

  const temaActual = useMemo(() => {
    return temas.find((t) => t.id === temaId);
  }, [temas, temaId]);

  // Manejador para carga de archivo .txt o .md
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTextoBruto(content);
        // Si no había epígrafe, sugerir nombre del archivo sin extensión
        if (!epigrafe) {
          setEpigrafe(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsText(file);
  };

  // Enviar a la API de Ingesta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!epigrafe.trim() || !textoBruto.trim()) {
      setErrorMsg('Por favor completa el epígrafe y pega el texto en bruto.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ingesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tema_id: temaId,
          epigrafe: epigrafe.trim(),
          texto_bruto: textoBruto.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en el procesamiento del Tribunal');
      }

      // Guardar también en el almacenamiento local para sincronización instantánea
      await guardarSeccionConPreguntas(
        {
          tema_id: data.seccion.tema_id,
          epigrafe: data.seccion.epigrafe,
          contenido_markdown: data.seccion.contenido_markdown,
          datos_criticos: data.seccion.datos_criticos || [],
        },
        data.preguntas
      );

      setResultado({
        seccion: data.seccion,
        preguntas: data.preguntas,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error conectando con el servicio de IA.';
      setErrorMsg(msg);
    } finally {
      setProcesando(false);
    }
  };

  const limpiarFormulario = () => {
    setEpigrafe('');
    setTextoBruto('');
    setResultado(null);
    setErrorMsg(null);
  };

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-[100dvh] pb-24 px-4 pt-3 space-y-4 animate-fadeIn">
      {/* 1. HEADER */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5 leading-none">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>Ingesta & Digitalización</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Estructuración técnica de temas y generación de banco SRS
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
          Admin
        </span>
      </header>

      {/* 2. FORMULARIO DE INGESTA */}
      {!resultado ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Selector de Tema Oficial (1 al 35) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Tema Oficial (1 al 35):</span>
              <span className="text-[11px] text-red-600 font-medium font-mono">
                {temaActual?.bloque}
              </span>
            </label>
            <select
              value={temaId}
              onChange={(e) => setTemaId(parseInt(e.target.value, 10))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 shadow-2xs focus:outline-hidden focus:border-slate-900 transition-colors"
            >
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  Tema {t.id}: {t.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Título del Epígrafe */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Título del Epígrafe o Sección:
            </label>
            <input
              type="text"
              value={epigrafe}
              onChange={(e) => setEpigrafe(e.target.value)}
              placeholder="Ej: Art. 14 al 29 - Derechos Fundamentales o Pérdidas de carga en mangueras"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:border-slate-900 transition-colors"
              required
            />
          </div>

          {/* Subir archivo .txt / .md */}
          <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              ¿Tienes el texto en archivo?
            </span>
            <label className="cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all">
              Subir .txt / .md
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Área de texto en bruto */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Texto en bruto oficial del temario:</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {textoBruto.length} caracteres
              </span>
            </label>
            <textarea
              rows={8}
              value={textoBruto}
              onChange={(e) => setTextoBruto(e.target.value)}
              placeholder="Pega aquí el articulado, datos técnicos, fórmulas, plazos o contenido oficial que quieras estructurar..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:border-slate-900 transition-colors font-mono leading-relaxed"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botón de Ingesta */}
          <button
            type="submit"
            disabled={procesando}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {procesando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Procesando y generando banco de preguntas...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Analizar y Generar Contenido</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* 3. VISTA TRAS EL PROCESAMIENTO CON ÉXITO */
        <div className="space-y-4 animate-slideUp">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">¡Ingesta completada y guardada!</span>
                <span className="text-[11px] text-emerald-700">
                  Epígrafe registrado y {resultado.preguntas.length} preguntas añadidas al banco SRS.
                </span>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex gap-2">
            <Link
              href={`/jugar?modo=tema&temaId=${temaId}`}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
            >
              Probar este Tema Ahora
            </Link>
            <button
              onClick={limpiarFormulario}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Ingestar Otro</span>
            </button>
          </div>

          {/* Datos Críticos Extraídos */}
          {resultado.seccion.datos_criticos && resultado.seccion.datos_criticos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Datos Clave Extraídos ({resultado.seccion.datos_criticos.length}):</span>
              </h3>
              <div className="space-y-1.5">
                {resultado.seccion.datos_criticos.map((dc, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{dc.concepto}</span>
                      <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {dc.valor_exacto}
                      </span>
                    </div>
                    {dc.trampa_habitual && (
                      <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span className="text-red-600 font-medium">Frecuente en examen: </span>
                        {dc.trampa_habitual}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Batería de Preguntas Generadas */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-red-600" />
              <span>Preguntas Oficiales Generadas ({resultado.preguntas.length}):</span>
            </h3>

            <div className="space-y-2">
              {resultado.preguntas.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-2.5"
                >
                  <p className="font-semibold text-slate-900 leading-snug">{p.enunciado}</p>

                  <div className="space-y-1.5 pl-0.5">
                    {p.opciones.map((opc, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border text-[11px] flex items-start gap-2 ${
                          i === p.respuesta_correcta
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-bold text-slate-700">{String.fromCharCode(65 + i)})</span>
                        <span className="leading-snug">{opc}</span>
                      </div>
                    ))}
                  </div>

                  {p.cita_exacta && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      <strong className="text-amber-800">Cita literal del temario: </strong>
                      &ldquo;{p.cita_exacta}&rdquo;
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 leading-relaxed">
                    <strong className="text-slate-800">Profesor: </strong>
                    {p.explicacion_profesor}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
