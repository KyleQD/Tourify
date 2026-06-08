# EPK Migration Guide

## How to Connect Artist Events to EPK

The EPK system is now ready to connect with your existing artist events! Here's how to set it up:

### 1. Run the EPK Migration

Copy and paste this SQL into your Supabase SQL Editor:

```sql
-- Create EPK Settings Table
CREATE TABLE IF NOT EXISTS artist_epk_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
  template TEXT DEFAULT 'modern' CHECK (template IN ('modern', 'classic', 'minimal', 'bold')),
  is_public BOOLEAN DEFAULT false,
  custom_domain TEXT,
  seo_title TEXT,
  seo_description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add EPK columns to existing artist_events table (if they don't exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_events' AND table_schema = 'public') THEN
    -- Add EPK-specific columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'is_epk_featured') THEN
      ALTER TABLE artist_events ADD COLUMN is_epk_featured BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'poster_url') THEN
      ALTER TABLE artist_events ADD COLUMN poster_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'artist_events' AND column_name = 'set_length') THEN
      ALTER TABLE artist_events ADD COLUMN set_length INTEGER;
    END IF;
  END IF;
END $$;

-- Create RLS policy for EPK settings
ALTER TABLE artist_epk_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own EPK settings"
  ON artist_epk_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own EPK settings"
  ON artist_epk_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own EPK settings"
  ON artist_epk_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Public EPK settings are viewable by everyone"
  ON artist_epk_settings FOR SELECT
  USING (is_public = true);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_artist_epk_settings_updated_at
  BEFORE UPDATE ON artist_epk_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### 2. What This Enables

After running this migration, your EPK will:

✅ **Auto-load Events**: All events from `/artist/events` will automatically appear in the EPK "Shows & Gigs" tab

✅ **Proper Event Display**: Events will show:
- Event title and type
- Venue name and location (city, state) 
- Event date and status
- Ticket URL
- Capacity and expected attendance
- Poster images (if uploaded)
- Notes and descriptions

✅ **Event Filtering**: EPK will show:
- Upcoming events (future dates)
- Recently completed events
- Proper status handling (upcoming, completed, cancelled)

✅ **Sync with Profile**: EPK data stays in sync with your artist profile

### 3. How to Use

1. **Visit `/artist/epk`** - Your EPK will now auto-load with existing events
2. **Click "Sync with Profile"** - Pulls latest profile data 
3. **Edit Events** - Go to `/artist/events` to add/edit events
4. **Featured Events** - Toggle `is_epk_featured` to highlight specific events in EPK
5. **Public EPK** - Toggle the "Public EPK" switch to make it shareable

### 4. Event Data Mapping

The system automatically maps your artist events to EPK format:

| Artist Events Field | EPK Display |
|---------------------|-------------|
| `title` | Event title |
| `venue_name` | Venue name |
| `venue_city`, `venue_state` | Combined location |
| `event_date` | Show date |
| `ticket_url` | Ticket link |
| `capacity` | Venue capacity |
| `expected_attendance` | Expected attendance |
| `poster_url` | Event poster |
| `notes` | Event notes |
| `is_epk_featured` | Featured event |

### 5. Next Steps

After running the migration:
1. Refresh your EPK page
2. Your existing events should now appear in the "Shows & Gigs" tab
3. Use the "Sync with Profile" button to ensure all data is current
4. Create new events in `/artist/events` and they'll automatically appear in the EPK

The EPK will gracefully handle missing tables and continue to work even if some features aren't available yet. 