-- Site Map System Migration
-- Interactive site maps for festival vendors and logistics management

-- =============================================================================
-- SITE MAPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Map dimensions and settings
    width INTEGER NOT NULL DEFAULT 1000,
    height INTEGER NOT NULL DEFAULT 1000,
    scale DECIMAL(10,2) DEFAULT 1.0, -- meters per pixel
    
    -- Map metadata
    background_image_url TEXT,
    background_color VARCHAR(7) DEFAULT '#f8f9fa',
    grid_enabled BOOLEAN DEFAULT true,
    grid_size INTEGER DEFAULT 20,
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    requires_auth BOOLEAN DEFAULT true,
    
    -- Status and versioning
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    version INTEGER DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT valid_dimensions CHECK (width > 0 AND height > 0),
    CONSTRAINT valid_scale CHECK (scale > 0)
);

-- =============================================================================
-- SITE MAP ZONES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_map_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    
    -- Zone identification
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(100) NOT NULL CHECK (zone_type IN (
        'glamping', 'parking', 'vendor', 'food', 'restroom', 'utility', 
        'entrance', 'exit', 'stage', 'medical', 'security', 'storage', 'other'
    )),
    
    -- Position and dimensions
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    rotation DECIMAL(5,2) DEFAULT 0.0,
    
    -- Visual properties
    color VARCHAR(7) DEFAULT '#3b82f6',
    border_color VARCHAR(7) DEFAULT '#1e40af',
    border_width INTEGER DEFAULT 2,
    opacity DECIMAL(3,2) DEFAULT 1.0,
    
    -- Zone properties
    capacity INTEGER,
    current_occupancy INTEGER DEFAULT 0,
    power_available BOOLEAN DEFAULT false,
    water_available BOOLEAN DEFAULT false,
    internet_available BOOLEAN DEFAULT false,
    
    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[], -- Array of tags for filtering
    
    -- Status
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'closed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_position CHECK (x >= 0 AND y >= 0),
    CONSTRAINT valid_size CHECK (width > 0 AND height > 0),
    CONSTRAINT valid_capacity CHECK (capacity IS NULL OR capacity > 0),
    CONSTRAINT valid_occupancy CHECK (current_occupancy >= 0 AND (capacity IS NULL OR current_occupancy <= capacity))
);

-- =============================================================================
-- GLAMPING TENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS glamping_tents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES site_map_zones(id) ON DELETE SET NULL,
    
    -- Tent identification
    tent_number VARCHAR(50) NOT NULL,
    tent_type VARCHAR(100) NOT NULL CHECK (tent_type IN (
        'bell_tent', 'safari_tent', 'yurt', 'tipi', 'dome', 'cabin', 'custom'
    )),
    
    -- Tent specifications
    capacity INTEGER NOT NULL,
    size_category VARCHAR(50) CHECK (size_category IN ('1Q', '2T', '4T', '4C', '6P', '8P', 'custom')),
    
    -- Position within zone
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 100,
    height INTEGER DEFAULT 100,
    rotation DECIMAL(5,2) DEFAULT 0.0,
    
    -- Tent status and booking
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
    guest_name VARCHAR(255),
    guest_phone VARCHAR(50),
    guest_email VARCHAR(255),
    check_in_date DATE,
    check_out_date DATE,
    
    -- Amenities and features
    has_power BOOLEAN DEFAULT false,
    has_heating BOOLEAN DEFAULT false,
    has_cooling BOOLEAN DEFAULT false,
    has_private_bathroom BOOLEAN DEFAULT false,
    has_wifi BOOLEAN DEFAULT false,
    
    -- Pricing
    base_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    
    -- Maintenance and notes
    last_cleaned TIMESTAMP WITH TIME ZONE,
    maintenance_notes TEXT,
    special_requirements TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_capacity CHECK (capacity > 0),
    CONSTRAINT valid_position CHECK (x >= 0 AND y >= 0),
    CONSTRAINT valid_size CHECK (width > 0 AND height > 0),
    CONSTRAINT valid_dates CHECK (check_out_date IS NULL OR check_in_date IS NULL OR check_out_date >= check_in_date),
    CONSTRAINT valid_pricing CHECK (base_price IS NULL OR base_price >= 0),
    CONSTRAINT valid_current_price CHECK (current_price IS NULL OR current_price >= 0)
);

-- =============================================================================
-- SITE MAP ELEMENTS TABLE (for custom shapes, paths, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_map_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    
    -- Element identification
    name VARCHAR(255),
    element_type VARCHAR(100) NOT NULL CHECK (element_type IN (
        'path', 'road', 'fence', 'tree', 'building', 'utility_line', 'water_source', 
        'power_station', 'waste_disposal', 'sign', 'marker', 'custom'
    )),
    
    -- Position and geometry
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER DEFAULT 0,
    height INTEGER DEFAULT 0,
    rotation DECIMAL(5,2) DEFAULT 0.0,
    
    -- Visual properties
    color VARCHAR(7) DEFAULT '#000000',
    stroke_color VARCHAR(7),
    stroke_width INTEGER DEFAULT 1,
    opacity DECIMAL(3,2) DEFAULT 1.0,
    
    -- Shape data (for complex shapes)
    path_data TEXT, -- SVG path data for custom shapes
    shape_data JSONB, -- Additional shape properties
    
    -- Properties
    properties JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_position CHECK (x >= 0 AND y >= 0),
    CONSTRAINT valid_size CHECK (width >= 0 AND height >= 0)
);

-- =============================================================================
-- SITE MAP COLLABORATORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_map_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Permissions
    can_edit BOOLEAN DEFAULT false,
    can_manage_tents BOOLEAN DEFAULT false,
    can_manage_zones BOOLEAN DEFAULT false,
    can_invite_users BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    
    -- Access control
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(site_map_id, user_id)
);

-- =============================================================================
-- SITE MAP ACTIVITY LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_map_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Activity details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'zone', 'tent', 'element', 'collaborator'
    entity_id UUID,
    
    -- Change data
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Site maps indexes
CREATE INDEX IF NOT EXISTS idx_site_maps_event_id ON site_maps(event_id);
CREATE INDEX IF NOT EXISTS idx_site_maps_tour_id ON site_maps(tour_id);
CREATE INDEX IF NOT EXISTS idx_site_maps_status ON site_maps(status);
CREATE INDEX IF NOT EXISTS idx_site_maps_created_by ON site_maps(created_by);

-- Site map zones indexes
CREATE INDEX IF NOT EXISTS idx_site_map_zones_site_map_id ON site_map_zones(site_map_id);
CREATE INDEX IF NOT EXISTS idx_site_map_zones_type ON site_map_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_site_map_zones_status ON site_map_zones(status);
CREATE INDEX IF NOT EXISTS idx_site_map_zones_position ON site_map_zones(x, y);

-- Glamping tents indexes
CREATE INDEX IF NOT EXISTS idx_glamping_tents_site_map_id ON glamping_tents(site_map_id);
CREATE INDEX IF NOT EXISTS idx_glamping_tents_zone_id ON glamping_tents(zone_id);
CREATE INDEX IF NOT EXISTS idx_glamping_tents_status ON glamping_tents(status);
CREATE INDEX IF NOT EXISTS idx_glamping_tents_tent_number ON glamping_tents(tent_number);
CREATE INDEX IF NOT EXISTS idx_glamping_tents_dates ON glamping_tents(check_in_date, check_out_date);

-- Site map elements indexes
CREATE INDEX IF NOT EXISTS idx_site_map_elements_site_map_id ON site_map_elements(site_map_id);
CREATE INDEX IF NOT EXISTS idx_site_map_elements_type ON site_map_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_site_map_elements_position ON site_map_elements(x, y);

-- Collaborators indexes
CREATE INDEX IF NOT EXISTS idx_site_map_collaborators_site_map_id ON site_map_collaborators(site_map_id);
CREATE INDEX IF NOT EXISTS idx_site_map_collaborators_user_id ON site_map_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_site_map_collaborators_active ON site_map_collaborators(is_active);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_site_map_activity_site_map_id ON site_map_activity_log(site_map_id);
CREATE INDEX IF NOT EXISTS idx_site_map_activity_user_id ON site_map_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_site_map_activity_created_at ON site_map_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_site_map_activity_entity ON site_map_activity_log(entity_type, entity_id);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE site_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_map_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE glamping_tents ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_map_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_map_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_map_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view public site maps" ON site_maps;
DROP POLICY IF EXISTS "Users can manage their own site maps" ON site_maps;
DROP POLICY IF EXISTS "Collaborators can view site maps" ON site_maps;

-- Site maps policies
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

-- Site map zones policies
CREATE POLICY "Users can view zones for accessible site maps" ON site_map_zones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND (
                is_public = true OR 
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
            AND can_manage_zones = true
        )
    );

-- Glamping tents policies
CREATE POLICY "Users can view tents for accessible site maps" ON glamping_tents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND (
                is_public = true OR 
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
            AND can_manage_tents = true
        )
    );

-- Site map elements policies
CREATE POLICY "Users can view elements for accessible site maps" ON site_map_elements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND (
                is_public = true OR 
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

-- Collaborators policies
CREATE POLICY "Users can view collaborators for their site maps" ON site_map_collaborators
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND auth.uid() = created_by
        )
    );

CREATE POLICY "Site map owners can manage collaborators" ON site_map_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_maps 
            WHERE id = site_map_id AND auth.uid() = created_by
        )
    );

-- Activity log policies
CREATE POLICY "Users can view activity for accessible site maps" ON site_map_activity_log
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

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_site_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_site_maps_updated_at ON site_maps;
CREATE TRIGGER trigger_update_site_maps_updated_at
    BEFORE UPDATE ON site_maps
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_site_map_zones_updated_at ON site_map_zones;
CREATE TRIGGER trigger_update_site_map_zones_updated_at
    BEFORE UPDATE ON site_map_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_glamping_tents_updated_at ON glamping_tents;
CREATE TRIGGER trigger_update_glamping_tents_updated_at
    BEFORE UPDATE ON glamping_tents
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_site_map_elements_updated_at ON site_map_elements;
CREATE TRIGGER trigger_update_site_map_elements_updated_at
    BEFORE UPDATE ON site_map_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

-- Activity logging trigger
CREATE OR REPLACE FUNCTION log_site_map_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_map_activity_log (
        site_map_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.site_map_id, OLD.site_map_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply activity logging to relevant tables
DROP TRIGGER IF EXISTS trigger_log_site_map_zones_activity ON site_map_zones;
CREATE TRIGGER trigger_log_site_map_zones_activity
    AFTER INSERT OR UPDATE OR DELETE ON site_map_zones
    FOR EACH ROW
    EXECUTE FUNCTION log_site_map_activity();

DROP TRIGGER IF EXISTS trigger_log_glamping_tents_activity ON glamping_tents;
CREATE TRIGGER trigger_log_glamping_tents_activity
    AFTER INSERT OR UPDATE OR DELETE ON glamping_tents
    FOR EACH ROW
    EXECUTE FUNCTION log_site_map_activity();

DROP TRIGGER IF EXISTS trigger_log_site_map_elements_activity ON site_map_elements;
CREATE TRIGGER trigger_log_site_map_elements_activity
    AFTER INSERT OR UPDATE OR DELETE ON site_map_elements
    FOR EACH ROW
    EXECUTE FUNCTION log_site_map_activity();

-- =============================================================================
-- EQUIPMENT AND RENTAL MANAGEMENT TABLES
-- =============================================================================

-- Equipment catalog table
CREATE TABLE IF NOT EXISTS equipment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID, -- Optional vendor association
    
    -- Equipment identification
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'sound', 'lighting', 'stage', 'power', 'generator', 'tent', 'furniture',
        'catering', 'security', 'transportation', 'decor', 'custom'
    )),
    subcategory VARCHAR(100), -- e.g., 'speaker', 'amplifier', 'mixer'
    
    -- Equipment specifications
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    dimensions JSONB, -- {width, height, depth} in meters
    weight DECIMAL(8,2), -- in kg
    power_consumption INTEGER, -- in watts
    voltage_requirements VARCHAR(50), -- e.g., '110V', '220V', '12V'
    
    -- Visual representation
    symbol_type VARCHAR(50) DEFAULT 'rectangle', -- rectangle, circle, triangle, custom
    symbol_color VARCHAR(7) DEFAULT '#3b82f6',
    symbol_size INTEGER DEFAULT 40, -- base size in pixels
    icon_name VARCHAR(100), -- FontAwesome or custom icon name
    custom_shape_data JSONB, -- For custom SVG shapes
    
    -- Equipment properties
    is_portable BOOLEAN DEFAULT true,
    requires_setup BOOLEAN DEFAULT false,
    setup_time_minutes INTEGER DEFAULT 0,
    requires_power BOOLEAN DEFAULT false,
    requires_water BOOLEAN DEFAULT false,
    requires_internet BOOLEAN DEFAULT false,
    weather_resistant BOOLEAN DEFAULT false,
    
    -- Rental information
    daily_rate DECIMAL(10,2),
    weekly_rate DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    availability_status VARCHAR(50) DEFAULT 'available' CHECK (availability_status IN (
        'available', 'rented', 'maintenance', 'reserved', 'out_of_service'
    )),
    
    -- Documentation
    description TEXT,
    setup_instructions TEXT,
    maintenance_notes TEXT,
    image_url TEXT,
    manual_url TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Equipment instances table (specific pieces of equipment)
CREATE TABLE IF NOT EXISTS equipment_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    catalog_id UUID NOT NULL REFERENCES equipment_catalog(id) ON DELETE CASCADE,
    
    -- Instance identification
    serial_number VARCHAR(255),
    asset_tag VARCHAR(255),
    instance_name VARCHAR(255), -- e.g., "Main Stage Speaker 1"
    
    -- Position on site map
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER DEFAULT 40,
    height INTEGER DEFAULT 40,
    rotation DECIMAL(5,2) DEFAULT 0.0,
    
    -- Status and assignment
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN (
        'available', 'in_use', 'setup', 'maintenance', 'packed', 'damaged'
    )),
    assigned_to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Setup information
    setup_start_time TIMESTAMP WITH TIME ZONE,
    setup_completed_time TIMESTAMP WITH TIME ZONE,
    setup_notes TEXT,
    
    -- Power and utility connections
    power_source_id UUID, -- Reference to power equipment
    power_cable_length INTEGER, -- in meters
    connected_to_network BOOLEAN DEFAULT false,
    
    -- Rental information
    rental_start_date DATE,
    rental_end_date DATE,
    rental_rate DECIMAL(10,2),
    customer_name VARCHAR(255),
    customer_contact VARCHAR(255),
    
    -- Maintenance
    last_inspection_date DATE,
    next_inspection_date DATE,
    maintenance_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment setup workflows
CREATE TABLE IF NOT EXISTS equipment_setup_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Workflow settings
    is_template BOOLEAN DEFAULT false,
    estimated_duration_minutes INTEGER,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN (
        'planned', 'in_progress', 'completed', 'cancelled', 'on_hold'
    )),
    
    -- Timing
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Assignment
    assigned_team_leader UUID REFERENCES profiles(id) ON DELETE SET NULL,
    team_members UUID[], -- Array of user IDs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Equipment setup tasks
CREATE TABLE IF NOT EXISTS equipment_setup_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES equipment_setup_workflows(id) ON DELETE CASCADE,
    equipment_instance_id UUID REFERENCES equipment_instances(id) ON DELETE SET NULL,
    
    -- Task details
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100) CHECK (task_type IN (
        'setup', 'positioning', 'power_connection', 'testing', 'calibration',
        'network_setup', 'safety_check', 'documentation', 'custom'
    )),
    
    -- Task requirements
    estimated_duration_minutes INTEGER,
    required_tools TEXT[], -- Array of required tools
    required_skills TEXT[], -- Array of required skills
    dependencies UUID[], -- Array of task IDs that must complete first
    
    -- Status and assignment
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'skipped', 'failed'
    )),
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 2, -- 1=high, 2=medium, 3=low
    
    -- Timing
    scheduled_start_time TIMESTAMP WITH TIME ZONE,
    scheduled_end_time TIMESTAMP WITH TIME ZONE,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Results
    completion_notes TEXT,
    issues_encountered TEXT,
    photos TEXT[], -- Array of photo URLs
    
    -- Position in workflow
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Power and utility management
CREATE TABLE IF NOT EXISTS power_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_map_id UUID NOT NULL REFERENCES site_maps(id) ON DELETE CASCADE,
    
    -- Power source identification
    name VARCHAR(255) NOT NULL,
    power_type VARCHAR(100) NOT NULL CHECK (power_type IN (
        'generator', 'main_power', 'solar', 'battery', 'ups'
    )),
    
    -- Power specifications
    total_capacity_watts INTEGER NOT NULL,
    available_capacity_watts INTEGER NOT NULL,
    voltage_output VARCHAR(50) NOT NULL,
    phase_type VARCHAR(50) DEFAULT 'single', -- single, three-phase
    
    -- Position on site map
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER DEFAULT 60,
    height INTEGER DEFAULT 60,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN (
        'active', 'maintenance', 'offline', 'overloaded'
    )),
    
    -- Connections
    max_connections INTEGER DEFAULT 10,
    current_connections INTEGER DEFAULT 0,
    
    -- Fuel/energy information
    fuel_type VARCHAR(100), -- diesel, gasoline, propane, etc.
    fuel_level_percentage INTEGER, -- 0-100
    estimated_runtime_hours INTEGER,
    
    -- Monitoring
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment power connections
CREATE TABLE IF NOT EXISTS equipment_power_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_instance_id UUID NOT NULL REFERENCES equipment_instances(id) ON DELETE CASCADE,
    power_source_id UUID NOT NULL REFERENCES power_distribution(id) ON DELETE CASCADE,
    
    -- Connection details
    connection_type VARCHAR(100), -- direct, cable, distribution_box
    cable_length INTEGER, -- in meters
    power_draw_watts INTEGER NOT NULL,
    voltage_required VARCHAR(50),
    
    -- Connection status
    is_connected BOOLEAN DEFAULT false,
    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    
    -- Safety and monitoring
    is_gfci_protected BOOLEAN DEFAULT false,
    last_safety_check TIMESTAMP WITH TIME ZONE,
    safety_check_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR EQUIPMENT TABLES
-- =============================================================================

-- Equipment catalog indexes
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_category ON equipment_catalog(category);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_vendor_id ON equipment_catalog(vendor_id);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_status ON equipment_catalog(availability_status);
CREATE INDEX IF NOT EXISTS idx_equipment_catalog_created_by ON equipment_catalog(created_by);

-- Equipment instances indexes
CREATE INDEX IF NOT EXISTS idx_equipment_instances_site_map_id ON equipment_instances(site_map_id);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_catalog_id ON equipment_instances(catalog_id);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_status ON equipment_instances(status);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_position ON equipment_instances(x, y);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_assigned_to ON equipment_instances(assigned_to_user_id);

-- Setup workflows indexes
CREATE INDEX IF NOT EXISTS idx_equipment_setup_workflows_site_map_id ON equipment_setup_workflows(site_map_id);
CREATE INDEX IF NOT EXISTS idx_equipment_setup_workflows_status ON equipment_setup_workflows(status);
CREATE INDEX IF NOT EXISTS idx_equipment_setup_workflows_team_leader ON equipment_setup_workflows(assigned_team_leader);

-- Setup tasks indexes
CREATE INDEX IF NOT EXISTS idx_equipment_setup_tasks_workflow_id ON equipment_setup_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_equipment_setup_tasks_equipment_id ON equipment_setup_tasks(equipment_instance_id);
CREATE INDEX IF NOT EXISTS idx_equipment_setup_tasks_status ON equipment_setup_tasks(status);
CREATE INDEX IF NOT EXISTS idx_equipment_setup_tasks_assigned_to ON equipment_setup_tasks(assigned_to);

-- Power distribution indexes
CREATE INDEX IF NOT EXISTS idx_power_distribution_site_map_id ON power_distribution(site_map_id);
CREATE INDEX IF NOT EXISTS idx_power_distribution_status ON power_distribution(status);
CREATE INDEX IF NOT EXISTS idx_power_distribution_position ON power_distribution(x, y);

-- Power connections indexes
CREATE INDEX IF NOT EXISTS idx_equipment_power_connections_equipment_id ON equipment_power_connections(equipment_instance_id);
CREATE INDEX IF NOT EXISTS idx_equipment_power_connections_power_source_id ON equipment_power_connections(power_source_id);
CREATE INDEX IF NOT EXISTS idx_equipment_power_connections_status ON equipment_power_connections(is_connected);

-- =============================================================================
-- RLS POLICIES FOR EQUIPMENT TABLES
-- =============================================================================

-- Enable RLS on equipment tables
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_setup_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_setup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_power_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view equipment catalog" ON equipment_catalog;
DROP POLICY IF EXISTS "Users can manage their own equipment" ON equipment_catalog;
DROP POLICY IF EXISTS "Users can view equipment instances for accessible site maps" ON equipment_instances;
DROP POLICY IF EXISTS "Collaborators can manage equipment instances" ON equipment_instances;
DROP POLICY IF EXISTS "Users can view workflows for accessible site maps" ON equipment_setup_workflows;
DROP POLICY IF EXISTS "Collaborators can manage workflows" ON equipment_setup_workflows;
DROP POLICY IF EXISTS "Users can view tasks for accessible workflows" ON equipment_setup_tasks;
DROP POLICY IF EXISTS "Collaborators can manage tasks" ON equipment_setup_tasks;
DROP POLICY IF EXISTS "Users can view power distribution for accessible site maps" ON power_distribution;
DROP POLICY IF EXISTS "Collaborators can manage power distribution" ON power_distribution;
DROP POLICY IF EXISTS "Users can view power connections for accessible equipment" ON equipment_power_connections;
DROP POLICY IF EXISTS "Collaborators can manage power connections" ON equipment_power_connections;

-- Equipment catalog policies
CREATE POLICY "Users can view equipment catalog" ON equipment_catalog
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own equipment" ON equipment_catalog
    FOR ALL USING (auth.uid() = created_by);

-- Equipment instances policies
CREATE POLICY "Users can view equipment instances for accessible site maps" ON equipment_instances
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

CREATE POLICY "Collaborators can manage equipment instances" ON equipment_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = equipment_instances.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Setup workflows policies
CREATE POLICY "Users can view workflows for accessible site maps" ON equipment_setup_workflows
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

CREATE POLICY "Collaborators can manage workflows" ON equipment_setup_workflows
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = equipment_setup_workflows.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Setup tasks policies
CREATE POLICY "Users can view tasks for accessible workflows" ON equipment_setup_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM equipment_setup_workflows ew
            JOIN site_maps sm ON ew.site_map_id = sm.id
            WHERE ew.id = workflow_id AND (
                auth.uid() = sm.created_by OR
                EXISTS (
                    SELECT 1 FROM site_map_collaborators 
                    WHERE site_map_id = sm.id AND user_id = auth.uid() AND is_active = true
                )
            )
        )
    );

CREATE POLICY "Collaborators can manage tasks" ON equipment_setup_tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM equipment_setup_workflows ew
            JOIN site_map_collaborators smc ON ew.site_map_id = smc.site_map_id
            WHERE ew.id = workflow_id 
            AND smc.user_id = auth.uid() 
            AND smc.is_active = true 
            AND smc.can_edit = true
        )
    );

-- Power distribution policies
CREATE POLICY "Users can view power distribution for accessible site maps" ON power_distribution
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

CREATE POLICY "Collaborators can manage power distribution" ON power_distribution
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM site_map_collaborators 
            WHERE site_map_id = power_distribution.site_map_id 
            AND user_id = auth.uid() 
            AND is_active = true 
            AND can_edit = true
        )
    );

-- Power connections policies
CREATE POLICY "Users can view power connections for accessible equipment" ON equipment_power_connections
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

CREATE POLICY "Collaborators can manage power connections" ON equipment_power_connections
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

-- =============================================================================
-- TRIGGERS FOR EQUIPMENT TABLES
-- =============================================================================

-- Update timestamps triggers for equipment tables
DROP TRIGGER IF EXISTS trigger_update_equipment_catalog_updated_at ON equipment_catalog;
CREATE TRIGGER trigger_update_equipment_catalog_updated_at
    BEFORE UPDATE ON equipment_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_equipment_instances_updated_at ON equipment_instances;
CREATE TRIGGER trigger_update_equipment_instances_updated_at
    BEFORE UPDATE ON equipment_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_equipment_setup_workflows_updated_at ON equipment_setup_workflows;
CREATE TRIGGER trigger_update_equipment_setup_workflows_updated_at
    BEFORE UPDATE ON equipment_setup_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_equipment_setup_tasks_updated_at ON equipment_setup_tasks;
CREATE TRIGGER trigger_update_equipment_setup_tasks_updated_at
    BEFORE UPDATE ON equipment_setup_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_power_distribution_updated_at ON power_distribution;
CREATE TRIGGER trigger_update_power_distribution_updated_at
    BEFORE UPDATE ON power_distribution
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

DROP TRIGGER IF EXISTS trigger_update_equipment_power_connections_updated_at ON equipment_power_connections;
CREATE TRIGGER trigger_update_equipment_power_connections_updated_at
    BEFORE UPDATE ON equipment_power_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_site_map_updated_at();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get site map with all related data
CREATE OR REPLACE FUNCTION get_site_map_with_data(site_map_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'site_map', to_jsonb(sm.*),
        'zones', COALESCE(
            (SELECT jsonb_agg(to_jsonb(sz.*))
             FROM site_map_zones sz
             WHERE sz.site_map_id = sm.id),
            '[]'::jsonb
        ),
        'tents', COALESCE(
            (SELECT jsonb_agg(to_jsonb(gt.*))
             FROM glamping_tents gt
             WHERE gt.site_map_id = sm.id),
            '[]'::jsonb
        ),
        'elements', COALESCE(
            (SELECT jsonb_agg(to_jsonb(sme.*))
             FROM site_map_elements sme
             WHERE sme.site_map_id = sm.id),
            '[]'::jsonb
        ),
        'collaborators', COALESCE(
            (SELECT jsonb_agg(to_jsonb(smc.*))
             FROM site_map_collaborators smc
             WHERE smc.site_map_id = sm.id AND smc.is_active = true),
            '[]'::jsonb
        )
    ) INTO result
    FROM site_maps sm
    WHERE sm.id = site_map_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit site map
CREATE OR REPLACE FUNCTION can_edit_site_map(site_map_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM site_maps sm
        LEFT JOIN site_map_collaborators smc ON sm.id = smc.site_map_id AND smc.user_id = user_uuid AND smc.is_active = true
        WHERE sm.id = site_map_uuid
        AND (sm.created_by = user_uuid OR smc.can_edit = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tent availability
CREATE OR REPLACE FUNCTION get_tent_availability(site_map_uuid UUID, check_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    tent_id UUID,
    tent_number VARCHAR,
    tent_type VARCHAR,
    status VARCHAR,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gt.id,
        gt.tent_number,
        gt.tent_type,
        gt.status,
        CASE 
            WHEN gt.status = 'available' 
                AND (gt.check_in_date IS NULL OR gt.check_in_date > check_date)
                AND (gt.check_out_date IS NULL OR gt.check_out_date <= check_date)
            THEN true
            ELSE false
        END as is_available
    FROM glamping_tents gt
    WHERE gt.site_map_id = site_map_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
