-- Quick Master Admin Setup for kyleqdaley@gmail.com
-- Run this directly in Supabase SQL Editor for immediate results

-- Ensure admin columns exist in profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_level TEXT CHECK (admin_level IN ('super', 'moderator', 'support')) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'general' CHECK (profile_type IN ('general', 'artist', 'venue', 'admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Make kyleqdaley@gmail.com a master admin
UPDATE profiles 
SET 
  is_admin = TRUE,
  admin_level = 'super',
  profile_type = 'admin',
  role = 'admin',
  full_name = COALESCE(full_name, 'Master Admin'),
  updated_at = NOW()
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'kyleqdaley@gmail.com'
);

-- If no profile exists, create one
INSERT INTO profiles (
  id, 
  is_admin, 
  admin_level, 
  profile_type,
  role,
  full_name,
  created_at,
  updated_at
)
SELECT 
  id,
  TRUE,
  'super',
  'admin',
  'admin',
  'Master Admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'kyleqdaley@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
);

-- Verify the admin was created successfully
SELECT 
  u.email,
  p.is_admin,
  p.admin_level,
  p.profile_type,
  p.role,
  p.full_name,
  'SUCCESS: Master admin created!' as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'kyleqdaley@gmail.com' 
  AND p.is_admin = TRUE 
  AND p.admin_level = 'super'; 