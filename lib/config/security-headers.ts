export function buildContentSecurityPolicy(input: {
  development: boolean
  supabaseHost?: string
}): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(input.development ? ["'unsafe-eval'"] : [])].join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    `script-src ${scriptSrc}`,
    [
      'connect-src',
      "'self'",
      'https:',
      input.supabaseHost ? `https://${input.supabaseHost}` : undefined,
      input.supabaseHost ? `wss://${input.supabaseHost}` : undefined,
      input.development && input.supabaseHost ? `http://${input.supabaseHost}` : undefined,
      input.development && input.supabaseHost ? `ws://${input.supabaseHost}` : undefined,
      '*.upstash.io',
      input.development ? 'http://127.0.0.1:7556' : undefined,
    ].filter(Boolean).join(' '),
  ].join('; ')
}
