-- ═══════════════════════════════════════════════════════════════
-- VEN-188/189 — real document folder model + upload metadata fields.
--
-- Folders become persisted rows (document_folders) instead of the hardcoded
-- empty list; venue_documents gains a folder_id FK plus description (already
-- present) and event/booking scope columns for VEN-189 metadata capture.
-- RLS mirrors venue_documents ownership semantics.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.document_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid NOT NULL REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, name)
);

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_folders_owner ON public.document_folders;
CREATE POLICY document_folders_owner ON public.document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.venue_profiles vp
      WHERE vp.id = document_folders.venue_id
        AND (vp.user_id = auth.uid() OR vp.main_profile_id = auth.uid())
    )
  );

ALTER TABLE public.venue_documents
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.document_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS booking_id uuid;

CREATE INDEX IF NOT EXISTS idx_venue_documents_folder
  ON public.venue_documents (folder_id) WHERE folder_id IS NOT NULL;
