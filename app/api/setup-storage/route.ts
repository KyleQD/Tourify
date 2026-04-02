import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    // Authenticate the request
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { user, supabase } = authResult

    console.log('Setting up storage bucket for user:', user.id)

    // Create the storage bucket
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('profile-images', {
      public: true,
      fileSizeLimit: 4194304, // 4MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    })

    if (bucketError) {
      console.error('Bucket creation error:', bucketError)
      // If bucket already exists, that's fine
      if (bucketError.message.includes('already exists')) {
        console.log('Bucket already exists, continuing...')
      } else {
        return NextResponse.json(
          { success: false, error: `Failed to create bucket: ${bucketError.message}` },
          { status: 500 }
        )
      }
    } else {
      console.log('Bucket created successfully:', bucketData)
    }

    // Set up storage policies using SQL
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
        DROP POLICY IF EXISTS "Public read access to profile images" ON storage.objects;
        
        -- Create policy for users to upload their own profile images
        CREATE POLICY "Users can upload their own profile images" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'profile-images' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        
        -- Create policy for users to update their own profile images
        CREATE POLICY "Users can update their own profile images" ON storage.objects
          FOR UPDATE USING (
            bucket_id = 'profile-images' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        
        -- Create policy for users to delete their own profile images
        CREATE POLICY "Users can delete their own profile images" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'profile-images' AND
            auth.uid()::text = (storage.foldername(name))[1]
          );
        
        -- Create policy for public read access to profile images
        CREATE POLICY "Public read access to profile images" ON storage.objects
          FOR SELECT USING (bucket_id = 'profile-images');
      `
    })

    if (policyError) {
      console.error('Policy creation error:', policyError)
      // Try alternative approach with direct SQL
      const { error: directPolicyError } = await supabase.rpc('exec_sql', {
        sql_query: `
          -- Enable RLS on storage.objects if not already enabled
          ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
          
          -- Create a simple policy that allows authenticated users to upload to profile-images bucket
          CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to profile-images" ON storage.objects
            FOR ALL USING (
              bucket_id = 'profile-images' AND
              auth.role() = 'authenticated'
            );
        `
      })
      
      if (directPolicyError) {
        console.error('Direct policy creation error:', directPolicyError)
      } else {
        console.log('Storage policies created successfully')
      }
    } else {
      console.log('Storage policies created successfully')
    }

    // Add header_url column to profiles table if it doesn't exist
    const { error: columnError } = await supabase.rpc('add_header_url_column_if_not_exists')
    
    if (columnError) {
      console.error('Column addition error:', columnError)
      // Try direct SQL
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'header_url'
              ) THEN
                  ALTER TABLE profiles ADD COLUMN header_url TEXT;
              END IF;
          END $$;
        `
      })
      
      if (sqlError) {
        console.error('SQL execution error:', sqlError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Storage setup completed',
      bucket: bucketData
    })

  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 