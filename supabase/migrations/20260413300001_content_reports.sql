-- Content reports table for DMCA/copyright and general content moderation
CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- 'music', 'post', 'event', etc.
  content_id uuid NOT NULL,
  content_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL, -- 'copyright_infringement', 'not_original_content', 'inappropriate', 'other'
  details text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_content ON public.content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_owner ON public.content_reports(content_owner_user_id);

-- Prevent duplicate pending reports from the same user for the same content
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_pending
  ON public.content_reports(reporter_user_id, content_type, content_id)
  WHERE status = 'pending';

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view own reports" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_user_id);

COMMENT ON TABLE public.content_reports IS 'DMCA and content moderation reports submitted by users';
