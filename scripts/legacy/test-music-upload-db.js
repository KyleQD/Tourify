const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMusicUploadSetup() {
  console.log('🔍 Testing Music Upload Database Setup...\n')

  try {
    // 1. Check if tables exist
    console.log('1. Checking if required tables exist...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['artist_music', 'artist_profiles', 'music_comments', 'music_shares', 'music_plays'])
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError)
    } else {
      console.log('✅ Found tables:', tables.map(t => t.table_name))
    }

    // 2. Check artist_music table structure
    console.log('\n2. Checking artist_music table structure...')
    
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'artist_music')
      .order('ordinal_position')
    
    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError)
    } else {
      console.log('✅ artist_music columns:')
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }

    // 3. Check RLS policies
    console.log('\n3. Checking RLS policies...')
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'artist_music')
    
    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError)
    } else {
      console.log('✅ artist_music policies:')
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`)
      })
    }

    // 4. Test authentication
    console.log('\n4. Testing authentication...')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.log('⚠️  Not authenticated (this is normal for testing)')
    } else {
      console.log('✅ Authenticated as:', user?.email)
    }

    // 5. Test storage buckets
    console.log('\n5. Checking storage buckets...')
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error checking buckets:', bucketsError)
    } else {
      const musicBuckets = buckets.filter(b => b.name.includes('music') || b.name.includes('artist'))
      console.log('✅ Music-related buckets:')
      musicBuckets.forEach(bucket => {
        console.log(`   - ${bucket.name}: ${bucket.public ? 'public' : 'private'}`)
      })
    }

    // 6. Test a simple insert (if authenticated)
    if (user) {
      console.log('\n6. Testing music insert...')
      
      const testTrack = {
        user_id: user.id,
        title: 'Test Track',
        description: 'Test description',
        type: 'single',
        genre: 'test',
        file_url: 'https://example.com/test.mp3',
        tags: ['test'],
        is_featured: false,
        is_public: true
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('artist_music')
        .insert(testTrack)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Insert test failed:', insertError)
      } else {
        console.log('✅ Insert test successful:', insertData.id)
        
        // Clean up test data
        await supabase
          .from('artist_music')
          .delete()
          .eq('id', insertData.id)
        console.log('✅ Test data cleaned up')
      }
    }

    console.log('\n🎉 Database setup test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testMusicUploadSetup()
