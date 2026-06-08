-- Setup organizer permissions for kyleqdaley@gmail.com
-- This gives the user permission to organize events and tours

DO $$
DECLARE
    user_email TEXT := 'kyleqdaley@gmail.com';
    user_id UUID := '97b9e178-b65f-47a3-910e-550864a4568a'; -- From the logs
    profile_count INTEGER;
BEGIN
    RAISE NOTICE 'Setting up organizer permissions for: % (ID: %)', user_email, user_id;
    
    -- Check if profile already exists
    SELECT COUNT(*) INTO profile_count FROM profiles WHERE id = user_id;
    
    IF profile_count = 0 THEN
        -- Create organizer profile
        INSERT INTO profiles (
            id,
            display_name,
            role,
            organization_name,
            organization_type,
            created_at,
            updated_at
        ) VALUES (
            user_id,
            'Kyle Daley (Organizer)',
            'admin',
            'Test Events & Tours LLC',
            'event_management',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created organizer profile for user: %', user_email;
    ELSE
        -- Update existing profile to have organizer permissions
        UPDATE profiles 
        SET 
            role = 'admin',
            organization_name = 'Test Events & Tours LLC',
            organization_type = 'event_management',
            display_name = COALESCE(display_name, 'Kyle Daley (Organizer)'),
            updated_at = NOW()
        WHERE id = user_id;
        
        RAISE NOTICE 'Updated existing profile to organizer for user: %', user_email;
    END IF;
    
    -- Verify the update
    SELECT COUNT(*) INTO profile_count FROM profiles 
    WHERE id = user_id AND (role = 'admin' OR organization_name IS NOT NULL);
    
    IF profile_count > 0 THEN
        RAISE NOTICE '✅ Organizer profile setup complete for: %', user_email;
    ELSE
        RAISE WARNING '❌ Failed to set up organizer profile for: %', user_email;
    END IF;
    
END $$; 