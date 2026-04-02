-- Add Sample Data for News Page
-- This script adds sample events, tours, and music to populate the News feed with real content

-- First, let's add some sample events to the events table
INSERT INTO events (
  id,
  title,
  description,
  event_date,
  venue_name,
  venue_address,
  capacity,
  ticket_price,
  status,
  user_id,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Summer Music Festival 2024',
  'Join us for an incredible day of live music featuring top indie artists from around the country. Food trucks, craft beer, and amazing vibes!',
  '2024-07-15',
  'Central Park Arena',
  '123 Music Street, New York, NY 10001',
  5000,
  75.00,
  'published',
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Jazz Night at The Blue Note',
  'An intimate evening of jazz featuring local and international artists. Perfect for date night or a sophisticated evening out.',
  '2024-06-20',
  'The Blue Note',
  '456 Jazz Avenue, New York, NY 10002',
  200,
  45.00,
  'published',
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Rock Revolution Concert',
  'The biggest rock concert of the summer! Featuring multiple stages, pyrotechnics, and the hottest rock bands.',
  '2024-08-10',
  'Metropolitan Stadium',
  '789 Rock Boulevard, New York, NY 10003',
  15000,
  120.00,
  'published',
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Acoustic Sessions',
  'Unplugged and intimate acoustic performances in a cozy venue. Perfect for discovering new talent.',
  '2024-06-25',
  'The Listening Room',
  '321 Acoustic Lane, New York, NY 10004',
  150,
  25.00,
  'published',
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Electronic Dance Festival',
  'A night of electronic music, amazing light shows, and incredible energy. Multiple DJs and live electronic acts.',
  '2024-07-30',
  'Warehouse District',
  '654 Electronic Way, New York, NY 10005',
  3000,
  85.00,
  'published',
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add sample artist events
INSERT INTO artist_events (
  id,
  user_id,
  title,
  description,
  type,
  venue_name,
  venue_address,
  event_date,
  capacity,
  ticket_price_min,
  status,
  is_public,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Luna Echo Live in Concert',
  'Experience the ethereal sounds of Luna Echo in an intimate live performance. New album preview included!',
  'concert',
  'The Grand Hall',
  '987 Performance Street, New York, NY 10006',
  '2024-07-05',
  800,
  35.00,
  'upcoming',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'The Midnight Collective Tour',
  'The Midnight Collective brings their signature indie rock sound to the East Coast. Don''t miss this incredible show!',
  'tour',
  'Brooklyn Music Hall',
  '147 Tour Avenue, Brooklyn, NY 11201',
  '2024-08-15',
  1200,
  40.00,
  'upcoming',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Echo & The Bunnymen Reunion',
  'The legendary Echo & The Bunnymen reunite for one night only. Classic hits and new material from their upcoming album.',
  'concert',
  'Madison Square Garden',
  '4 Pennsylvania Plaza, New York, NY 10001',
  '2024-09-10',
  20000,
  150.00,
  'upcoming',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Indie Spotlight Showcase',
  'A showcase featuring the best up-and-coming indie artists. Discover your new favorite band!',
  'festival',
  'The Indie Venue',
  '258 Spotlight Road, New York, NY 10007',
  '2024-06-30',
  500,
  20.00,
  'upcoming',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Classical Meets Contemporary',
  'A unique fusion of classical music and contemporary sounds. Featuring the New York Philharmonic with guest artists.',
  'concert',
  'Carnegie Hall',
  '881 7th Avenue, New York, NY 10019',
  '2024-07-20',
  2804,
  75.00,
  'upcoming',
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add sample tours
INSERT INTO tours (
  id,
  name,
  description,
  artist_id,
  status,
  start_date,
  end_date,
  total_shows,
  budget,
  created_by,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Luna Echo World Tour 2024',
  'Luna Echo embarks on their first world tour, bringing their ethereal sound to fans across the globe.',
  (SELECT id FROM auth.users LIMIT 1),
  'active',
  '2024-06-01',
  '2024-12-31',
  50,
  500000.00,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'The Midnight Collective Summer Tour',
  'The Midnight Collective hits the road for their summer tour, playing intimate venues across the country.',
  (SELECT id FROM auth.users LIMIT 1),
  'planning',
  '2024-07-01',
  '2024-09-30',
  25,
  250000.00,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Echo & The Bunnymen Reunion Tour',
  'The legendary band reunites for a special reunion tour celebrating their greatest hits.',
  (SELECT id FROM auth.users LIMIT 1),
  'active',
  '2024-08-01',
  '2024-11-30',
  30,
  750000.00,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Indie Discovery Tour',
  'A curated tour featuring the best emerging indie artists. Discover new music and support independent artists.',
  (SELECT id FROM auth.users LIMIT 1),
  'planning',
  '2024-09-01',
  '2024-12-31',
  20,
  150000.00,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Electronic Dreams Festival Tour',
  'A traveling electronic music festival featuring the hottest DJs and electronic artists.',
  (SELECT id FROM auth.users LIMIT 1),
  'active',
  '2024-07-15',
  '2024-10-15',
  15,
  1000000.00,
  (SELECT id FROM auth.users LIMIT 1),
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Add sample music (if artist_music table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'artist_music' AND table_schema = 'public') THEN
    INSERT INTO artist_music (
      id,
      user_id,
      title,
      description,
      type,
      genre,
      duration,
      is_public,
      created_at,
      updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Midnight Dreams',
      'A hauntingly beautiful track that captures the essence of late-night introspection.',
      'single',
      'Indie Rock',
      240,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Echo Chamber',
      'An experimental piece that explores the boundaries of sound and space.',
      'single',
      'Electronic',
      320,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Summer Vibes',
      'The perfect summer anthem with infectious melodies and upbeat rhythms.',
      'single',
      'Pop',
      195,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Urban Jazz',
      'A modern take on classic jazz with contemporary urban influences.',
      'single',
      'Jazz',
      280,
      true,
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Rock Revolution',
      'High-energy rock that will get your blood pumping and your head banging.',
      'single',
      'Rock',
      210,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Add sample posts (if posts table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
    INSERT INTO posts (
      id,
      user_id,
      content,
      type,
      visibility,
      created_at,
      updated_at
    ) VALUES 
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Just finished recording our new album! Can''t wait to share it with you all. The creative process has been incredible and we''ve poured our hearts into every track. #NewAlbum #Music #Recording',
      'blog',
      'public',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Excited to announce our upcoming tour dates! We''ll be hitting 25 cities across the country. Check out our website for tickets and VIP packages. #Tour #LiveMusic #Concert',
      'news',
      'public',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Behind the scenes at our latest music video shoot. The team worked tirelessly to bring our vision to life. Can''t wait to show you the final result! #MusicVideo #BehindTheScenes #Creative',
      'blog',
      'public',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Industry insights: The future of independent music in the digital age. How streaming platforms are changing the game for artists. #MusicIndustry #Independent #Streaming',
      'news',
      'public',
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      (SELECT id FROM auth.users LIMIT 1),
      'Studio session today was absolutely magical. Sometimes the best music comes from unexpected moments. Grateful for these creative collaborations. #Studio #Collaboration #Music',
      'blog',
      'public',
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Update profiles with sample data if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
    UPDATE profiles 
    SET 
      primary_genres = ARRAY['Indie Rock', 'Alternative', 'Electronic'],
      interests = ARRAY['Live Music', 'Festivals', 'New Artists', 'Jazz', 'Rock'],
      location = 'New York, NY'
    WHERE id = (SELECT id FROM auth.users LIMIT 1);
  END IF;
END $$;

SELECT 'Sample news feed data added successfully!' as result; 