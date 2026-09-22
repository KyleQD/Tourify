-- Fix 1: Widen color/stroke_color columns on site_map_elements
-- VARCHAR(7) only fits #RRGGBB, but the canvas sends rgba() and longer values
ALTER TABLE site_map_elements
  ALTER COLUMN color TYPE character varying(50),
  ALTER COLUMN stroke_color TYPE character varying(50);

-- Fix 2: Add owner write-access RLS policies on child tables
-- The existing policies only allow:
--   - SELECT for owner + collaborators
--   - ALL for collaborators with can_edit=true
-- Missing: owner (created_by) INSERT/UPDATE/DELETE on elements, zones, tents

-- site_map_elements: owner can manage all elements on their maps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_map_elements'
      AND policyname = 'Owners can manage elements'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Owners can manage elements"
        ON site_map_elements FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = site_map_elements.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = site_map_elements.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- site_map_zones: owner can manage all zones on their maps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_map_zones'
      AND policyname = 'Owners can manage zones'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Owners can manage zones"
        ON site_map_zones FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = site_map_zones.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = site_map_zones.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- glamping_tents: owner can manage all tents on their maps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'glamping_tents'
      AND policyname = 'Owners can manage tents'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Owners can manage tents"
        ON glamping_tents FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = glamping_tents.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM site_maps
            WHERE site_maps.id = glamping_tents.site_map_id
              AND site_maps.created_by = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;
