import path from 'node:path'
import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHost: string | undefined
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : undefined
} catch {}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  [
    'connect-src',
    "'self'",
    'https:',
    supabaseHost ? `https://${supabaseHost}` : undefined,
    // Realtime uses wss:; `https:` alone does not permit WebSockets in strict browsers (e.g. Safari).
    supabaseHost ? `wss://${supabaseHost}` : undefined,
    '*.upstash.io',
  ].filter(Boolean).join(' ')
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp }
]

const nextConfig: NextConfig = {
  // Parent folder has its own package-lock.json; this repo uses pnpm-lock.yaml here.
  // Pin tracing to this app so Next does not infer the wrong workspace root (see Next.js outputFileTracingRoot docs).
  outputFileTracingRoot: path.join(process.cwd()),
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  eslint: {
    ignoreDuringBuilds: false
  },
  typescript: {
    // Strict builds: TypeScript errors fail `next build` so type issues are fixed before deploy.
    ignoreBuildErrors: false
  },
  async redirects() {
    return [
      {
        source: '/feed',
        destination: '/news',
        permanent: false,
      },
      {
        source: '/feed/:path*',
        destination: '/news',
        permanent: false,
      },
      {
        source: '/pulse',
        destination: '/news',
        permanent: false,
      },
      {
        source: '/pulse/:path*',
        destination: '/news',
        permanent: false,
      },
      {
        source: '/onboarding/enhanced-onboarding-flow',
        destination: '/onboarding',
        permanent: false,
      },
      {
        source: '/onboarding/enhanced-onboarding-flow/:path*',
        destination: '/onboarding',
        permanent: false,
      },
      {
        source: '/onboarding/complete',
        destination: '/onboarding?status=complete',
        permanent: false,
      },
      {
        source: '/onboarding/:token((?!hire$|complete$|enhanced-onboarding-flow$)[A-Za-z0-9._~-]{8,})',
        destination: '/onboarding/hire/:token',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      supabaseHost ? { protocol: 'https', hostname: supabaseHost, pathname: '/**' } : undefined,
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net', pathname: '/**' },
      { protocol: 'https', hostname: 'blogger.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.bp.blogspot.com', pathname: '/**' }
    ].filter(Boolean) as any
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  }
}

export default nextConfig
