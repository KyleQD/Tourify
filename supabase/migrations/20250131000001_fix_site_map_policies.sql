set client_min_messages = warning;

-- Fix duplicate policy conflicts for site map system
-- This migration handles existing policies that might conflict

-- Drop ALL existing policies if they exist to avoid conflicts
-- Site maps policies
DROP POLICY IF EXISTS "Users can view public site maps" ON site_maps;
DROP POLICY IF EXISTS "Users can manage their own site maps" ON site_maps;
DROP POLICY IF EXISTS "Collaborators can view site maps" ON site_maps;

-- Site map zones policies
DROP POLICY IF EXISTS "Users can view zones for accessible site maps" ON site_map_zones;
DROP POLICY IF EXISTS "Collaborators can manage zones" ON site_map_zones;

-- Glamping tents policies
DROP POLICY IF EXISTS "Users can view tents for accessible site maps" ON glamping_tents;
DROP POLICY IF EXISTS "Collaborators can manage tents" ON glamping_tents;

-- Site map elements policies
DROP POLICY IF EXISTS "Users can view elements for accessible site maps" ON site_map_elements;
DROP POLICY IF EXISTS "Collaborators can manage elements" ON site_map_elements;

-- Site map collaborators policies
DROP POLICY IF EXISTS "Users can view collaborators for accessible site maps" ON site_map_collaborators;
DROP POLICY IF EXISTS "Collaborators can manage collaborators" ON site_map_collaborators;

-- Site map activity log policies
DROP POLICY IF EXISTS "Users can view activity log for accessible site maps" ON site_map_activity_log;

-- Equipment catalog policies
DROP POLICY IF EXISTS "Users can view equipment catalog" ON equipment_catalog;
DROP POLICY IF EXISTS "Users can manage their own equipment" ON equipment_catalog;

-- Equipment instances policies
DROP POLICY IF EXISTS "Users can view equipment instances for accessible site maps" ON equipment_instances;
DROP POLICY IF EXISTS "Collaborators can manage equipment instances" ON equipment_instances;

-- Setup workflows policies
DROP POLICY IF EXISTS "Users can view workflows for accessible site maps" ON equipment_setup_workflows;
DROP POLICY IF EXISTS "Collaborators can manage workflows" ON equipment_setup_workflows;

-- Setup tasks policies
DROP POLICY IF EXISTS "Users can view tasks for accessible workflows" ON equipment_setup_tasks;
DROP POLICY IF EXISTS "Collaborators can manage tasks" ON equipment_setup_tasks;

-- Power distribution policies
DROP POLICY IF EXISTS "Users can view power distribution for accessible site maps" ON power_distribution;
DROP POLICY IF EXISTS "Collaborators can manage power distribution" ON power_distribution;

-- Power connections policies
DROP POLICY IF EXISTS "Users can view power connections for accessible equipment" ON equipment_power_connections;
DROP POLICY IF EXISTS "Collaborators can manage power connections" ON equipment_power_connections;

-- Recreate site map policies
CREATE POLICY "Users can view public site maps" ON site_maps
    FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own site maps" ON site_maps
    FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Collaborators can view site maps" ON site_maps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = id AND user_id = auth.uid() AND is_active = true
        )
    );

-- Recreate zone policies
CREATE POLICY "Users can view zones for accessible site maps" ON site_map_zones
    FOR SELECT USING (
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

CREATE POLICY "Collaborators can manage zones" ON site_map_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = site_map_zones.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Recreate tent policies
CREATE POLICY "Users can view tents for accessible site maps" ON glamping_tents
    FOR SELECT USING (
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

CREATE POLICY "Collaborators can manage tents" ON glamping_tents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = glamping_tents.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Recreate element policies
CREATE POLICY "Users can view elements for accessible site maps" ON site_map_elements
    FOR SELECT USING (
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

CREATE POLICY "Collaborators can manage elements" ON site_map_elements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = site_map_elements.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Recreate collaborator policies
CREATE POLICY "Users can view collaborators for accessible site maps" ON site_map_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND (
                auth.uid() = created_by OR
                EXISTS (
                    SELECT 1 FROM site_map_collaborators smc
                    WHERE smc.site_map_id = site_maps.id AND smc.user_id = auth.uid() AND smc.is_active = true
                )
            )
        )
    );

CREATE POLICY "Collaborators can manage collaborators" ON site_map_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators smc
            WHERE smc.site_map_id = site_map_collaborators.site_map_id 
            AND smc.user_id = auth.uid() 
            AND smc.is_active = true 
            AND smc.can_edit = true
        )
    );

-- Recreate activity log policies
CREATE POLICY "Users can view activity log for accessible site maps" ON site_map_activity_log
    FOR SELECT USING (
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
