-- Post style profiles: reusable styles owned by a user/account
CREATE TABLE IF NOT EXISTS public.post_style_profiles (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  owner_type        text NOT NULL CHECK (owner_type IN ('general', 'artist', 'venue', 'organization', 'admin')),
  owner_id          uuid NOT NULL,
  name              text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  template_id       text NOT NULL,
  template_version  integer NOT NULL DEFAULT 1,
  schema_version    integer NOT NULL DEFAULT 1,
  configuration     jsonb NOT NULL DEFAULT '{}',
  approved_assets   jsonb NOT NULL DEFAULT '[]',
  is_default        boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_style_profiles_config_size CHECK (
    octet_length(configuration::text) <= 65536
  ),
  CONSTRAINT post_style_profiles_schema_version_range CHECK (
    schema_version >= 1 AND schema_version <= 10
  )
);

-- One active default per owner
CREATE UNIQUE INDEX IF NOT EXISTS post_style_profiles_one_default
  ON public.post_style_profiles (owner_type, owner_id)
  WHERE (is_default = true AND status = 'active');

-- Fast lookup by owner
CREATE INDEX IF NOT EXISTS post_style_profiles_owner_idx
  ON public.post_style_profiles (owner_type, owner_id, status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_post_style_profiles_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER post_style_profiles_updated_at
  BEFORE UPDATE ON public.post_style_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_post_style_profiles_updated_at();

-- Enable RLS
ALTER TABLE public.post_style_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: owners can CRUD their own profiles
CREATE POLICY "post_style_profiles_select_own"
  ON public.post_style_profiles FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "post_style_profiles_insert_own"
  ON public.post_style_profiles FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "post_style_profiles_update_own"
  ON public.post_style_profiles FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "post_style_profiles_delete_own"
  ON public.post_style_profiles FOR DELETE
  USING (created_by = auth.uid());
