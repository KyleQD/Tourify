import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const supabase = createServiceRoleClient()
    const userId = 'bce15693-d2bf-42db-a2f2-68239568fafe'
    const results = []

    // Test 1: Direct query to artist_profiles
    try {
      const { data: directArtist, error: directError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, user_id')
        .eq('user_id', userId)

      results.push({
        test: 'Direct artist_profiles query',
        data: directArtist,
        error: directError?.message || null
      })
    } catch (error) {
      results.push({
        test: 'Direct artist_profiles query',
        data: null,
        error: (error as Error).message
      })
    }

    // Test 2: Simple SQL function test
    const testFunction = `
      CREATE OR REPLACE FUNCTION test_artist_query(p_user_id UUID)
      RETURNS TABLE (
        test_id UUID,
        test_name TEXT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          ap.id as test_id,
          ap.artist_name as test_name
        FROM artist_profiles ap
        WHERE ap.user_id = p_user_id
        LIMIT 1;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    try {
      await supabase.rpc('exec_sql', { sql: testFunction })
      results.push({
        test: 'Create test function',
        data: 'success',
        error: null
      })
    } catch (error) {
      results.push({
        test: 'Create test function',
        data: null,
        error: (error as Error).message
      })
    }

    // Test 3: Run the test function
    try {
      const { data: testData, error: testError } = await supabase
        .rpc('test_artist_query', {
          p_user_id: userId
        })

      results.push({
        test: 'Test function result',
        data: testData,
        error: testError?.message || null
      })
    } catch (error) {
      results.push({
        test: 'Test function result',
        data: null,
        error: (error as Error).message
      })
    }

    // Test 4: Run the actual fixed function
    try {
      const { data: actualData, error: actualError } = await supabase
        .rpc('get_account_info_flexible', {
          p_user_id: userId,
          p_account_type: 'artist'
        })

      results.push({
        test: 'Actual function result',
        data: actualData,
        error: actualError?.message || null
      })
    } catch (error) {
      results.push({
        test: 'Actual function result',
        data: null,
        error: (error as Error).message
      })
    }

    return NextResponse.json({
      userId,
      results: results
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
} 