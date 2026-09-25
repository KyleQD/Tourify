/**
 * TICKET-005 / HF-INTG-006-TICKETING — claim/complete contract.
 *
 * The behavioural certification lives in webhook-claim-completion.test.ts. This
 * file pins the pieces that are not reachable from a unit test: the migration is
 * genuinely additive and forward-only, it does not assert completion it cannot
 * prove, the manifest is schema-valid and cannot drift from the SQL it describes,
 * and the claim site no longer infers completion from a uniqueness violation.
 *
 * These assertions are the regression fence for the P0. If a later change relaxes
 * them, the "paid order stays unfinalized behind a success response" failure mode
 * becomes reachable again without any behavioural test failing.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateManifest } from '../../scripts/ci/check-migration-validation.mjs'

const MIGRATION_PATH = 'supabase/migrations/20260926130000_ticketing_webhook_completion_marker.sql'
const MANIFEST_PATH =
  'docs/engineering/migration-validation/20260926130000_ticketing_webhook_completion_marker.json'
const ORIGINAL_TABLE_MIGRATION = 'supabase/migrations/20260821000000_reconcile_ticketing_foundation.sql'

const migration = readFileSync(MIGRATION_PATH, 'utf8')
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
const route = readFileSync('app/api/ticketing/webhook/route.ts', 'utf8')
const finalize = readFileSync('lib/ticketing/finalize.ts', 'utf8')

describe('migration: completion gets its own observable marker', () => {
  it('adds a nullable completion column and leaves the claim stamp alone', () => {
    expect(migration).toMatch(/add column if not exists completed_at timestamptz;/i)
    // The P0's root cause was processed_at doubling as a claim stamp. Relaxing
    // or repurposing it would be the other fix INTG-006 named; this lane took the
    // additive one, so the already-applied column keeps both its nullability and
    // its meaning.
    expect(migration).not.toMatch(/processed_at[\s\S]*?drop not null/i)
    expect(migration).not.toMatch(/alter column processed_at/i)
  })

  it('records an attempt count so a repeatedly failing money event is visible', () => {
    expect(migration).toMatch(/add column if not exists attempts integer not null default 1;/i)
  })

  it('indexes only the incomplete claims, for the stuck-claim operator probe', () => {
    expect(migration).toMatch(
      /create index if not exists idx_ticket_stripe_webhook_events_incomplete[\s\S]*?on public\.ticket_stripe_webhook_events \(processed_at\)[\s\S]*?where completed_at is null;/i,
    )
  })

  it('never asserts a completion it cannot prove: there is no backfill', () => {
    // Backfilling completed_at = processed_at would claim every historical claim
    // finished, which is the same unprovable assertion that caused the P0, and
    // would silently discard the genuinely abandoned events.
    const executable = migration.replace(/--[^\n]*/g, ' ')
    expect(executable).not.toMatch(/\bupdate\b/i)
    expect(executable).not.toMatch(/\bdelete\b/i)
    expect(executable).not.toMatch(/\binsert\s+into\b/i)
    expect(migration).toContain('Backfill is deliberately NONE')
  })

  it('is additive and forward-only: no destructive object change and no history edit', () => {
    const executable = migration.replace(/--[\s\S]*?$/m, ' ')
    expect(executable).not.toMatch(/\bdrop\s+(table|column|index|schema)\b/i)
    expect(executable).not.toMatch(/\btruncate\b/i)
    // The applied table definition must be left exactly as the chain created it.
    const original = readFileSync(ORIGINAL_TABLE_MIGRATION, 'utf8')
    expect(original).toContain('processed_at timestamptz not null default now()')
    expect(original).not.toContain('completed_at')
  })

  it('widens no client surface: no RLS or policy change', () => {
    expect(migration).not.toMatch(/\bcreate\s+policy\b/i)
    expect(migration).not.toMatch(/\balter\s+table[\s\S]*?row\s+level\s+security/i)
  })

  it('is CP-051 clean: authored here, applied only by an operator', () => {
    expect(migration).toContain('applied manually by an operator only')
    expect(migration).not.toMatch(/supabase db reset/i)
  })
})

describe('validation manifest', () => {
  it('validates against the repository manifest schema at the planned stage', () => {
    // Reuses the CI validator rather than restating its rules, so a manifest that
    // CI would reject cannot pass here.
    expect(validateManifest(manifest, MIGRATION_PATH, { requiredStage: 'planned' })).toEqual([])
  })

  it('cannot drift from the SQL it describes', () => {
    expect(manifest.sha256).toBe(
      createHash('sha256').update(readFileSync(MIGRATION_PATH)).digest('hex'),
    )
  })

  it('is honest about what has not been proven', () => {
    // Planned, not validated: no hosted or isolated evidence exists, because
    // CP-051 forbids applying it from this lane and no staging target is available.
    expect(manifest.status).toBe('planned')
    expect(manifest.evidence).toEqual({ isolated: null, staging: null, production: null })
    expect(manifest.preflight.artifact).toBeNull()
    expect(manifest.postflight.artifact).toBeNull()
    expect(manifest.postflight.securityAdvisorArtifact).toBeNull()
    expect(manifest.postflight.performanceAdvisorArtifact).toBeNull()
    expect(manifest.exceptions).toEqual([])
  })

  it('records the no-backfill decision in the quarantine strategy, not only in SQL', () => {
    expect(manifest.quarantine.strategy).toMatch(/NO backfill/i)
    expect(manifest.quarantine.required).toBe(false)
  })

  it('names the runtime certification and the operator stuck-claim probe', () => {
    expect(manifest.constraintsAndIndexes.validationPlan).toContain(
      '__tests__/ticketing/webhook-claim-completion.test.ts',
    )
    expect(manifest.postflight.queries.join(' ')).toMatch(/completed_at IS NULL/i)
  })
})

describe('claim site: a duplicate is resolved by the completion marker', () => {
  it('reads completion before deciding to acknowledge, and never from the 23505 alone', () => {
    expect(route).toContain('readWebhookEventCompletion')
    expect(route).toContain("if (prior.completed)")
    expect(route).toContain("outcome: 'duplicate'")
    // The exact pre-fix line: a bare boolean deciding the whole outcome.
    expect(route).not.toMatch(/const claimed = await claimWebhookEvent/)
    expect(route).not.toMatch(/if \(!claimed\)/)
  })

  it('resumes an incomplete claim instead of acknowledging it', () => {
    expect(route).toContain('priorAttempts = prior.attempts')
    expect(route).toContain("outcome: claim.kind === 'duplicate' ? 'resumed' : 'processed'")
  })

  it('checks the completion write and fails closed when it is not persisted', () => {
    expect(route).toContain('completeWebhookEvent')
    expect(route).toContain('if (completionError)')
    // A completion write that is not persisted must not answer 200, or the claim
    // stays incomplete while the provider believes the event is finished.
    expect(route).not.toMatch(/await completeWebhookEvent[\s\S]*?return NextResponse\.json\(\{ received: true/)
  })

  it('keeps the claim insert free of any completion stamp', () => {
    const claimBody = finalize.slice(
      finalize.indexOf('export async function claimWebhookEvent'),
      finalize.indexOf('export async function readWebhookEventCompletion'),
    )
    expect(claimBody).toMatch(/ticket_stripe_webhook_events/)
    // Writing completed_at at claim time is the defect itself.
    expect(claimBody).not.toMatch(/completed_at/)
    expect(claimBody).not.toMatch(/processed_at/)
  })

  it('fails closed when the completion marker cannot be read', () => {
    const readBody = finalize.slice(
      finalize.indexOf('export async function readWebhookEventCompletion'),
      finalize.indexOf('export async function completeWebhookEvent'),
    )
    // Never infer "already handled" from a read that could not be performed.
    expect(readBody).toContain('if (error)')
    expect(readBody).toContain('if (!data)')
    expect(readBody).not.toMatch(/completed:\s*false\s*\}\s*$/m)
  })
})
