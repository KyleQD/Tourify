#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://auqddrodjezjlypkzfpi.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseState() {
  console.log('🔍 Testing Database State...\n')
  
  try {
    // 1. Check if profiles table exists and its structure
    console.log('1. Checking profiles table structure...')
    const { data: profilesColumns, error: profilesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_name = 'profiles' AND table_schema = 'public'` 
      })
    
    if (profilesError) {
      console.error('❌ Error checking profiles table:', profilesError.message)
    } else {
      console.log('✅ Profiles table columns:')
      profilesColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }
    
    // 2. Check for trigger functions
    console.log('\n2. Checking for handle_new_user function...')
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_definition')
      .eq('routine_name', 'handle_new_user')
      .eq('routine_schema', 'public')
    
    if (functionsError) {
      console.error('❌ Error checking functions:', functionsError.message)
    } else {
      console.log(`✅ Found ${functions.length} handle_new_user function(s)`)
      functions.forEach((func, index) => {
        console.log(`\nFunction ${index + 1}:`)
        console.log(func.routine_definition.substring(0, 200) + '...')
      })
    }
    
    // 3. Check for triggers
    console.log('\n3. Checking for triggers on auth.users...')
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_statement')
      .eq('event_object_table', 'users')
      .eq('event_object_schema', 'auth')
    
    if (triggersError) {
      console.error('❌ Error checking triggers:', triggersError.message)
    } else {
      console.log(`✅ Found ${triggers.length} trigger(s) on auth.users:`)
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation}`)
        console.log(`     Action: ${trigger.action_statement}`)
      })
    }
    
    // 4. Check auth.users count
    console.log('\n4. Checking current user count...')
    const { count: userCount, error: countError } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error checking user count:', countError.message)
    } else {
      console.log(`✅ Current users in auth.users: ${userCount}`)
    }
    
    // 5. Check profiles count
    console.log('\n5. Checking profiles count...')
    const { count: profileCount, error: profileCountError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (profileCountError) {
      console.error('❌ Error checking profile count:', profileCountError.message)
    } else {
      console.log(`✅ Current profiles: ${profileCount}`)
    }
    
    console.log('\n✅ Database state check complete!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testDatabaseState()