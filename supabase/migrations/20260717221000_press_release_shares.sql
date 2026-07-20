-- Press release selective sharing audit table

CREATE TABLE IF NOT EXISTS public.press_release_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  press_post_id UUID NOT NULL REFERENCES public.artist_blog_posts(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  downloaded_at TIMESTAMPTZ,
  UNIQUE (press_post_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_press_release_shares_recipient
  ON public.press_release_shares (recipient_user_id, shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_press_release_shares_post
  ON public.press_release_shares (press_post_id, shared_at DESC);

ALTER TABLE public.press_release_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS press_release_shares_select ON public.press_release_shares;
CREATE POLICY press_release_shares_select
  ON public.press_release_shares
  FOR SELECT
  USING (auth.uid() = shared_by OR auth.uid() = recipient_user_id);

DROP POLICY IF EXISTS press_release_shares_insert ON public.press_release_shares;
CREATE POLICY press_release_shares_insert
  ON public.press_release_shares
  FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

DROP POLICY IF EXISTS press_release_shares_update ON public.press_release_shares;
CREATE POLICY press_release_shares_update
  ON public.press_release_shares
  FOR UPDATE
  USING (auth.uid() = shared_by OR auth.uid() = recipient_user_id);

COMMENT ON TABLE public.press_release_shares IS 'Tracks press release shares to specific users for authz and PDF access';
