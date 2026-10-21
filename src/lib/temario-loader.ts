import fs from 'fs';
import path from 'path';
import { TEMAS_CAM } from './mock-data';

export interface TemarioCargado {
  temaId: number;
  tituloOficial: string;
  bloqueOficial: string;
  texto: string;
  fuente: 'supabase' | 'pdf' | 'archivo' | 'fallback';
}

/**
 * Validador de pureza del contenido para evitar intrusiones cruzadas (especialmente Tema 1)
 */
export function esContenidoValidoParaTema(temaId: number, texto: string): boolean {
  if (!texto || texto.trim().length < 80) return false;

  // Tema 1: Función Pública (TREBEP, Ley 1/1986 CAM). Prohibido Derechos Fundamentales o Art 15 CE
  if (Number(temaId) === 1) {
    const t = texto.toLowerCase();
    if (
      t.includes('derechos fundamentales y libertades públicas') ||
      t.includes('artículo 15:') ||
      t.includes('art. 15 ce') ||
      t.includes('tortura') ||
      t.includes('habeas corpus') ||
      t.includes('reforma agravada') ||
      t.includes('artículo 168')
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Carga el texto oficial del temario para un temaId concreto.
 * 1. Intenta desde Supabase secciones_temario.
 * 2. Si está vacío o corrupto, lee el archivo local de la carpeta /temario (PDF o TXT/MD).
 * 3. Si no, genera el bloque curricular oficial de referencia.
 */
export async function obtenerTextoTemario(
  temaId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<TemarioCargado> {
  const temaRef = TEMAS_CAM.find((t) => Number(t.id) === Number(temaId)) || {
    id: temaId,
    titulo: `Tema ${temaId}`,
    bloque: 'General',
  };

  const idNum = Number(temaId);

  // 1. Probar en Supabase secciones_temario
  if (supabase) {
    try {
      const { data: secciones } = await supabase
        .from('secciones_temario')
        .select('contenido_markdown, epigrafe')
        .eq('tema_id', idNum)
        .order('created_at', { ascending: true });

      if (secciones && secciones.length > 0) {
        const textoUnido = secciones
          .map((s: { epigrafe?: string; contenido_markdown?: string }) =>
            `### ${s.epigrafe || ''}\n${s.contenido_markdown || ''}`
          )
          .join('\n\n')
          .trim();

        if (esContenidoValidoParaTema(idNum, textoUnido)) {
          return {
            temaId: idNum,
            tituloOficial: temaRef.titulo,
            bloqueOficial: temaRef.bloque,
            texto: textoUnido.slice(0, 22000),
            fuente: 'supabase',
          };
        }
      }
    } catch (e) {
      console.warn(`[temario-loader] Aviso leyendo secciones de Supabase para Tema ${idNum}:`, e);
    }
  }

  // 2. Probar en carpeta local temario/
  try {
    const dirTemario = path.resolve(process.cwd(), 'temario');
    if (fs.existsSync(dirTemario)) {
      const archivos = fs.readdirSync(dirTemario);
      const prefijoPad = `Tema ${String(idNum).padStart(2, '0')}.`;
      const prefijoSimple = `Tema ${idNum}.`;

      const archivoEncontrado = archivos.find(
        (f) =>
          f.toLowerCase().startsWith(prefijoPad.toLowerCase()) ||
          f.toLowerCase().startsWith(prefijoSimple.toLowerCase()) ||
          new RegExp(`^tema[_-]?0?${idNum}[^0-9]`, 'i').test(f)
      );

      if (archivoEncontrado) {
        const rutaCompleta = path.join(dirTemario, archivoEncontrado);

        if (archivoEncontrado.toLowerCase().endsWith('.pdf')) {
          // Extraer con pdf-parse
          const { PDFParse } = await import('pdf-parse');
          const dataBuffer = fs.readFileSync(rutaCompleta);
          const parser = new PDFParse({ data: dataBuffer });
          // Extraer las primeras 10 páginas para velocidad y evitar sobrecargas de RAM
          const res = await parser.getText({ partial: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
          await parser.destroy();

          const rawText = (res.text || '').trim();
          if (rawText.length > 100 && esContenidoValidoParaTema(idNum, rawText)) {
            return {
              temaId: idNum,
              tituloOficial: temaRef.titulo,
              bloqueOficial: temaRef.bloque,
              texto: rawText.slice(0, 22000),
              fuente: 'pdf',
            };
          }
        } else {
          // Archivo de texto plano o markdown
          const rawText = fs.readFileSync(rutaCompleta, 'utf-8').trim();
          if (rawText.length > 100 && esContenidoValidoParaTema(idNum, rawText)) {
            return {
              temaId: idNum,
              tituloOficial: temaRef.titulo,
              bloqueOficial: temaRef.bloque,
              texto: rawText.slice(0, 22000),
              fuente: 'archivo',
            };
          }
        }
      }
    }
  } catch (e) {
    console.warn(`[temario-loader] Aviso leyendo archivos locales para Tema ${idNum}:`, e);
  }

  // 3. Fallback curricular con el título y bloque oficial estricto
  return {
    temaId: idNum,
    tituloOficial: temaRef.titulo,
    bloqueOficial: temaRef.bloque,
    texto: `Tema ${idNum}: ${temaRef.titulo} (Bloque Oficial: ${temaRef.bloque}) del programa oficial de Bomberos de la Comunidad de Madrid. Materia estricta de ${temaRef.titulo}.`,
    fuente: 'fallback',
  };
}
