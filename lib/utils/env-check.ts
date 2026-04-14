export function warnMissingEnv(): void {
  if (process.env.NODE_ENV === 'production') return
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    console.warn('[env-check] Missing env vars:', missing.join(', '))
  }
}
