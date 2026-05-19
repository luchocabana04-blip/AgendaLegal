-- ═══════════════════════════════════════════════════════════
-- AGENDA LEGAL — MARIANA SÁNCHEZ & ASOCIADOS
-- Script de base de datos para Supabase
-- Ejecutar en: Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── 1. TABLA PRINCIPAL DE EVENTOS ──────────────────────────
CREATE TABLE IF NOT EXISTS public.eventos (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'audiencia',
  date        TEXT        NOT NULL,
  start_time  TEXT        DEFAULT '09:00',
  end_time    TEXT        DEFAULT '10:00',
  lawyers     TEXT[]      DEFAULT ARRAY[]::TEXT[],
  alerts      TEXT[]      DEFAULT ARRAY[]::TEXT[],
  court       TEXT        DEFAULT '',
  exp_num     TEXT        DEFAULT '',
  notes       TEXT        DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ÍNDICES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eventos_date     ON public.eventos (date);
CREATE INDEX IF NOT EXISTS idx_eventos_type     ON public.eventos (type);
CREATE INDEX IF NOT EXISTS idx_eventos_created  ON public.eventos (created_at DESC);

-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- Política: acceso total con clave anon (ajustar si se agrega auth)
DROP POLICY IF EXISTS "Acceso total agenda" ON public.eventos;
CREATE POLICY "Acceso total agenda"
  ON public.eventos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 4. TRIGGER PARA updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eventos_updated_at ON public.eventos;
CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. HABILITAR REALTIME ───────────────────────────────────
-- (Supabase Dashboard → Database → Replication → eventos → ON)
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos;

-- ── 6. VERIFICACIÓN ────────────────────────────────────────
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'eventos'
ORDER BY ordinal_position;

-- ══════════════════════════════════════════════════════════════
-- ¡Listo! Tabla creada con realtime habilitado.
-- Ahora copiá la URL y la clave anon del proyecto
-- y pegalas en la pantalla de configuración de la app.
-- ══════════════════════════════════════════════════════════════
