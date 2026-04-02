import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    })

    // Check if artist_profiles table exists
    const { error: tableCheckError } = await supabase
      .from("artist_profiles")
      .select("id")
      .limit(1)
    
    // If table doesn't exist, we need to create it manually in the Supabase dashboard
    if (tableCheckError && tableCheckError.message.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: 'Table creation required',
          message: 'The artist_profiles table needs to be created manually. Please visit the Supabase dashboard and run the following SQL:',
          sql: `
          -- Create artist_profiles table if it doesn't exist
          CREATE TABLE IF NOT EXISTS artist_profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            artist_name TEXT NOT NULL,
            bio TEXT,
            genres TEXT[] DEFAULT '{}',
            social_links JSONB DEFAULT '{"instagram": "", "spotify": "", "youtube": ""}'::jsonb,
            location TEXT,
            website TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
          );

          -- Add RLS policies to secure the artist_profiles table
          ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

          -- Policy to allow users to view and edit only their own artist profile
          CREATE POLICY "Users can view their own artist profile" 
            ON artist_profiles FOR SELECT 
            USING (auth.uid() = user_id);

          CREATE POLICY "Users can insert their own artist profile" 
            ON artist_profiles FOR INSERT 
            WITH CHECK (auth.uid() = user_id);

          CREATE POLICY "Users can update their own artist profile" 
            ON artist_profiles FOR UPDATE 
            USING (auth.uid() = user_id);
          `
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: 'Tables already exist' })
  } catch (error) {
    console.error('Error checking tables:', error)
    return NextResponse.json(
      { error: 'Failed to check tables', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 