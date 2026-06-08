const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuthState() {
  console.log('🔍 Testing Authentication State...\n')

  try {
    // 1. Check current authentication state
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    
    if (!user) {
      console.log('❌ No authenticated user found')
      console.log('💡 This explains the 403 error - user needs to be logged in')
      return
    }
    
    console.log('✅ Authenticated user found:')
    console.log('   - ID:', user.id)
    console.log('   - Email:', user.email)
    console.log('   - Created at:', user.created_at)
    
    // 2. Test a simple insert with the authenticated user
    console.log('\n🧪 Testing database insert...')
    
    const testTrack = {
      user_id: user.id,
      title: 'Auth Test Track',
      description: 'Testing authentication state',
      type: 'single',
      genre: 'test',
      file_url: 'https://example.com/test.mp3',
      tags: ['auth-test'],
      is_featured: false,
      is_public: true
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('artist_music')
      .insert(testTrack)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      
      if (insertError.code === '42501') {
        console.error('❌ This is a permission error - RLS policy issue')
      } else if (insertError.code === '23502') {
        console.error('❌ NOT NULL constraint violation')
      } else if (insertError.code === '23503') {
        console.error('❌ Foreign key constraint violation')
      }
    } else {
      console.log('✅ Insert successful!')
      console.log('   - Track ID:', insertData.id)
      
      // Clean up
      await supabase
        .from('artist_music')
        .delete()
        .eq('id', insertData.id)
      console.log('✅ Test data cleaned up')
    }
    
    // 3. Check if user has an artist profile
    console.log('\n🔍 Checking artist profile...')
    
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking profile:', profileError)
    } else if (profile) {
      console.log('✅ Artist profile found:')
      console.log('   - Profile ID:', profile.id)
      console.log('   - Artist name:', profile.artist_name)
    } else {
      console.log('⚠️ No artist profile found for user')
      console.log('💡 This is okay - users can upload music without artist profiles')
    }
    
    console.log('\n🎉 Authentication test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testAuthState()
