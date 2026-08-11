-- ═══════════════════════════════════════════════════════════════
-- Migration: Venue Kit Settings
-- Adds enrichment columns to venue_profiles and creates
-- venue_kit_settings table (Venue Kit = venue EPK equivalent)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. Enrich venue_profiles with content + Venue Kit columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venue_profiles
  ADD COLUMN IF NOT EXISTS tagline              TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood         TEXT,
  ADD COLUMN IF NOT EXISTS capacity_standing    INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_seated      INTEGER,
  ADD COLUMN IF NOT EXISTS capacity_total       INTEGER,
  ADD COLUMN IF NOT EXISTS amenities            TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS age_restrictions     TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours      JSONB    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_description     TEXT,
  ADD COLUMN IF NOT EXISTS keywords             TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public            BOOLEAN  DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_completion   INTEGER  DEFAULT 0,
  -- Technical spec fields (shown on Venue Kit + public profile)
  ADD COLUMN IF NOT EXISTS stage_dimensions     TEXT,
  ADD COLUMN IF NOT EXISTS sound_system         TEXT,
  ADD COLUMN IF NOT EXISTS lighting_rig         TEXT,
  ADD COLUMN IF NOT EXISTS loading_dock         BOOLEAN  DEFAULT false,
  ADD COLUMN IF NOT EXISTS green_rooms          INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking_spots        INTEGER,
  ADD COLUMN IF NOT EXISTS curfew               TEXT,
  ADD COLUMN IF NOT EXISTS tech_rider_url       TEXT,
  ADD COLUMN IF NOT EXISTS stage_plot_url       TEXT;

-- ─────────────────────────────────────────────────────────────
-- 2. Create venue_kit_settings table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_kit_settings (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_profile_id         UUID        REFERENCES public.venue_profiles(id) ON DELETE CASCADE,
  theme                    TEXT        NOT NULL DEFAULT 'dark',
  template                 TEXT        NOT NULL DEFAULT 'modern',
  is_public                BOOLEAN     NOT NULL DEFAULT false,
  vk_slug                  TEXT,
  custom_domain            TEXT,
  seo_title                TEXT,
  seo_description          TEXT,
  use_vk_style_on_profile  BOOLEAN     NOT NULL DEFAULT false,
  -- stores: vkFont, vkAppearance (EpkAppearance), sectionOrder, sectionVisibility,
  --         upcomingShows[], press[], social[]
  settings                 JSONB       NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────

-- Unique slug (only enforced when slug is non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_kit_settings_vk_slug
  ON public.venue_kit_settings (vk_slug)
  WHERE vk_slug IS NOT NULL;

-- One kit per venue profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_kit_settings_venue_profile_id
  ON public.venue_kit_settings (venue_profile_id)
  WHERE venue_profile_id IS NOT NULL;

-- One legacy kit per user (when no venue_profile_id scoping used)
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_kit_settings_user_id_legacy
  ON public.venue_kit_settings (user_id)
  WHERE venue_profile_id IS NULL;

-- Composite index for public kit lookup by profile
CREATE INDEX IF NOT EXISTS idx_venue_kit_settings_public
  ON public.venue_kit_settings (venue_profile_id, is_public);

-- ─────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_venue_kit_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_venue_kit_settings_updated_at ON public.venue_kit_settings;
CREATE TRIGGER trg_venue_kit_settings_updated_at
  BEFORE UPDATE ON public.venue_kit_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_venue_kit_settings_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.venue_kit_settings ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD
CREATE POLICY venue_kit_settings_owner_select ON public.venue_kit_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY venue_kit_settings_owner_insert ON public.venue_kit_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY venue_kit_settings_owner_update ON public.venue_kit_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY venue_kit_settings_owner_delete ON public.venue_kit_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Public: anyone can read published kits (needed for /vk/[slug])
CREATE POLICY venue_kit_settings_public_read ON public.venue_kit_settings
  FOR SELECT USING (is_public = true);
