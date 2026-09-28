import assert from 'node:assert/strict'
import test from 'node:test'

import launchCapabilityModule from '../../lib/config/launch-capabilities.ts'
import publicSurfaceModule from '../../lib/config/public-surface.ts'
import releaseMetadataModule from '../../lib/config/release-metadata.ts'
import securityHeadersModule from '../../lib/config/security-headers.ts'
import { validatePublicSurfaceContract } from './check-public-surface.mjs'

const { isLaunchCapabilityAvailable, isProductionDeniedRoute, routeMatchesPrefix } = launchCapabilityModule
const {
  PRODUCTION_CANONICAL_ORIGIN,
  STAGING_CANONICAL_ORIGIN,
  getPublicRobotsMetadata,
  getPublicSitemapOrigin,
  isProductionIndexingAllowed,
} = publicSurfaceModule
const { RELEASE_SHA_HEADER, DEPLOYMENT_ID_HEADER, SUPABASE_ORIGIN_HEADER, STRIPE_MODE_HEADER, getAuthoritativeReleaseSha, getAuthoritativeDeploymentId, getReleaseMetadataHeaders } = releaseMetadataModule
const { buildContentSecurityPolicy } = securityHeadersModule

const production = {
  DEPLOYMENT_ENVIRONMENT: 'production',
  VERCEL_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: PRODUCTION_CANONICAL_ORIGIN,
}

const staging = {
  DEPLOYMENT_ENVIRONMENT: 'staging',
  VERCEL_ENV: 'preview',
  NEXT_PUBLIC_SITE_URL: STAGING_CANONICAL_ORIGIN,
}

test('only the explicit canonical production environment is indexable', () => {
  assert.equal(isProductionIndexingAllowed(production), true)
  assert.equal(isProductionIndexingAllowed(staging), false)
  assert.equal(isProductionIndexingAllowed({ ...production, NEXT_PUBLIC_SITE_URL: 'https://www.tourify.live' }), false)
  assert.equal(isProductionIndexingAllowed({ ...production, DEPLOYMENT_ENVIRONMENT: 'staging' }), false)
  assert.equal(getPublicSitemapOrigin(production), PRODUCTION_CANONICAL_ORIGIN)
  assert.equal(getPublicSitemapOrigin(staging), null)
  assert.equal(getPublicRobotsMetadata(staging).index, false)
})

test('production route denial matches exact paths and children only', () => {
  assert.equal(routeMatchesPrefix('/debug', '/debug'), true)
  assert.equal(routeMatchesPrefix('/debug/session', '/debug'), true)
  assert.equal(routeMatchesPrefix('/debugging', '/debug'), false)
  assert.equal(isProductionDeniedRoute('/api/marketplace/migrations/backfill'), true)
  assert.equal(isProductionDeniedRoute('/api/notifications/test'), true)
})

test('disabled capabilities cannot be enabled by a legacy approval flag', () => {
  assert.equal(isLaunchCapabilityAvailable('polls', true), false)
  assert.equal(isLaunchCapabilityAvailable('marketplace_provider_integrations', true), false)
  assert.equal(isLaunchCapabilityAvailable('ticketing', false), false)
  assert.equal(isLaunchCapabilityAvailable('ticketing', true), true)
  assert.equal(isLaunchCapabilityAvailable('accounts_and_profiles', false), true)
})

test('production CSP omits development eval while development keeps HMR support', () => {
  assert.equal(buildContentSecurityPolicy({ development: false }).includes("'unsafe-eval'"), false)
  assert.equal(buildContentSecurityPolicy({ development: true }).includes("'unsafe-eval'"), true)
})

test('health release identity accepts only the authoritative full Vercel Git SHA', () => {
  const upperSha = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01'
  assert.equal(getAuthoritativeReleaseSha({ VERCEL_GIT_COMMIT_SHA: upperSha }), upperSha.toLowerCase())
  assert.deepEqual(getReleaseMetadataHeaders({ VERCEL_GIT_COMMIT_SHA: upperSha }), {
    [RELEASE_SHA_HEADER]: upperSha.toLowerCase(),
  })
})

test('health release identity fails closed without an authoritative valid SHA', () => {
  assert.equal(getAuthoritativeReleaseSha({}), null)
  assert.equal(getAuthoritativeReleaseSha({ VERCEL_GIT_COMMIT_SHA: 'abcdef0' }), null)
  assert.deepEqual(
    getReleaseMetadataHeaders({ RELEASE_SHA: '0123456789abcdef0123456789abcdef01234567' }),
    {},
  )
})

test('health deployment identity uses only the Vercel-generated deployment ID', () => {
  const deploymentId = 'dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3'
  assert.equal(getAuthoritativeDeploymentId({ VERCEL_DEPLOYMENT_ID: deploymentId }), deploymentId)
  assert.deepEqual(getReleaseMetadataHeaders({ VERCEL_DEPLOYMENT_ID: deploymentId }), {
    [DEPLOYMENT_ID_HEADER]: deploymentId,
  })
  assert.equal(getAuthoritativeDeploymentId({ VERCEL_DEPLOYMENT_ID: 'custom-staging-id' }), null)
  assert.deepEqual(getReleaseMetadataHeaders({ DEPLOYMENT_ID: deploymentId }), {})
})

test('health exposes the public database origin and payment mode for staging isolation checks', () => {
  assert.deepEqual(getReleaseMetadataHeaders({
    NEXT_PUBLIC_SUPABASE_URL: 'https://staging-ref.supabase.co',
    STRIPE_SECRET_KEY: 'sk_test_never_expose_this_value',
  }), {
    [SUPABASE_ORIGIN_HEADER]: 'https://staging-ref.supabase.co',
    [STRIPE_MODE_HEADER]: 'test',
  })
  assert.deepEqual(getReleaseMetadataHeaders({
    NEXT_PUBLIC_SUPABASE_URL: 'http://unsafe.example',
    STRIPE_SECRET_KEY: 'unrecognized',
  }), {})
})

test('repository public-surface wiring satisfies the contract', async () => {
  assert.deepEqual(await validatePublicSurfaceContract(), [])
})
