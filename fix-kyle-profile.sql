-- Fix Kyle's artist profile to show correct artist name
-- This will make Kyle's profile show "Kyle" instead of "Felix"

UPDATE profiles 
SET 
  full_name = 'Kyle Daley',
  bio = 'Welcome to my profile! 👋'
WHERE username = 'Kyle' AND id = '97b9e178-b65f-47a3-910e-550864a4568a';

-- If there's a separate artist_profiles table, update that too
UPDATE artist_profiles 
SET 
  artist_name = 'Kyle',
  stage_name = 'Kyle'
WHERE user_id = '97b9e178-b65f-47a3-910e-550864a4568a';

-- Verify the fix
SELECT 
  p.username, 
  p.full_name, 
  p.bio,
  ap.artist_name,
  ap.stage_name
FROM profiles p
LEFT JOIN artist_profiles ap ON p.id = ap.user_id
WHERE p.username = 'Kyle';



