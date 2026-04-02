import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from "./database.types"

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with explicit cookie options for better session handling
export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'tourify-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
})

// Only add auth state change listener in browser environment
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      const url = new URL(window.location.href);
      const hash = url.hash;
      
      if (hash.includes('type=recovery')) {
        window.location.href = '/auth/verification?type=recovery&success=true';
      } else if (hash.includes('type=signup')) {
        window.location.href = '/auth/verification?type=signup&success=true';
      }
    }
  })
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

