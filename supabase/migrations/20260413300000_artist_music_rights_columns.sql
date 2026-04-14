-- Add rights attestation columns to artist_music
ALTER TABLE public.artist_music
  ADD COLUMN IF NOT EXISTS rights_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz;

COMMENT ON COLUMN public.artist_music.rights_confirmed IS 'Whether the uploader attested they own the rights to distribute this content';
COMMENT ON COLUMN public.artist_music.rights_confirmed_at IS 'Timestamp of the rights attestation';
