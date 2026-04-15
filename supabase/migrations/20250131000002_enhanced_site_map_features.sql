set client_min_messages = warning;

-- Enhanced Site Map Features Migration
-- Phase 1: Core functionality with layers, measurements, QR codes, and version control

-- STEP 1: Create map layers table
CREATE TABLE IF NOT EXISTS map_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layer_type VARCHAR(100) NOT NULL CHECK (layer_type IN (
        'infrastructure', 'crew_zones', 'guest_areas', 'safety_zones', 
        'vip_areas', 'backstage', 'restricted', 'power', 'water', 'wifi', 'custom'
    )),
    color VARCHAR(7) DEFAULT '#3b82f6',
    opacity DECIMAL(3,2) DEFAULT 1.0,
    is_visible BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Create map versions table
CREATE TABLE IF NOT EXISTS map_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    version_name VARCHAR(255) NOT NULL,
    description TEXT,
    version_number INTEGER NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create QR codes table
CREATE TABLE IF NOT EXISTS equipment_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_instance_id UUID NOT NULL REFERENCES equipment_instances(id) ON DELETE CASCADE,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    qr_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scanned TIMESTAMP WITH TIME ZONE,
    scan_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- STEP 4: Create task assignments table
CREATE TABLE IF NOT EXISTS map_task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    element_id UUID NOT NULL,
    element_type VARCHAR(100) NOT NULL CHECK (element_type IN (
        'zone', 'tent', 'element', 'equipment_instance', 'power_distribution'
    )),
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    task_description TEXT,
    priority INTEGER DEFAULT 2,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'blocked', 'cancelled'
    )),
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 5: Create map measurements table
CREATE TABLE IF NOT EXISTS map_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    measurement_type VARCHAR(100) NOT NULL CHECK (measurement_type IN (
        'distance', 'area', 'clearance', 'fire_lane', 'ada_access', 'emergency_route'
    )),
    start_x INTEGER NOT NULL,
    start_y INTEGER NOT NULL,
    end_x INTEGER,
    end_y INTEGER,
    width INTEGER,
    height INTEGER,
    value DECIMAL(10,2),
    unit VARCHAR(20) DEFAULT 'meters',
    label VARCHAR(255),
    color VARCHAR(7) DEFAULT '#ff6b6b',
    is_compliant BOOLEAN DEFAULT true,
    compliance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 6: Create map templates table
CREATE TABLE IF NOT EXISTS map_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'festival', 'concert', 'corporate', 'wedding', 'sports', 'exhibition', 'custom'
    )),
    template_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Create issue tracking table
CREATE TABLE IF NOT EXISTS map_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL CHECK (issue_type IN (
        'safety', 'maintenance', 'logistics', 'accessibility', 'compliance', 'other'
    )),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
        'open', 'in_progress', 'resolved', 'closed'
    )),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    photos TEXT[],
    notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_map_layers_site_map_id ON map_layers(site_map_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_type ON map_layers(layer_type);
CREATE INDEX IF NOT EXISTS idx_map_layers_visible ON map_layers(is_visible);

CREATE INDEX IF NOT EXISTS idx_map_versions_site_map_id ON map_versions(site_map_id);
CREATE INDEX IF NOT EXISTS idx_map_versions_current ON map_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_map_versions_number ON map_versions(version_number);

CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_equipment_id ON equipment_qr_codes(equipment_instance_id);
CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_code ON equipment_qr_codes(qr_code);
CREATE INDEX IF NOT EXISTS idx_equipment_qr_codes_active ON equipment_qr_codes(is_active);

CREATE INDEX IF NOT EXISTS idx_map_task_assignments_site_map_id ON map_task_assignments(site_map_id);
CREATE INDEX IF NOT EXISTS idx_map_task_assignments_user_id ON map_task_assignments(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_map_task_assignments_status ON map_task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_map_task_assignments_element ON map_task_assignments(element_id, element_type);

CREATE INDEX IF NOT EXISTS idx_map_measurements_site_map_id ON map_measurements(site_map_id);
CREATE INDEX IF NOT EXISTS idx_map_measurements_type ON map_measurements(measurement_type);
CREATE INDEX IF NOT EXISTS idx_map_measurements_compliant ON map_measurements(is_compliant);

CREATE INDEX IF NOT EXISTS idx_map_templates_category ON map_templates(category);
CREATE INDEX IF NOT EXISTS idx_map_templates_public ON map_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_map_templates_created_by ON map_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_map_issues_site_map_id ON map_issues(site_map_id);
CREATE INDEX IF NOT EXISTS idx_map_issues_status ON map_issues(status);
CREATE INDEX IF NOT EXISTS idx_map_issues_severity ON map_issues(severity);
CREATE INDEX IF NOT EXISTS idx_map_issues_assigned_to ON map_issues(assigned_to);

-- STEP 9: Enable RLS on all tables
ALTER TABLE map_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_issues ENABLE ROW LEVEL SECURITY;

-- STEP 10: Create RLS policies
-- Map layers policies
CREATE POLICY "Users can view layers for accessible site maps" ON map_layers
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

CREATE POLICY "Users can manage layers for accessible site maps" ON map_layers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = map_layers.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Map versions policies
CREATE POLICY "Users can view versions for accessible site maps" ON map_versions
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

CREATE POLICY "Users can manage versions for accessible site maps" ON map_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = map_versions.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- QR codes policies
CREATE POLICY "Users can view QR codes for accessible equipment" ON equipment_qr_codes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM equipment_instances ei
            JOIN site_maps sm ON ei.site_map_id = sm.id
            WHERE ei.id = equipment_instance_id AND (
                auth.uid() = sm.created_by OR
                EXISTS (
                    SELECT 1 FROM site_map_collaborators 
                    WHERE site_map_id = sm.id AND user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

CREATE POLICY "Users can manage QR codes for accessible equipment" ON equipment_qr_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment_instances ei
            JOIN site_map_collaborators smc ON ei.site_map_id = smc.site_map_id
            WHERE ei.id = equipment_instance_id 
            AND smc.user_id = auth.uid() 
            AND smc.is_active = true 
            AND smc.can_edit = true
        )
    );

-- Task assignments policies
CREATE POLICY "Users can view task assignments for accessible site maps" ON map_task_assignments
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

CREATE POLICY "Users can manage task assignments for accessible site maps" ON map_task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = map_task_assignments.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Measurements policies
CREATE POLICY "Users can view measurements for accessible site maps" ON map_measurements
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

CREATE POLICY "Users can manage measurements for accessible site maps" ON map_measurements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = map_measurements.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Templates policies
CREATE POLICY "Users can view public templates" ON map_templates
    FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can manage their own templates" ON map_templates
    FOR ALL USING (auth.uid() = created_by);

-- Issues policies
CREATE POLICY "Users can view issues for accessible site maps" ON map_issues
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

CREATE POLICY "Users can manage issues for accessible site maps" ON map_issues
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = map_issues.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- STEP 11: Create triggers for updated_at timestamps
CREATE TRIGGER trigger_update_map_layers_updated_at
    BEFORE UPDATE ON map_layers
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

CREATE TRIGGER trigger_update_map_versions_updated_at
    BEFORE UPDATE ON map_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

CREATE TRIGGER trigger_update_map_task_assignments_updated_at
    BEFORE UPDATE ON map_task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

CREATE TRIGGER trigger_update_map_measurements_updated_at
    BEFORE UPDATE ON map_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

CREATE TRIGGER trigger_update_map_templates_updated_at
    BEFORE UPDATE ON map_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

CREATE TRIGGER trigger_update_map_issues_updated_at
    BEFORE UPDATE ON map_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

-- STEP 12: Create helper functions
CREATE OR REPLACE FUNCTION create_map_version(site_map_uuid UUID, version_name VARCHAR, description TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_version_id UUID;
    next_version_number INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version_number
    FROM map_versions
    WHERE site_map_id = site_map_uuid;
    
    -- Create new version
    INSERT INTO map_versions (site_map_id, version_name, description, version_number, created_by)
    VALUES (site_map_uuid, version_name, description, next_version_number, auth.uid())
    RETURNING id INTO new_version_id;
    
    -- Set all other versions as not current
    UPDATE map_versions 
    SET is_current = false 
    WHERE site_map_id = site_map_uuid AND id != new_version_id;
    
    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_equipment_qr_code(equipment_instance_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    qr_code TEXT;
    equipment_data JSONB;
BEGIN
    -- Get equipment data
    SELECT jsonb_build_object(
        'equipment_id', ei.id,
        'equipment_name', ei.instance_name,
        'serial_number', ei.serial_number,
        'asset_tag', ei.asset_tag,
        'catalog_name', ec.name,
        'catalog_category', ec.category,
        'site_map_id', ei.site_map_id,
        'status', ei.status,
        'location', jsonb_build_object('x', ei.x, 'y', ei.y)
    ) INTO equipment_data
    FROM equipment_instances ei
    JOIN equipment_catalog ec ON ei.catalog_id = ec.id
    WHERE ei.id = equipment_instance_uuid;
    
    -- Generate QR code (in real implementation, this would use a QR code library)
    qr_code := 'QR_' || equipment_instance_uuid::text || '_' || extract(epoch from now())::text;
    
    -- Insert QR code record
    INSERT INTO equipment_qr_codes (equipment_instance_id, qr_code, qr_data, created_by)
    VALUES (equipment_instance_uuid, qr_code, equipment_data, auth.uid());
    
    RETURN qr_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Enhanced site map features migration completed successfully!' as message;
