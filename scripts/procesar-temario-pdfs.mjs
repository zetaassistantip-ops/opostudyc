import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { PDFParse } from 'pdf-parse';
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key?.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val?.trim();
    if (key?.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val?.trim();
  });
}

supabaseUrl = supabaseUrl?.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const TEMARIO_DIR = path.resolve('temario');

// Catálogo oficial exacto según los PDFs de la convocatoria de Bombero Especialista Conductor CAM
const TEMAS_OFICIALES = [
  { id: 1, titulo: 'La Función Pública', bloque: 'Legislación y Organización' },
  { id: 2, titulo: 'Igualdad de Oportunidades y No Discriminación', bloque: 'Legislación y Organización' },
  { id: 3, titulo: 'Prevención de Riesgos Laborales (PRL) y EPI', bloque: 'Legislación y Organización' },
  { id: 4, titulo: 'Decreto Legislativo 1/2006 (Cuerpo de Bomberos CAM)', bloque: 'Legislación y Organización' },
  { id: 5, titulo: 'Sistema Nacional de Protección Civil (SNPC)', bloque: 'Legislación y Organización' },
  { id: 6, titulo: 'Plan Territorial de Protección Civil (PLATERCAM)', bloque: 'Legislación y Organización' },
  { id: 7, titulo: 'Código Técnico de la Edificación (CTE DB SI)', bloque: 'Construcción y Normativa' },
  { id: 8, titulo: 'Territorio y Red de Infraestructuras de la CM', bloque: 'Geografía y Territorio CAM' },
  { id: 9, titulo: 'Organización del Cuerpo de Bomberos de la CM (CBCM)', bloque: 'Legislación y Organización' },
  { id: 10, titulo: 'Mecánica Básica de Vehículos de Bomberos', bloque: 'Técnicas y Conducción' },
  { id: 11, titulo: 'Comunicaciones en Emergencias (TETRA)', bloque: 'Técnicas y Conducción' },
  { id: 12, titulo: 'Soporte Vital Básico I (SVB I)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 13, titulo: 'Soporte Vital Básico II (SVB II)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 14, titulo: 'Psicología para Intervinientes en Emergencias', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 15, titulo: 'Hidráulica de Bomberos y Mecánica de Fluidos', bloque: 'Teoría del Fuego e Hidráulica' },
  { id: 16, titulo: 'Naturaleza del Fuego, Métodos y Agentes Extintores', bloque: 'Teoría del Fuego e Hidráulica' },
  { id: 17, titulo: 'Incendios en la Edificación I', bloque: 'Técnicas de Intervención' },
  { id: 18, titulo: 'Incendios en la Edificación II', bloque: 'Técnicas de Intervención' },
  { id: 19, titulo: 'Incendios de Vegetación I (Combustibles y Comportamiento)', bloque: 'Técnicas de Intervención' },
  { id: 20, titulo: 'Incendios de Vegetación II (Tácticas y Medios INFOMA)', bloque: 'Técnicas de Intervención' },
  { id: 21, titulo: 'Riesgo Químico y Biológico I (RBQ I - ADR)', bloque: 'Técnicas y Materias Peligrosas' },
  { id: 22, titulo: 'Riesgo Químico y Biológico II (RBQ II - Descontaminación)', bloque: 'Técnicas y Materias Peligrosas' },
  { id: 23, titulo: 'Construcción I (Materiales y Estructuras)', bloque: 'Construcción y Normativa' },
  { id: 24, titulo: 'Construcción II (Patologías y Apuntalamientos)', bloque: 'Construcción y Normativa' },
  { id: 25, titulo: 'Rescate en Accidentes de Tráfico I (RAT I)', bloque: 'Rescate y Salvamento' },
  { id: 26, titulo: 'Rescate en Accidentes de Tráfico II (RAT II - Descarcelación)', bloque: 'Rescate y Salvamento' },
  { id: 27, titulo: 'Trabajos Verticales y en Altura', bloque: 'Rescate y Salvamento' },
  { id: 28, titulo: 'Riesgo Eléctrico y Distancias de Seguridad', bloque: 'Instalaciones y Seguridad' },
  { id: 29, titulo: 'Suministros de Gas (GLP y Gas Natural)', bloque: 'Instalaciones y Seguridad' },
  { id: 30, titulo: 'Intervenciones con Abejas y Avispas (Himenópteros)', bloque: 'Técnicas Especiales' },
  { id: 31, titulo: 'Ascensores y Aperturas Forzosas', bloque: 'Técnicas Especiales' },
  { id: 32, titulo: 'Apeos y Tala de Arbolado en Emergencias', bloque: 'Técnicas Especiales' },
  { id: 33, titulo: 'Actuación en Conductas Autolíticas (Prevención del Suicidio)', bloque: 'Sanitario y Primeros Auxilios' },
  { id: 34, titulo: 'Rescate Acuático y en Inundaciones', bloque: 'Rescate y Salvamento' },
  { id: 35, titulo: 'Conducción Segura en Emergencias', bloque: 'Técnicas y Conducción' }
];

async function main() {
  console.log('🔄 Sincronizando títulos oficiales de los 35 temas en Supabase...');
  for (const t of TEMAS_OFICIALES) {
    await supabase.from('temas').upsert({ id: t.id, titulo: t.titulo, bloque: t.bloque });
  }
  console.log('✅ Catálogo de los 35 temas actualizado en Supabase.');

  const files = fs.readdirSync(TEMARIO_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`📚 Procesando ${files.length} archivos PDF encontrados en /temario...`);

  let totalCargados = 0;

  for (const file of files) {
    const match = file.match(/Tema\s*0?(\d+)/i);
    if (!match) continue;
    const temaId = parseInt(match[1], 10);

    const epigrafe = file.replace(/\.pdf$/i, '').replace(/^Tema\s*\d+\.\s*/i, '');

    // Comprobar si ya existe para evitar duplicar
    const { data: existing } = await supabase
      .from('secciones_temario')
      .select('id')
      .eq('tema_id', temaId)
      .ilike('epigrafe', `%${epigrafe.slice(0, 15)}%`)
      .maybeSingle();

    if (existing) {
      console.log(`⏩ Tema ${temaId}: "${epigrafe}" ya existe en BD, omitiendo duplicado.`);
      continue;
    }

    console.log(`⏳ Leyendo y parseando Tema ${temaId}: ${file}...`);
    const fullPath = path.join(TEMARIO_DIR, file);
    const buffer = fs.readFileSync(fullPath);

    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      const rawText = parsed.text || '';

      // Limpiar texto para guardarlo en secciones de temario (hasta 40.000 caracteres por epígrafe principal)
      const textoMarkdown = `## ${epigrafe.toUpperCase()}\n\n*Documento Oficial del Cuerpo de Bomberos de la Comunidad de Madrid (Total páginas: ${parsed.total || 'N/D'})*\n\n` +
        rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').slice(0, 35000);

      // Extraer posibles datos críticos automáticamente (cifras, plazos, presiones, artículos)
      const datosCriticos = [];
      const regexCifras = /(?:art[íi]culo|art\.)\s*\d+|(?:\d+[\.,]?\d*)\s*(?:bar|kg|l\/min|mm|cm|metros|m\.c\.a\.|%|horas|días|minutos|meses|años|kW\/m²|°C)/gi;
      const matchesCifras = Array.from(new Set(rawText.match(regexCifras) || [])).slice(0, 5);

      matchesCifras.forEach(m => {
        datosCriticos.push({
          concepto: `Dato técnico en ${epigrafe.slice(0, 25)}`,
          valor_exacto: m.trim(),
          trampa_habitual: 'Atención a unidades y cifras exactas en examen.'
        });
      });

      // Insertar sección en Supabase
      const { data: secData, error: secErr } = await supabase
        .from('secciones_temario')
        .insert([{
          tema_id: temaId,
          epigrafe: `Contenido Oficial: ${epigrafe}`,
          contenido_markdown: textoMarkdown,
          datos_criticos: datosCriticos
        }])
        .select()
        .single();

      if (secErr) {
        console.error(`❌ Error en Tema ${temaId} (${file}):`, secErr.message);
      } else {
        totalCargados++;
        console.log(`✅ [${totalCargados}] Tema ${temaId}: "${epigrafe}" cargado en Supabase (Sección ID: ${secData.id})`);
      }
    } catch (err) {
      console.error(`❌ Fallo parseando ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 ¡Carga masiva finalizada! Se han incorporado ${totalCargados} temas oficiales en Supabase.`);
}

main();
