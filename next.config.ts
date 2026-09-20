import path from 'node:path'
import type { NextConfig } from 'next'
import { buildContentSecurityPolicy } from './lib/config/security-headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHost: string | undefined
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : undefined
} catch {}

const isDev = process.env.NODE_ENV !== 'production'

// Inline JSON-LD and print bootstraps still require unsafe-inline. Next.js HMR
// requires unsafe-eval only in development; the production policy omits it.
const csp = buildContentSecurityPolicy({ development: isDev, supabaseHost })

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp }
]

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
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
      // AUD-0114: forward-only alias; /admin remains canonical until Phase-later rename.
      // See docs/audits/ADMIN_ORG_RENAME.md
      {
        source: '/org/:slug/dashboard',
        destination: '/admin/dashboard',
        permanent: false,
      },
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
  // RELEASE-003 parity: vercel.json rewrote /healthz -> /api/health for Vercel only.
  // Mirror it here so the liveness contract (and `npm run smoke:healthz`) resolves
  // identically in local dev and in the production build. Vercel applies next.config
  // rewrites too, so the vercel.json entry is now redundant but harmless.
  async rewrites() {
    return [
      {
        source: '/healthz',
        destination: '/api/health',
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
