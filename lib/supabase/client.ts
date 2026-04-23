import { createBrowserClient, type CookieOptionsWithName } from '@supabase/ssr'
import { createClient as _createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import { mergeAuthCookieOptions } from '@/lib/supabase/auth-cookie-options'

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

function shouldUseSsrBrowserClient() {
  try {
    return (
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as unknown as { document?: { cookie?: string } }).document !== 'undefined' &&
      typeof (globalThis as unknown as { document: { cookie?: string } }).document.cookie === 'string'
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Legacy storage (Expo / React Native, etc.) — no document.cookie.
// ---------------------------------------------------------------------------

function canAccessStorage(): boolean {
  if (typeof globalThis === 'undefined') return false
  try {
    const g = globalThis as unknown as { localStorage?: Storage }
    if (!g.localStorage) return false
    const probe = '__tourify_probe__'
    g.localStorage.setItem(probe, '1')
    g.localStorage.removeItem(probe)
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

const legacySafeStorage: {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} = {
  getItem(key) {
    const g = globalThis as unknown as { document?: { cookie?: string } }
    if (typeof g.document === 'undefined') {
      return inMemoryFallback.get(key) ?? null
    }

    try {
      const cookieHeader = g.document.cookie ?? ''
      const cookies = cookieHeader.split(';')
      for (const part of cookies) {
        const trimmed = part.trim()
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        if (trimmed.slice(0, eq) === key) return decodeURIComponent(trimmed.slice(eq + 1))
      }
    } catch {
      /* noop */
    }

    if (isStorageAvailable()) {
      try {
        return (globalThis as unknown as { localStorage: Storage }).localStorage.getItem(key)
      } catch {
        /* noop */
      }
    }

    return inMemoryFallback.get(key) ?? null
  },

  setItem(key, value) {
    inMemoryFallback.set(key, value)

    const g = globalThis as unknown as { document?: { cookie?: string } }
    if (typeof g.document !== 'undefined') {
      try {
        const expires = new Date()
        expires.setFullYear(expires.getFullYear() + 1)
        const loc = globalThis as unknown as { location?: { protocol?: string } }
        const secure = loc.location?.protocol === 'https:' ? '; Secure' : ''
        g.document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`
      } catch {
        /* noop */
      }
    }

    if (isStorageAvailable()) {
      try {
        ;(globalThis as unknown as { localStorage: Storage }).localStorage.setItem(key, value)
      } catch {
        /* noop */
      }
    }
  },

  removeItem(key) {
    inMemoryFallback.delete(key)

    const g = globalThis as unknown as { document?: { cookie?: string } }
    if (typeof g.document !== 'undefined') {
      try {
        g.document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
      } catch {
        /* noop */
      }
    }

    if (isStorageAvailable()) {
      try {
        ;(globalThis as unknown as { localStorage: Storage }).localStorage.removeItem(key)
      } catch {
        /* noop */
      }
    }
  },
}

function createLegacyPersistedClient(): SupabaseClient<Database> {
  try {
    return _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-tourify-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: legacySafeStorage,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web-legacy' } },
    })
  } catch (initErr) {
    console.warn('[Supabase] Legacy client init failed, retrying without PKCE:', initErr)
    return _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-tourify-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        storage: legacySafeStorage,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web-legacy' } },
    })
  }
}

// ---------------------------------------------------------------------------
// Singleton — lazy via Proxy so importing this module never throws.
// DOM browser: @supabase/ssr createBrowserClient (chunked cookies, matches middleware).
// Non-DOM client (e.g. React Native): legacy supabase-js + safeStorage.
// Server / build: lightweight anon client without session persistence.
// ---------------------------------------------------------------------------

let _instance: SupabaseClient<Database> | null = null
let _hashListenerAttached = false

function attachRecoveryHashListener(client: SupabaseClient<Database>) {
  if (_hashListenerAttached) return
  const w =
    typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { window?: { location?: { hash?: string; href?: string } } }).window
      : undefined
  if (!w?.location) return
  _hashListenerAttached = true

  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      try {
        ;(globalThis as unknown as { localStorage?: Storage }).localStorage?.removeItem('onboardingData')
      } catch {
        /* noop */
      }
    }
    if (event === 'SIGNED_IN') {
      try {
        const loc = w.location
        if (!loc) return
        const hash = loc.hash ?? ''
        if (hash.includes('type=recovery')) {
          loc.href = '/auth/verification?type=recovery&success=true'
        } else if (hash.includes('type=signup')) {
          loc.href = '/auth/verification?type=signup&success=true'
        }
      } catch {
        /* noop */
      }
    }
  })
}

function getClient(): SupabaseClient<Database> {
  if (_instance) return _instance

  if (!hasValidConfig) {
    _instance = _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web-unconfigured' } },
    })
    return _instance
  }

  if (typeof window === 'undefined') {
    _instance = _createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { 'X-Client-Info': 'tourify-web-server' } },
    })
    return _instance
  }

  if (!shouldUseSsrBrowserClient()) {
    _instance = createLegacyPersistedClient()
    attachRecoveryHashListener(_instance)
    return _instance
  }

  _instance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    isSingleton: true,
    auth: {
      storageKey: 'sb-tourify-auth-token',
    },
    cookieOptions: mergeAuthCookieOptions({
      name: 'sb-tourify-auth-token',
    }) as CookieOptionsWithName,
    global: { headers: { 'X-Client-Info': 'tourify-web' } },
  })

  attachRecoveryHashListener(_instance)

  return _instance
}

// Proxy that lazily initialises on first property access.
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})

export async function checkSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw new Error(`Session check failed: ${error.message}`)
  return session
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (error) throw new Error(`Failed to fetch profile: ${error.message}`)
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Database['public']['Tables']['profiles']['Row']>,
) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)

  if (error) throw new Error(`Failed to update profile: ${error.message}`)
}

export async function getArtistProfile(userId: string) {
  const { data, error } = await supabase.from('artist_profiles').select('*').eq('user_id', userId).single()

  if (error) throw new Error(`Failed to fetch artist profile: ${error.message}`)
  return data
}

export async function getVenueProfile(userId: string) {
  const { data, error } = await supabase.from('venue_profiles').select('*').eq('user_id', userId).single()

  if (error) throw new Error(`Failed to fetch venue profile: ${error.message}`)
  return data
}

export default supabase
