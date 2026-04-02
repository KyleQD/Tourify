-- Setup Blog Data for News Feed
-- This script ensures the blog posts from Sarah Johnson and Alex Chen are available

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Create Sarah Johnson's user account (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sarah.johnson@example.com') THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data
    ) VALUES (
      '550e8400-e29b-41d4-a716-446655440001',
      'sarah.johnson@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"full_name": "Sarah Johnson", "username": "sarahjohnson", "bio": "Music industry analyst and independent artist advocate. Passionate about the future of music and helping artists navigate the digital landscape.", "location": "Los Angeles, CA"}'
    );
    RAISE NOTICE '✅ Created Sarah Johnson user account';
  ELSE
    RAISE NOTICE 'ℹ️  Sarah Johnson user account already exists';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Create Alex Chen's user account (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex.chen@example.com') THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_user_meta_data
    ) VALUES (
      '550e8400-e29b-41d4-a716-446655440007',
      'alex.chen@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"full_name": "Alex Chen", "username": "alexchen", "bio": "Electronic music producer and sound designer. Creating immersive sonic experiences through innovative sound design techniques.", "location": "San Francisco, CA"}'
    );
    RAISE NOTICE '✅ Created Alex Chen user account';
  ELSE
    RAISE NOTICE 'ℹ️  Alex Chen user account already exists';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Create profiles for both users
-- =============================================================================

-- Ensure profiles table has all necessary columns
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Sarah Johnson's profile
INSERT INTO profiles (
  id,
  username,
  full_name,
  bio,
  avatar_url,
  location,
  is_verified,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'sarahjohnson',
  'Sarah Johnson',
  'Music industry analyst and independent artist advocate. Passionate about the future of music and helping artists navigate the digital landscape.',
  'https://dummyimage.com/150x150/8b5cf6/ffffff?text=SJ',
  'Los Angeles, CA',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  location = EXCLUDED.location,
  updated_at = NOW();

-- Alex Chen's profile
INSERT INTO profiles (
  id,
  username,
  full_name,
  bio,
  avatar_url,
  location,
  is_verified,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440007',
  'alexchen',
  'Alex Chen',
  'Electronic music producer and sound designer. Creating immersive sonic experiences through innovative sound design techniques.',
  'https://dummyimage.com/150x150/10b981/ffffff?text=AC',
  'San Francisco, CA',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  location = EXCLUDED.location,
  updated_at = NOW();

-- =============================================================================
-- STEP 4: Create artist profiles
-- =============================================================================

-- Sarah Johnson's artist profile
INSERT INTO artist_profiles (
  id,
  user_id,
  artist_name,
  bio,
  genres,
  profile_image_url,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  'Sarah Johnson',
  'Music industry analyst and independent artist advocate. Passionate about the future of music and helping artists navigate the digital landscape.',
  ARRAY['Industry Analysis', 'Music Business'],
  'https://dummyimage.com/150x150/8b5cf6/ffffff?text=SJ',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  artist_name = EXCLUDED.artist_name,
  bio = EXCLUDED.bio,
  genres = EXCLUDED.genres,
  profile_image_url = EXCLUDED.profile_image_url,
  updated_at = NOW();

-- Alex Chen's artist profile
INSERT INTO artist_profiles (
  id,
  user_id,
  artist_name,
  bio,
  genres,
  profile_image_url,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440007',
  'Alex Chen',
  'Electronic music producer and sound designer. Creating immersive sonic experiences through innovative sound design techniques.',
  ARRAY['Electronic', 'Ambient', 'Experimental'],
  'https://dummyimage.com/150x150/10b981/ffffff?text=AC',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  artist_name = EXCLUDED.artist_name,
  bio = EXCLUDED.bio,
  genres = EXCLUDED.genres,
  profile_image_url = EXCLUDED.profile_image_url,
  updated_at = NOW();

-- =============================================================================
-- STEP 5: Create blog posts
-- =============================================================================

-- Sarah Johnson's blog post
INSERT INTO artist_blog_posts (
  id,
  user_id,
  artist_profile_id,
  title,
  slug,
  content,
  excerpt,
  featured_image_url,
  status,
  published_at,
  seo_title,
  seo_description,
  stats,
  tags,
  categories,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440003',
  'The Future of Independent Music',
  'the-future-of-independent-music',
  'The music industry is undergoing a profound transformation, driven by digital platforms and changing consumer behaviors. Independent artists are at the forefront of this revolution, leveraging new technologies to reach audiences directly and build sustainable careers without traditional label support.

## The Digital Revolution

Streaming platforms like Spotify, Apple Music, and Bandcamp have democratized music distribution, allowing independent artists to reach global audiences with minimal upfront costs. This shift has fundamentally changed the power dynamics in the industry, giving artists unprecedented control over their careers.

## Direct Fan Engagement

Social media platforms have become essential tools for independent artists to build and maintain direct relationships with their fans. Platforms like Instagram, TikTok, and YouTube allow artists to share their creative process, behind-the-scenes content, and personal stories, creating deeper connections with their audience.

## Revenue Diversification

Independent artists are increasingly diversifying their revenue streams beyond traditional album sales and streaming royalties. Merchandise sales, live performances, licensing deals, and fan subscriptions through platforms like Patreon are becoming crucial components of sustainable artist income.

## The Role of Technology

Artificial intelligence and machine learning are playing an increasingly important role in music discovery and recommendation. While some artists worry about being lost in the algorithm, others are learning to work with these systems to increase their visibility and reach new audiences.

## Challenges and Opportunities

Despite the opportunities, independent artists face significant challenges, including:
- Discoverability in an oversaturated market
- Maintaining consistent income streams
- Managing the business side of their careers
- Building sustainable touring models

However, these challenges also present opportunities for innovation and new business models.

## Looking Ahead

The future of independent music is bright, with technology continuing to create new opportunities for artists to connect with fans and build sustainable careers. The key to success lies in embracing these changes while maintaining artistic integrity and authentic connections with audiences.

As we move forward, the line between independent and major label artists will continue to blur, with success being measured not by label affiliation, but by the ability to build and maintain meaningful relationships with fans while creating compelling, authentic music.',
  'Exploring how independent artists are reshaping the music industry through digital platforms and direct fan engagement.',
  'https://dummyimage.com/800x400/8b5cf6/ffffff?text=The+Future+of+Independent+Music',
  'published',
  NOW() - INTERVAL '1 day',
  'The Future of Independent Music - Industry Analysis',
  'Explore how independent artists are reshaping the music industry through digital platforms and direct fan engagement. Industry insights and analysis.',
  '{"views": 1247, "likes": 89, "comments": 23, "shares": 45}',
  ARRAY['Independent Music', 'Digital Age', 'Music Industry', 'Artist Development', 'Streaming', 'Fan Engagement'],
  ARRAY['Industry Analysis', 'Digital Music', 'Artist Development'],
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  featured_image_url = EXCLUDED.featured_image_url,
  status = EXCLUDED.status,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  stats = EXCLUDED.stats,
  tags = EXCLUDED.tags,
  categories = EXCLUDED.categories,
  updated_at = NOW();

-- Alex Chen's blog post
INSERT INTO artist_blog_posts (
  id,
  user_id,
  artist_profile_id,
  title,
  slug,
  content,
  excerpt,
  featured_image_url,
  status,
  published_at,
  seo_title,
  seo_description,
  stats,
  tags,
  categories,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440008',
  'The Art of Sound Design in Electronic Music',
  'the-art-of-sound-design-in-electronic-music',
  'Sound design is the foundation of electronic music production. It''s the process of creating, manipulating, and organizing sounds to create unique sonic experiences that transport listeners to new worlds.

## Understanding Sound Design

Sound design goes beyond simply choosing presets or samples. It involves understanding the fundamental properties of sound—frequency, amplitude, timbre, and spatial characteristics. Every sound we create or manipulate contributes to the emotional and physical impact of our music.

## Tools and Techniques

Modern producers have access to an incredible array of tools for sound design:
- **Synthesizers**: Analog, digital, and modular synthesizers for creating unique timbres
- **Effects Processing**: Reverb, delay, distortion, and modulation effects
- **Field Recording**: Capturing real-world sounds for organic textures
- **Granular Synthesis**: Breaking sounds into tiny grains for complex textures

## The Creative Process

My approach to sound design involves several key steps:
1. **Conceptualization**: Understanding the emotional intent
2. **Sound Selection**: Choosing or creating appropriate source material
3. **Manipulation**: Processing and transforming sounds
4. **Organization**: Arranging sounds in a coherent structure
5. **Refinement**: Fine-tuning for maximum impact

## Emotional Impact

The most successful electronic music creates an emotional connection with listeners. Sound design plays a crucial role in this by:
- Creating atmosphere and mood
- Building tension and release
- Evoking specific emotions
- Creating memorable sonic signatures

## Looking Forward

As technology continues to evolve, the possibilities for sound design are expanding. AI-assisted synthesis, spatial audio, and new synthesis techniques are opening up exciting new creative possibilities for electronic music producers.',
  'Exploring the creative process and techniques behind sound design in electronic music production.',
  'https://dummyimage.com/800x400/10b981/ffffff?text=The+Art+of+Sound+Design',
  'published',
  NOW() - INTERVAL '2 days',
  'The Art of Sound Design in Electronic Music - Production Guide',
  'Learn about sound design techniques and creative processes in electronic music production.',
  '{"views": 892, "likes": 67, "comments": 18, "shares": 32}',
  ARRAY['Sound Design', 'Electronic Music', 'Music Production', 'Synthesis', 'Creative Process'],
  ARRAY['Production Guide', 'Electronic Music', 'Sound Design'],
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  featured_image_url = EXCLUDED.featured_image_url,
  status = EXCLUDED.status,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  stats = EXCLUDED.stats,
  tags = EXCLUDED.tags,
  categories = EXCLUDED.categories,
  updated_at = NOW();

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Blog Data Setup Complete!';
  RAISE NOTICE '========================';
  RAISE NOTICE '✅ Sarah Johnson account and blog post created';
  RAISE NOTICE '✅ Alex Chen account and blog post created';
  RAISE NOTICE '✅ Both blog posts are now available in the News Feed';
  RAISE NOTICE '';
  RAISE NOTICE 'Blog Posts Available:';
  RAISE NOTICE '1. "The Future of Independent Music" by Sarah Johnson';
  RAISE NOTICE '2. "The Art of Sound Design in Electronic Music" by Alex Chen';
  RAISE NOTICE '';
  RAISE NOTICE 'Login Credentials:';
  RAISE NOTICE 'Sarah Johnson: sarah.johnson@example.com / password123';
  RAISE NOTICE 'Alex Chen: alex.chen@example.com / password123';
END $$;
