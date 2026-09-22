import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validate } from './simulation-gate.mjs'

const SHA = 'a'.repeat(40)
const campaignId = 'SIM-20260922-01'
const catalog = { journeys: [
  { id: 'ticket-checkout', actor: 'customer', receiver: 'organization', checks: ['success', 'authorization'] },
  { id: 'auth-login', actor: 'customer', receiver: 'same actor', checks: ['success'] }
] }

function fixture(dir) {
  for (const name of ['isolation.txt', 'schema.txt', 'stripe.txt', 'ios.txt', 'android.txt', 'journey.txt', 'actors.txt', 'scope.txt', 'approval.txt']) writeFileSync(join(dir, name), 'redacted test evidence')
  const staging = {
    apiUrl: 'https://staging.tourify.test', productionApiUrl: 'https://tourify.test',
    supabaseUrl: 'https://staging-db.supabase.co', productionSupabaseUrl: 'https://production-db.supabase.co',
    deployedSha: SHA, deploymentId: 'dpl_staging123', productionDeploymentId: 'dpl_production456', schemaEvidence: 'schema.txt', isolationEvidence: 'isolation.txt', stripeEvidence: 'stripe.txt', stripeMode: 'test'
  }
  const builds = Object.fromEntries(['ios', 'android'].map(platform => [platform, {
    profile: 'preview', buildId: `${platform}-build`, sourceSha: SHA, apiUrl: staging.apiUrl, buildEvidence: `${platform}.txt`
  }]))
  const actors = {
    customer: { id: 'customer-opaque-id', campaignId, provisionEvidence: 'actors.txt' },
    organization: { id: 'organization-opaque-id', campaignId, provisionEvidence: 'actors.txt' }
  }
  const journeyScope = catalog.journeys.flatMap(journey => ['ios', 'android'].map(platform => ({
    journeyId: journey.id, platform, status: 'shipped', scopeEvidence: 'scope.txt'
  })))
  const observations = catalog.journeys.flatMap(journey => ['ios', 'android'].flatMap(platform => journey.checks.map(check => ({
    journeyId: journey.id, platform, check, status: 'pass', actorId: actors.customer.id,
    receiverActorId: journey.receiver === 'same actor' ? undefined : actors.organization.id,
    observedAt: '2026-09-22T12:00:00Z', evidence: ['journey.txt'],
    startingState: 'Published campaign event', steps: 'Purchase with test card and inspect both actors',
    expected: 'Confirmed order', actual: 'Confirmed order', endingState: 'Organizer and buyer see the same order'
  }))))
  return [{ campaignId, staging, builds, actors, journeyScope }, { campaignId, deployedSha: SHA, observations, findings: [] }]
}

function withFixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'tourify-mobile-simulation-'))
  try { run(dir, ...fixture(dir)) } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('accepts complete exact-SHA iOS and Android evidence', () => withFixture((dir, manifest, results) => {
  assert.deepEqual(validate(manifest, results, dir, catalog), [])
}))

test('fails closed on shared deployment origins and a mismatched preview build', () => withFixture((dir, manifest, results) => {
  manifest.staging.productionApiUrl = manifest.staging.apiUrl
  manifest.staging.productionDeploymentId = manifest.staging.deploymentId
  manifest.builds.ios.sourceSha = 'b'.repeat(40)
  const errors = validate(manifest, results, dir, catalog).join('\n')
  assert.match(errors, /API origins must differ/)
  assert.match(errors, /deployment IDs must differ/)
  assert.match(errors, /ios.sourceSha must match/)
}))

test('fails on absent observations, bypasses, and open P1 findings', () => withFixture((dir, manifest, results) => {
  results.observations.pop()
  results.observations[0].status = 'bypassed'
  results.observations[0].findingId = 'SIM-20260922-001'
  results.observations[0].linkedTask = 'QA-004'
  results.findings.push({ id: 'SIM-20260922-001', severity: 'P1', status: 'routed', linkedTask: 'QA-004' })
  const errors = validate(manifest, results, dir, catalog).join('\n')
  assert.match(errors, /only an observed pass closes a check/)
  assert.match(errors, /missing observation/)
  assert.match(errors, /open P1 finding/)
}))

test('rejects missing evidence and credential fields', () => withFixture((dir, manifest, results) => {
  manifest.actors.customer.password = 'never store a password here'
  results.observations[0].evidence = ['missing.txt']
  const errors = validate(manifest, results, dir, catalog).join('\n')
  assert.match(errors, /contains credential fields/)
  assert.match(errors, /is missing/)
}))

test('accepts an approved disabled build journey without observations', () => withFixture((dir, manifest, results) => {
  const decision = manifest.journeyScope.find(row => row.journeyId === 'ticket-checkout' && row.platform === 'ios')
  Object.assign(decision, {
    status: 'disabled', reason: 'Ticket checkout flag is off in this preview build',
    approvedBy: 'ticketing-owner', decisionRef: 'QA-005-scope-01', approvalEvidence: 'approval.txt'
  })
  results.observations = results.observations.filter(row => !(row.journeyId === 'ticket-checkout' && row.platform === 'ios'))
  assert.deepEqual(validate(manifest, results, dir, catalog), [])
}))

test('rejects silent exclusions and observations credited to excluded journeys', () => withFixture((dir, manifest, results) => {
  const decision = manifest.journeyScope.find(row => row.journeyId === 'ticket-checkout' && row.platform === 'ios')
  decision.status = 'unavailable'
  const errors = validate(manifest, results, dir, catalog).join('\n')
  assert.match(errors, /reason is required/)
  assert.match(errors, /approvalEvidence is required/)
  assert.match(errors, /unknown journey\/platform\/check/)
}))

test('keeps an approved but unavailable shipped journey as a blocker', () => withFixture((dir, manifest, results) => {
  const decision = manifest.journeyScope.find(row => row.journeyId === 'ticket-checkout' && row.platform === 'ios')
  Object.assign(decision, {
    status: 'unavailable', reason: 'Checkout cannot be reached in this preview build',
    approvedBy: 'ticketing-owner', decisionRef: 'QA-006-blocker-01', approvalEvidence: 'approval.txt'
  })
  results.observations = results.observations.filter(row => !(row.journeyId === 'ticket-checkout' && row.platform === 'ios'))
  const errors = validate(manifest, results, dir, catalog).join('\n')
  assert.match(errors, /is unavailable; resolve it/)
}))
