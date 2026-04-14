import { createClient as _createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const hasValidConfig =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 50 &&
  !supabaseAnonKey.includes('your_anon_key') &&
  !supabaseAnonKey.includes('your_supabase_anon_key')

if (!hasValidConfig && process.env.NODE_ENV === 'production') {
  console.error(
    '[Supabase] Missing or invalid environment variables – check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
}

// ---------------------------------------------------------------------------
// Storage – cookie + localStorage hybrid, fully fault-tolerant.
// Every path is wrapped so that a SecurityError (Safari ITP, incognito,
// sandboxed iframe, etc.) never propagates to the caller.
// ---------------------------------------------------------------------------

function canAccessStorage(): boolean {
  if (typeof window === 'undefined') return false
  try {
    // Probe both storage mechanisms; either may throw SecurityError
    const probe = '__tourify_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

let _storageAvailable: boolean | null = null
function isStorageAvailable(): boolean {
  if (_storageAvailable === null) _storageAvailable = canAccessStorage()
  return _storageAvailable
}

const inMemoryFallback = new Map<string, string>()

const safeStorage: {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} = {
  getItem(key) {
    if (typeof window === 'undefined') return null

    // 1. Try cookies
    try {
      const cookies = document.cookie.split(';')
      for (const part of cookies) {
        const trimmed = part.trim()
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        if (trimmed.slice(0, eq) === key) return decodeURIComponent(trimmed.slice(eq + 1))
      }
    } catch { /* SecurityError – continue */ }

    // 2. Try localStorage
    if (isStorageAvailable()) {
      try { return localStorage.getItem(key) } catch { /* noop */ }
    }

    // 3. In-memory fallback (session-only, survives within page lifetime)
    return inMemoryFallback.get(key) ?? null
  },

  setItem(key, value) {
    if (typeof window === 'undefined') return

    // Always write to in-memory so the session is never lost within the page
    inMemoryFallback.set(key, value)

    // Cookie
    try {
      const expires = new Date()
      expires.setFullYear(expires.getFullYear() + 1)
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`
    } catch { /* Safari ITP / sandboxed iframe */ }

    // localStorage
    if (isStorageAvailable()) {
      try { localStorage.setItem(key, value) } catch { /* noop */ }
    }
  },

  removeItem(key) {
    if (typeof window === 'undefined') return

    inMemoryFallback.delete(key)

    try { document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/` } catch { /* noop */ }

    if (isStorageAvailable()) {
      try { localStorage.removeItem(key) } catch { /* noop */ }
    }
  },
}

// ---------------------------------------------------------------------------
// Singleton client – created lazily on first access so module evaluation
// never throws even when storage is blocked.
// ---------------------------------------------------------------------------

let _instance: SupabaseClient<Database> | null = null

function getClient(): SupabaseClient<Database> {
  if (_instance) return _instance

  try {
    _instance = _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-tourify-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: safeStorage,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web' } },
    })
  } catch (initErr) {
    console.warn('[Supabase] Client creation failed, retrying without PKCE:', initErr)
    _instance = _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-tourify-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        storage: safeStorage,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web' } },
    })
  }

  // Async side-effects: failures are logged, never thrown
  if (typeof window !== 'undefined') {
    _instance.auth.getSession().catch((err) => {
      console.warn('[Supabase] getSession failed (non-fatal):', err)
    })

    _instance.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try { localStorage.removeItem('onboardingData') } catch { /* noop */ }
      }
      if (event === 'SIGNED_IN') {
        try {
          const hash = window.location.hash
          if (hash.includes('type=recovery')) {
            window.location.href = '/auth/verification?type=recovery&success=true'
          } else if (hash.includes('type=signup')) {
            window.location.href = '/auth/verification?type=signup&success=true'
          }
        } catch { /* noop */ }
      }
    })
  }

  return _instance
}

// Proxy that lazily initialises on first property access.
// This lets every module `import { supabase }` without risk of a top-level throw.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})

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