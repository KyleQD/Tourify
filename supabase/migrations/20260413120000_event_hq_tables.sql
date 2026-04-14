-- Event HQ: Resources table for shared itineraries, links, notes, files
CREATE TABLE IF NOT EXISTS event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('link', 'document', 'note', 'itinerary', 'contact', 'file')),
  url text,
  content text,
  category text,
  visible_to text[] DEFAULT ARRAY['all'],
  pinned boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_resources_event_id ON event_resources(event_id);

-- Event HQ: Shared calendar items
CREATE TABLE IF NOT EXISTS event_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  type text NOT NULL DEFAULT 'custom' CHECK (type IN ('deadline', 'meeting', 'rehearsal', 'setup', 'performance', 'load_in', 'load_out', 'soundcheck', 'doors_open', 'curfew', 'custom')),
  location text,
  assigned_to uuid[] DEFAULT ARRAY[]::uuid[],
  color text,
  is_all_day boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_calendar_items_event_id ON event_calendar_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_calendar_items_start_time ON event_calendar_items(start_time);

-- Event bulletins table (may already exist from earlier migration)
CREATE TABLE IF NOT EXISTS event_bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  priority text DEFAULT 'info' CHECK (priority IN ('info', 'important', 'urgent', 'emergency')),
  pinned boolean DEFAULT false,
  visible_to text[] DEFAULT ARRAY['all'],
  requires_acknowledgment boolean DEFAULT false,
  read_by uuid[] DEFAULT ARRAY[]::uuid[],
  acknowledged_by uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_bulletins_event_id ON event_bulletins(event_id);

-- RLS policies
ALTER TABLE event_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bulletins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_resources_read" ON event_resources FOR SELECT USING (true);
CREATE POLICY "event_resources_insert" ON event_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "event_resources_delete" ON event_resources FOR DELETE USING (true);

CREATE POLICY "event_calendar_items_read" ON event_calendar_items FOR SELECT USING (true);
CREATE POLICY "event_calendar_items_insert" ON event_calendar_items FOR INSERT WITH CHECK (true);
CREATE POLICY "event_calendar_items_delete" ON event_calendar_items FOR DELETE USING (true);

CREATE POLICY "event_bulletins_read" ON event_bulletins FOR SELECT USING (true);
CREATE POLICY "event_bulletins_insert" ON event_bulletins FOR INSERT WITH CHECK (true);
CREATE POLICY "event_bulletins_update" ON event_bulletins FOR UPDATE USING (true);
CREATE POLICY "event_bulletins_delete" ON event_bulletins FOR DELETE USING (true);
