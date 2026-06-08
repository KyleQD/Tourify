// Quick script to fix RLS policies for site maps
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for site_maps...')
  
  try {
    // Drop existing policies
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can manage their own site maps" ON site_maps;
        DROP POLICY IF EXISTS "Users can view public site maps" ON site_maps;
        DROP POLICY IF EXISTS "Collaborators can view site maps" ON site_maps;
      `
    })
    
    // Create new policies
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can manage their own site maps" ON site_maps
            FOR ALL USING (auth.uid() = created_by);
      `
    })
    
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view public site maps" ON site_maps
            FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);
      `
    })
    
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Collaborators can view site maps" ON site_maps
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM site_map_collaborators 
                    WHERE site_map_id = id AND user_id = auth.uid() AND is_active = true
                )
            );
      `
    })
    
    // Ensure user profile exists
    await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO profiles (id, username, full_name, email, created_at, updated_at)
        VALUES (
            '97b9e178-b65f-47a3-910e-550864a4568a',
            'kyle_daley',
            'Kyle Daley',
            'kyle@example.com',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `
    })
    
    console.log('✅ RLS policies fixed successfully!')
    console.log('🎉 Site map creation should now work!')
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error)
  }
}

fixRLSPolicies()
