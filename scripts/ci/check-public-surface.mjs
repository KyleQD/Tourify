#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import launchCapabilityModule from '../../lib/config/launch-capabilities.ts'
import publicSurfaceModule from '../../lib/config/public-surface.ts'
import releaseMetadataModule from '../../lib/config/release-metadata.ts'
import securityHeadersModule from '../../lib/config/security-headers.ts'

const { LAUNCH_CAPABILITIES, PRODUCTION_DENIED_ROUTE_PREFIXES } = launchCapabilityModule
const {
  PRODUCTION_CANONICAL_ORIGIN,
  STAGING_CANONICAL_ORIGIN,
  getPublicRobotsMetadata,
  getPublicSitemapOrigin,
  isProductionIndexingAllowed,
} = publicSurfaceModule
const { RELEASE_SHA_HEADER, getReleaseMetadataHeaders } = releaseMetadataModule
const { buildContentSecurityPolicy } = securityHeadersModule

const ROOT = process.cwd()

function requireCondition(failures, condition, message) {
  if (!condition) failures.push(message)
}

export async function validatePublicSurfaceContract() {
  const failures = []
  const capabilities = Object.values(LAUNCH_CAPABILITIES)
  const statuses = new Set(capabilities.map((capability) => capability.status))

  for (const requiredStatus of ['enabled', 'pilot', 'disabled']) {
    requireCondition(failures, statuses.has(requiredStatus), `capability manifest has no ${requiredStatus} entry`)
  }
  for (const [name, capability] of Object.entries(LAUNCH_CAPABILITIES)) {
    const expectedExposure = capability.status === 'enabled'
      ? 'general'
      : capability.status === 'pilot'
        ? 'restricted'
        : 'none'
    requireCondition(
      failures,
      capability.exposure === expectedExposure,
      `${name} status ${capability.status} must use ${expectedExposure} exposure`,
    )
  }

  requireCondition(
    failures,
    new Set(PRODUCTION_DENIED_ROUTE_PREFIXES).size === PRODUCTION_DENIED_ROUTE_PREFIXES.length,
    'production route deny registry contains duplicate prefixes',
  )

  const productionEnvironment = {
    DEPLOYMENT_ENVIRONMENT: 'production',
    VERCEL_ENV: 'production',
    NEXT_PUBLIC_SITE_URL: PRODUCTION_CANONICAL_ORIGIN,
  }
  const stagingEnvironment = {
    DEPLOYMENT_ENVIRONMENT: 'staging',
    VERCEL_ENV: 'preview',
    NEXT_PUBLIC_SITE_URL: STAGING_CANONICAL_ORIGIN,
  }

  requireCondition(failures, isProductionIndexingAllowed(productionEnvironment), 'canonical production must be indexable')
  requireCondition(failures, !isProductionIndexingAllowed(stagingEnvironment), 'staging must be noindex')
  requireCondition(
    failures,
    !isProductionIndexingAllowed({ ...productionEnvironment, NEXT_PUBLIC_SITE_URL: STAGING_CANONICAL_ORIGIN }),
    'production indexing must fail closed when the canonical origin is wrong',
  )
  requireCondition(
    failures,
    getPublicSitemapOrigin(productionEnvironment) === PRODUCTION_CANONICAL_ORIGIN,
    'production sitemap must use the canonical production origin',
  )
  requireCondition(failures, getPublicSitemapOrigin(stagingEnvironment) === null, 'staging must not publish a sitemap origin')
  requireCondition(
    failures,
    getPublicRobotsMetadata(stagingEnvironment).index === false,
    'staging metadata robots must be noindex',
  )

  const productionCsp = buildContentSecurityPolicy({ development: false, supabaseHost: 'example.supabase.co' })
  requireCondition(failures, !productionCsp.includes("'unsafe-eval'"), 'production CSP must not allow unsafe-eval')
  requireCondition(failures, productionCsp.includes("frame-ancestors 'none'"), 'production CSP must deny framing')

  const deploymentSha = '0123456789abcdef0123456789abcdef01234567'
  requireCondition(
    failures,
    getReleaseMetadataHeaders({ VERCEL_GIT_COMMIT_SHA: deploymentSha })[RELEASE_SHA_HEADER] === deploymentSha,
    'health release metadata must use the authoritative 40-character Vercel Git SHA',
  )
  requireCondition(
    failures,
    Object.keys(getReleaseMetadataHeaders({ VERCEL_GIT_COMMIT_SHA: '0123456' })).length === 0,
    'health release metadata must omit malformed or shortened SHAs',
  )

  const [layoutSource, robotsSource, sitemapSource, healthSource, nextConfigSource, vercelConfigSource] = await Promise.all([
    readFile(path.join(ROOT, 'app/layout.tsx'), 'utf8'),
    readFile(path.join(ROOT, 'app/robots.ts'), 'utf8'),
    readFile(path.join(ROOT, 'app/sitemap.ts'), 'utf8'),
    readFile(path.join(ROOT, 'app/api/health/route.ts'), 'utf8'),
    readFile(path.join(ROOT, 'next.config.ts'), 'utf8'),
    readFile(path.join(ROOT, 'vercel.json'), 'utf8'),
  ])
  requireCondition(failures, /canonical:\s*["']\/["']/.test(layoutSource), 'root metadata must declare the canonical path')
  requireCondition(failures, layoutSource.includes('getPublicRobotsMetadata()'), 'root metadata must use the crawler policy')
  requireCondition(failures, robotsSource.includes('getPublicSitemapOrigin()'), 'robots route must use the public-surface policy')
  requireCondition(failures, sitemapSource.includes('getPublicSitemapOrigin()'), 'sitemap route must use the public-surface policy')
  requireCondition(
    failures,
    /status:\s*['"]ok['"][\s\S]*timestamp:\s*new Date\(\)\.toISOString\(\)/.test(healthSource),
    'public health response must publish status and timestamp metadata',
  )
  requireCondition(
    failures,
    healthSource.includes('getReleaseMetadataHeaders()'),
    'health responses must use the authoritative release metadata headers',
  )
  requireCondition(failures, nextConfigSource.includes('buildContentSecurityPolicy'), 'Next config must use the canonical CSP builder')

  const vercelConfig = JSON.parse(vercelConfigSource)
  requireCondition(
    failures,
    vercelConfig.rewrites?.some((rewrite) => rewrite.source === '/healthz' && rewrite.destination === '/api/health'),
    'Vercel must publish the canonical /healthz rewrite',
  )

  return failures
}

async function main() {
  const failures = await validatePublicSurfaceContract()
  if (failures.length > 0) {
    console.error(`Public production surface contract failed (${failures.length}):`)
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
    return
  }

  console.log('Public production surface contract passed.')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
