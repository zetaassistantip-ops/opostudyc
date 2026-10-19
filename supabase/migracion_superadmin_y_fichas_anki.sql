-- ==============================================================================
-- OPOBOMBEROS CAM 35 - SUPERADMIN "MODO DIOS", CONTROL TOKENS/MEMORIA Y FICHAS ANKI
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. TABLA PERFILES_USUARIOS (Gestión de usuarios, control de costes y memoria)
CREATE TABLE IF NOT EXISTS perfiles_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT,
    avatar_url TEXT,
    es_admin BOOLEAN DEFAULT false,
    bloqueado BOOLEAN DEFAULT false,
    tokens_consumidos BIGINT DEFAULT 0,
    coste_estimado_eur NUMERIC(10, 6) DEFAULT 0,
    bytes_almacenamiento BIGINT DEFAULT 0,
    ultima_conexion TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfiles_email ON perfiles_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_perfiles_es_admin ON perfiles_usuarios(es_admin);
CREATE INDEX IF NOT EXISTS idx_perfiles_bytes ON perfiles_usuarios(bytes_almacenamiento DESC);

ALTER TABLE perfiles_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_select_all" ON perfiles_usuarios;
DROP POLICY IF EXISTS "perfiles_insert_all" ON perfiles_usuarios;
DROP POLICY IF EXISTS "perfiles_update_all" ON perfiles_usuarios;
DROP POLICY IF EXISTS "perfiles_delete_all" ON perfiles_usuarios;

CREATE POLICY "perfiles_select_all" ON perfiles_usuarios FOR SELECT USING (true);
CREATE POLICY "perfiles_insert_all" ON perfiles_usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "perfiles_update_all" ON perfiles_usuarios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "perfiles_delete_all" ON perfiles_usuarios FOR DELETE USING (true);

-- 2. AMPLIAR TABLA FICHAS_TECNICAS CON FORMATO ANKI (FRENTE Y DORSO)
ALTER TABLE fichas_tecnicas
    ADD COLUMN IF NOT EXISTS frente_pregunta TEXT,
    ADD COLUMN IF NOT EXISTS dorso_respuesta TEXT;

-- 3. TABLA USUARIO_FICHAS_SRS (Personalización privada y algoritmo Anki SM-2 por usuario)
CREATE TABLE IF NOT EXISTS usuario_fichas_srs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ficha_id UUID NOT NULL REFERENCES fichas_tecnicas(id) ON DELETE CASCADE,
    nota_mnemotecnica TEXT,
    imagen_url TEXT,
    imagen_bytes BIGINT DEFAULT 0,
    intervalo_dias INT DEFAULT 1,
    factor_facilidad NUMERIC(4, 2) DEFAULT 2.50,
    repeticiones INT DEFAULT 0,
    proximo_repaso TIMESTAMPTZ DEFAULT NOW(),
    ultima_revision TIMESTAMPTZ,
    eliminada_por_usuario BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, ficha_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_fichas_user ON usuario_fichas_srs(user_id);
CREATE INDEX IF NOT EXISTS idx_usuario_fichas_repaso ON usuario_fichas_srs(user_id, proximo_repaso);
CREATE INDEX IF NOT EXISTS idx_usuario_fichas_ficha ON usuario_fichas_srs(ficha_id);

ALTER TABLE usuario_fichas_srs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_fichas_all" ON usuario_fichas_srs;
CREATE POLICY "usuario_fichas_all" ON usuario_fichas_srs FOR ALL USING (true) WITH CHECK (true);

-- 4. BUCKET DE STORAGE PARA FOTOS COMPRIMIDAS DE FICHAS (fichas-imagenes)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fichas-imagenes', 'fichas-imagenes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "fichas_imagenes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "fichas_imagenes_insert" ON storage.objects;
DROP POLICY IF EXISTS "fichas_imagenes_update" ON storage.objects;
DROP POLICY IF EXISTS "fichas_imagenes_delete" ON storage.objects;

CREATE POLICY "fichas_imagenes_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'fichas-imagenes');

CREATE POLICY "fichas_imagenes_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'fichas-imagenes');

CREATE POLICY "fichas_imagenes_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'fichas-imagenes');

CREATE POLICY "fichas_imagenes_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'fichas-imagenes');

-- 5. FUNCIÓN RPC: OBTENER USO REAL DE MEMORIA EN SUPABASE
CREATE OR REPLACE FUNCTION obtener_uso_memoria_supabase()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    db_size_bytes BIGINT := 0;
    storage_size_bytes BIGINT := 0;
BEGIN
    -- Tamaño real de la base de datos
    SELECT pg_database_size(current_database()) INTO db_size_bytes;
    
    -- Tamaño total de objetos en Storage
    BEGIN
        SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
        INTO storage_size_bytes
        FROM storage.objects;
    EXCEPTION WHEN OTHERS THEN
        storage_size_bytes := 0;
    END;
    
    RETURN jsonb_build_object(
        'dbBytes', db_size_bytes,
        'dbMB', ROUND(db_size_bytes / 1048576.0, 2),
        'dbMaxMB', 500,
        'storageBytes', storage_size_bytes,
        'storageMB', ROUND(storage_size_bytes / 1048576.0, 2),
        'storageMaxMB', 1000
    );
END;
$$;
