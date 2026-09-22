-- Post appearances: immutable published appearance snapshot per post
CREATE TABLE IF NOT EXISTS public.post_appearances (
  post_id           uuid PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  author_type       text NOT NULL,
  author_id         uuid NOT NULL,
  source_profile_id uuid,  -- attribution only, not a live render dependency
  template_id       text NOT NULL,
  template_version  integer NOT NULL DEFAULT 1,
  schema_version    integer NOT NULL DEFAULT 1,
  snapshot          jsonb NOT NULL DEFAULT '{}',
  snapshot_hash     text,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'neutralized', 'fallback')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS post_appearances_author_idx
  ON public.post_appearances (author_id, template_id);

CREATE INDEX IF NOT EXISTS post_appearances_template_idx
  ON public.post_appearances (template_id, template_version);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_post_appearances_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_appearances_updated_at
  BEFORE UPDATE ON public.post_appearances
  FOR EACH ROW EXECUTE FUNCTION public.set_post_appearances_updated_at();

-- Enable RLS
ALTER TABLE public.post_appearances ENABLE ROW LEVEL SECURITY;

-- Readable wherever the parent post is readable (public posts only for now)
-- Post authors can always read their own
CREATE POLICY "post_appearances_select_public"
  ON public.post_appearances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id
        AND (p.visibility = 'public' OR p.user_id = auth.uid())
    )
  );

-- Only the post author can insert
CREATE POLICY "post_appearances_insert_own"
  ON public.post_appearances FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- Only the post author can update
CREATE POLICY "post_appearances_update_own"
  ON public.post_appearances FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );
