export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const productionRequired = [
    'NEXT_PUBLIC_SITE_URL',
  ]

  const keys = process.env.NODE_ENV === 'production'
    ? [...required, ...productionRequired]
    : required

  const missing = keys.filter(key => !process.env[key]?.trim())
  return { valid: missing.length === 0, missing }
}

export function warnMissingEnv(): void {
  const { missing } = validateEnv()
  if (missing.length === 0) return

  const message = `[env-check] Missing env vars: ${missing.join(', ')}`
  if (process.env.NODE_ENV === 'production') {
    console.error(message)
  } else {
    console.warn(message)
  }
}

/** Call from server bootstrap (e.g. root layout) in production. */
export function warnProductionPublicSiteUrl(): void {
  if (process.env.NODE_ENV !== 'production') return
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '').trim()
  if (!site) {
    console.error(
      '[env-check] NEXT_PUBLIC_SITE_URL is required in production so Supabase email links and OAuth redirects match this deployment.',
    )
  }
}
