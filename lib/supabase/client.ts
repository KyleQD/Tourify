import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

// Validate environment variables with better error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check for placeholder values that indicate missing configuration
const hasPlaceholderValues = !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseAnonKey.includes('your_anon_key') || 
  supabaseAnonKey.includes('your_supabase_anon_key') ||
  supabaseAnonKey.length < 50

if (hasPlaceholderValues) {
  console.error('❌ Supabase Configuration Error:')
  console.error('Missing or invalid Supabase environment variables.')
  console.error('Please ensure your .env.local file contains:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_url')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key')
  console.error('')
  console.error('You can find these values in your Supabase project dashboard:')
  console.error('Settings > API > Project URL and anon/public key')
  
  // Don't throw error in development, just warn
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file.'
    )
  }
}

// Debug logging for environment variables
console.log('🔧 Supabase Configuration:')
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('Anon Key:', supabaseAnonKey ? (hasPlaceholderValues ? '❌ Placeholder' : '✅ Valid') : '❌ Missing')

// Custom cookie storage for Supabase to ensure server-side compatibility
const cookieStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    
    // Try to get from cookies first, then localStorage as fallback
    const cookies = document.cookie.split(';')
    const cookie = cookies.find(c => c.trim().startsWith(`${key}=`))
    if (cookie) {
      return decodeURIComponent(cookie.split('=')[1])
    }
    
    // Fallback to localStorage for migration
    return localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    
    // Set both cookie and localStorage for compatibility
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1) // 1 year expiry
    
    const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureAttribute}`
    
    // Also set in localStorage as backup
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('Could not set localStorage:', e)
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    
    // Remove from both cookie and localStorage
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Could not remove from localStorage:', e)
    }
  }
}

// Create a single, consistent Supabase client with cookie storage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'sb-tourify-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: cookieStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'tourify-web',
    },
  },
})

// Test the connection on initialization
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Supabase connection error:', error)
    } else {
      console.log('Supabase connected successfully')
      console.log('Current session:', data.session ? 'Exists' : 'None')
      console.log('Storage method: Cookies + localStorage hybrid')
    }
  })
}

// Browser-only auth state change handling
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    // Handle different auth events
    if (event === 'SIGNED_OUT') {
      // Clear any local storage or session data
      localStorage.removeItem('onboardingData')
    }
    
    if (event === 'SIGNED_IN') {
      const url = new URL(window.location.href)
      const hash = url.hash
      
      // Handle email verification redirects
      if (hash.includes('type=recovery')) {
        window.location.href = '/auth/verification?type=recovery&success=true'
      } else if (hash.includes('type=signup')) {
        window.location.href = '/auth/verification?type=signup&success=true'
      }
    }
  })
}

// Server-side client for API routes
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Session check failed: ${error.message}`)
  return session
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
  return data
}

export async function updateProfile(userId: string, updates: Partial<Database['public']['Tables']['profiles']['Row']>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
  
  if (error) throw new Error(`Failed to update profile: ${error.message}`)
}

export async function getArtistProfile(userId: string) {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw new Error(`Failed to fetch artist profile: ${error.message}`)
  return data
}

export async function getVenueProfile(userId: string) {
  const { data, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw new Error(`Failed to fetch venue profile: ${error.message}`)
  return data
}

// Export the supabase instance directly - no circular dependency
export default supabase 