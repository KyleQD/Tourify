-- Append-only revision history for post appearance changes
CREATE TABLE IF NOT EXISTS public.post_appearance_revisions (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  post_id       uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  revision      integer NOT NULL,
  snapshot      jsonb NOT NULL DEFAULT '{}',
  changed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_appearance_revisions_unique_revision
    UNIQUE (post_id, revision)
);

CREATE INDEX IF NOT EXISTS post_appearance_revisions_post_idx
  ON public.post_appearance_revisions (post_id, revision DESC);

-- Enable RLS — append-only: no UPDATE or DELETE policies
ALTER TABLE public.post_appearance_revisions ENABLE ROW LEVEL SECURITY;

-- Only the post author or the changer can read revisions
CREATE POLICY "post_appearance_revisions_select_own"
  ON public.post_appearance_revisions FOR SELECT
  USING (changed_by = auth.uid());

-- Insert only — no update/delete policies (append-only)
CREATE POLICY "post_appearance_revisions_insert_own"
  ON public.post_appearance_revisions FOR INSERT
  WITH CHECK (changed_by = auth.uid());
