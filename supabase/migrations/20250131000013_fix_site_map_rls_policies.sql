-- Fix RLS policies for site_maps table
-- This fixes the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own site maps" ON site_maps;
DROP POLICY IF EXISTS "Users can view public site maps" ON site_maps;
DROP POLICY IF EXISTS "Collaborators can view site maps" ON site_maps;

-- Create new policies that allow INSERT operations
CREATE POLICY "Users can manage their own site maps" ON site_maps
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can view public site maps" ON site_maps
    FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Collaborators can view site maps" ON site_maps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = id AND user_id = auth.uid() AND is_active = true
        )
    );

-- Fix the activity log table policies
DROP POLICY IF EXISTS "Users can log activity for their site maps" ON site_map_activity_log;
CREATE POLICY "Users can log activity for their site maps" ON site_map_activity_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND (
                auth.uid() = created_by OR
                EXISTS (
                    SELECT 1 FROM site_map_collaborators 
                    WHERE site_map_id = site_maps.id AND user_id = auth.uid() AND is_active = true
                )
            )
        )
    );
