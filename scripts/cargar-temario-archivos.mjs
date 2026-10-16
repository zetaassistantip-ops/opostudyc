import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const TEMARIO_DIR = path.resolve('temario');

async function main() {
  console.log('🚀 Iniciando escaneo de archivos en carpeta /temario...');

  if (!fs.existsSync(TEMARIO_DIR)) {
    fs.mkdirSync(TEMARIO_DIR, { recursive: true });
    console.log('📁 Carpeta "temario/" creada. Coloca aquí tus archivos (ej: "tema-14-hidraulica.txt" o ".md") y vuelve a ejecutar.');
    return;
  }

  const files = fs.readdirSync(TEMARIO_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.json'));

  if (files.length === 0) {
    console.log('ℹ️ La carpeta "temario/" está vacía. Arrastra tus archivos .txt o .md dentro y reejecuta: npm run cargar-temario');
    return;
  }

  console.log(`📄 Se han encontrado ${files.length} archivos para procesar.`);

  for (const file of files) {
    const fullPath = path.join(TEMARIO_DIR, file);
    const contenido = fs.readFileSync(fullPath, 'utf-8');

    // Intentar deducir número de tema del nombre del archivo (ej: tema_14.txt -> 14)
    const matchTema = file.match(/\d+/);
    const temaId = matchTema ? parseInt(matchTema[0], 10) : 1;
    const epigrafe = file.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    console.log(`⏳ Cargando ${file} en Tema ${temaId} (${epigrafe})...`);

    const { data: secData, error: secErr } = await supabase
      .from('secciones_temario')
      .insert([{
        tema_id: temaId,
        epigrafe,
        contenido_markdown: contenido,
        datos_criticos: []
      }])
      .select()
      .single();

    if (secErr) {
      console.error(`❌ Error al subir ${file}:`, secErr.message);
    } else {
      console.log(`✅ ${file} subido correctamente con ID: ${secData.id}`);
    }
  }

  console.log('🎉 Carga de archivos completada.');
}

main();
