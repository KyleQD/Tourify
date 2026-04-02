-- Per-user artist dashboard widget order / visibility (author-scoped, RLS owner-only)
-- Aligns with docs/artist-dashboard-wireframe.md

CREATE TABLE IF NOT EXISTS public.artist_dashboard_layouts (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '{"order":["recommendations","analytics","notifications"],"hidden":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artist_dashboard_layouts_updated_at ON public.artist_dashboard_layouts (updated_at DESC);

ALTER TABLE public.artist_dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own artist dashboard layout"
  ON public.artist_dashboard_layouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own artist dashboard layout"
  ON public.artist_dashboard_layouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artist dashboard layout"
  ON public.artist_dashboard_layouts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own artist dashboard layout"
  ON public.artist_dashboard_layouts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
