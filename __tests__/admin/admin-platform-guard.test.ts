import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import { assertPlatformAdmin } from '@/lib/auth/platform-admin'
import {
  ADMIN_API_ROUTE_REGISTRY,
  adminCommandCapabilityMatrix,
} from '@/lib/admin/api-route-registry'

function profileQuery(result: { data: unknown; error?: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => result,
        }),
      }),
    }),
  }
}

describe('ADMIN-003 platform guard contract', () => {
  it.each([
    [{ is_admin: true, admin_level: 0 }, true],
    [{ is_admin: false, admin_level: 1 }, true],
    [{ is_admin: false, admin_level: 0 }, false],
    [{ role: 'admin' }, false],
    [null, false],
  ])('accepts only the platform-admin profile contract: %j -> %j', async (profile, expected) => {
    await expect(assertPlatformAdmin(profileQuery({ data: profile, error: null }), 'user-a')).resolves.toBe(expected)
  })

  it('fails closed when the profile lookup errors', async () => {
    await expect(assertPlatformAdmin(profileQuery({ data: null, error: new Error('db down') }), 'user-a')).resolves.toBe(false)
  })

  it.each([
    'event-merges',
    'event-claims',
    'event-providers',
    'event-sync',
    'creator-cooperative/ops',
    'creator-digital-commons/ops',
    'creator-federation/ops',
    'creator-interoperability-convention/ops',
    'creator-interoperability-institution/ops',
    'creator-interoperability-organization/ops',
    'creator-multilateral-treaty-operations/ops',
    'creator-protocol-constitution/ops',
    'creator-public-infrastructure/ops',
    'creator-treaty-system-legacy/ops',
    'creator-treaty-system-renewal/ops',
    'institutional/ops',
    'licensing/ops',
    'marketplace/moderation',
    'marketplace/orders',
    'marketplace/orders/[id]',
    'marketplace/payouts/[id]/retry',
    'rights-admin/ops',
    'rights-intelligence/ops',
  ])('uses the canonical platform guard for %s', (route) => {
    const source = readFileSync(`app/api/admin/${route}/route.ts`, 'utf8')
    expect(source).toContain('withPlatformAdmin')
    expect(source).not.toContain('checkIsAdmin')
    expect(source).not.toContain('profile?.role !== "admin"')
  })

  it('classifies Marketplace moderation as platform-only for every method', () => {
    const route = '/api/admin/marketplace/moderation'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'PATCH'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
  })

  it('retains Marketplace moderation item scoping and actor attribution', () => {
    const source = readFileSync('app/api/admin/marketplace/moderation/route.ts', 'utf8')
    expect(source).toContain('.eq("id", payload.id)')
    expect(source).toContain('assigned_admin_id: user.id')
  })

  it('classifies the Marketplace order ledger as platform-only', () => {
    for (const route of [
      '/api/admin/marketplace/orders',
      '/api/admin/marketplace/orders/[id]',
    ]) {
      const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
      expect(registryEntry?.authClass, route).toBe('platform_admin')
      expect(registryEntry?.capability, route).toBeUndefined()

      const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
      expect(contracts.map((entry) => entry.method), route).toEqual(['GET'])
      expect(contracts[0]?.actingContext, route).toBe('platform_admin')
      expect(contracts[0]?.tenantTarget, route).toBe('platform')
      expect(contracts[0]?.capabilities, route).toEqual([])
    }
  })

  it('retains the Marketplace order-detail resource predicate and dynamic route context', () => {
    const source = readFileSync('app/api/admin/marketplace/orders/[id]/route.ts', 'utf8')
    expect(source).toContain('{ params }: { params: Promise<{ id: string }> }')
    expect(source).toContain('const { id } = await params')
    expect(source).toContain('.eq("id", id)')
  })

  it('classifies Marketplace payout retry as a platform-only, non-idempotent mutation', () => {
    const route = '/api/admin/marketplace/payouts/[id]/retry'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['POST'])
    expect(contracts[0]?.actingContext).toBe('platform_admin')
    expect(contracts[0]?.tenantTarget).toBe('platform')
    expect(contracts[0]?.capabilities).toEqual([])
  })

  it('retains payout resource scoping, retry denial, and actor attribution', () => {
    const source = readFileSync('app/api/admin/marketplace/payouts/[id]/retry/route.ts', 'utf8')
    expect(source).toContain('{ params }: { params: Promise<{ id: string }> }')
    expect(source).toContain('const { id } = await params')
    expect(source.match(/\.eq\("id", id\)/g)).toHaveLength(2)
    expect(source).toContain('["on_hold", "failed", "pending"]')
    expect(source).toContain('Payout is not eligible for retry')
    expect(source).toContain('retryAttempts')
    expect(source).toContain('lastRetryBy: user.id')
    expect(source).toContain('lastRetryAt: new Date().toISOString()')
  })

  it('classifies rights-admin operations as platform-only with audited mutations', () => {
    const route = '/api/admin/rights-admin/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains rights-admin feature gating, flag scoping, and audit attribution', () => {
    const source = readFileSync('app/api/admin/rights-admin/ops/route.ts', 'utf8')
    expect(source).toContain('music_rights_admin_admin_ops_enabled')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("music_rights_admin_audit_events").insert({')
    expect(source).toContain('actor_user_id: user.id')
    expect(source).toContain('event_type: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies institutional operations as platform-only with audited mutations', () => {
    const route = '/api/admin/institutional/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains institutional feature gating, flag scoping, and audit attribution', () => {
    const source = readFileSync('app/api/admin/institutional/ops/route.ts', 'utf8')
    expect(source).toContain('music_institutional_admin_ops_enabled')
    expect(source).toContain('.eq("key", killMap[payload.action_type])')
    expect(source).toContain('.from("music_institutional_admin_actions")')
    expect(source).toContain('actor_user_id: user.id')
    expect(source).toContain('action_type: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies licensing operations as platform-only with audited mutations', () => {
    const route = '/api/admin/licensing/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains licensing feature gating, flag scoping, and audit attribution', () => {
    const source = readFileSync('app/api/admin/licensing/ops/route.ts', 'utf8')
    expect(source).toContain('music_licensing_admin_ops_enabled')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("music_licensing_audit_events").insert({')
    expect(source).toContain('actor_user_id: user.id')
    expect(source).toContain('actor_role: "admin"')
    expect(source).toContain('event_type: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies rights-intelligence operations as platform-only with audited mutations', () => {
    const route = '/api/admin/rights-intelligence/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains rights-intelligence read filters, kill-switch keys, and audit attribution', () => {
    const source = readFileSync('app/api/admin/rights-intelligence/ops/route.ts', 'utf8')
    expect(source).toContain('music_rights_intelligence_admin_ops_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('competition_stop: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("music_intelligence_audit_events").insert({')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('action: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-cooperative operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-cooperative/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-cooperative read filters, kill-switch keys, and audit attribution', () => {
    const source = readFileSync('app/api/admin/creator-cooperative/ops/route.ts', 'utf8')
    expect(source).toContain('creator_cooperative_admin_ops_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('privacy_incident_stop: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_cooperative_audit_events").insert({')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('action: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-digital-commons operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-digital-commons/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-digital-commons read filters, kill-switch keys, and audit payload', () => {
    const source = readFileSync('app/api/admin/creator-digital-commons/ops/route.ts', 'utf8')
    expect(source).toContain('creator_digital_commons_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('tourify_exit_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_commons_audit_events").insert({')
    expect(source).toContain('actor_user_id: user.id')
    expect(source).toContain('policy_version: "1.0.0"')
    expect(source).toContain('idempotency_key: `cc-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-federation operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-federation/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-federation read filters, kill-switch keys, and audit attribution', () => {
    const source = readFileSync('app/api/admin/creator-federation/ops/route.ts', 'utf8')
    expect(source).toContain('creator_federation_admin_ops_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('federation_partition_stop: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_federation_audit_events").insert({')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('action: payload.action_type')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-interoperability-convention operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-interoperability-convention/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-interoperability-convention gates, read filters, kill-switch keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-interoperability-convention/ops/route.ts', 'utf8')
    expect(source).toContain('creator_interop_convention_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_interop_%")')
    expect(source).toContain('convention_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_interop_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('event_hash: `p14-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-interoperability-institution operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-interoperability-institution/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-interoperability-institution gates, read filters, kill-switch keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-interoperability-institution/ops/route.ts', 'utf8')
    expect(source).toContain('creator_interop_institution_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_interop_institution_%")')
    expect(source).toContain('institution_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_interop_institution_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('event_hash: `p16-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-interoperability-organization operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-interoperability-organization/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-interoperability-organization gates, read filters, kill-switch keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-interoperability-organization/ops/route.ts', 'utf8')
    expect(source).toContain('creator_interop_org_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_interop_org_%")')
    expect(source).toContain('organization_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_interop_org_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('actor_id: user.id')
    expect(source).toContain('event_hash: `p15-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-protocol-constitution operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-protocol-constitution/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-protocol-constitution gates, read filters, freeze keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-protocol-constitution/ops/route.ts', 'utf8')
    expect(source).toContain('creator_protocol_constitution_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_protocol_%")')
    expect(source).toContain('fundamental_provision_freeze: [')
    expect(source).toContain('succession_crisis_stop: [')
    expect(source).toContain('emergency_sunset: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_protocol_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('subject_id: null')
    expect(source).toContain('event_hash: `cpc-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-public-infrastructure operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-public-infrastructure/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-public-infrastructure gate, read filters, kill-switch keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-public-infrastructure/ops/route.ts', 'utf8')
    expect(source).toContain('creator_public_infrastructure_admin_ops_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_public_infrastructure_%")')
    expect(source).toContain('identifier_abuse_stop: [')
    expect(source).toContain('trust_compromise_stop: [')
    expect(source).toContain('participation_withdrawal_broadcast: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_public_audit_events").insert({')
    expect(source).toContain('actor_user_id: user.id')
    expect(source).toContain('object_id: "creator_public_infrastructure"')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-multilateral-treaty-operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-multilateral-treaty-operations/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-multilateral-treaty gates, read filters, action keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-multilateral-treaty-operations/ops/route.ts', 'utf8')
    expect(source).toContain('creator_treaty_ops_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_treaty_ops_%")')
    expect(source).toContain('public_law_claim_stop: [')
    expect(source).toContain('competence_stop: [')
    expect(source).toContain('treaty_ops_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_treaty_ops_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('subject_id: "creator_treaty_ops"')
    expect(source).toContain('event_hash: `p17-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-treaty-system-renewal operations as platform-only with audited mutations', () => {
    const route = '/api/admin/creator-treaty-system-renewal/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-treaty-renewal gates, read filters, action keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-treaty-system-renewal/ops/route.ts', 'utf8')
    expect(source).toContain('creator_treaty_renewal_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_treaty_renewal_%")')
    expect(source).toContain('public_law_claim_stop: [')
    expect(source).toContain('sunset_stop: [')
    expect(source).toContain('renewal_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_treaty_renewal_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('subject_id: "creator_treaty_renewal"')
    expect(source).toContain('event_hash: `p18-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })

  it('classifies creator-treaty-system-legacy operations as platform-only with exact POST audit semantics', () => {
    const route = '/api/admin/creator-treaty-system-legacy/ops'
    const registryEntry = ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
    expect(registryEntry?.authClass).toBe('platform_admin')
    expect(registryEntry?.capability).toBeUndefined()
    expect(registryEntry?.idempotency).toBe(false)
    expect(registryEntry?.audit).toBe(false)
    expect(registryEntry?.auditMethods).toEqual(['POST'])

    const contracts = adminCommandCapabilityMatrix().filter((entry) => entry.route === route)
    expect(contracts.map((entry) => entry.method)).toEqual(['GET', 'POST'])
    for (const contract of contracts) {
      expect(contract.actingContext).toBe('platform_admin')
      expect(contract.tenantTarget).toBe('platform')
      expect(contract.capabilities).toEqual([])
    }
    expect(contracts.find((entry) => entry.method === 'GET')?.audit).toBe('not_applicable')
    expect(contracts.find((entry) => entry.method === 'POST')?.audit).toBe('required')
  })

  it('retains creator-treaty-legacy gates, read filters, action keys, and audit fields', () => {
    const source = readFileSync('app/api/admin/creator-treaty-system-legacy/ops/route.ts', 'utf8')
    expect(source).toContain('creator_treaty_legacy_readiness_enabled')
    expect(source).toContain('.in("status", ["pending", "failed"])')
    expect(source).toContain('.like("key", "creator_treaty_legacy_%")')
    expect(source).toContain('public_law_claim_stop: [')
    expect(source).toContain('legacy_freeze: [')
    expect(source).toContain('.eq("key", flagKey)')
    expect(source).toContain('.from("creator_treaty_legacy_audit_events").insert({')
    expect(source).toContain('actor_type: "admin"')
    expect(source).toContain('subject_id: "creator_treaty_legacy"')
    expect(source).toContain('event_hash: `p19-ops:${payload.action_type}:${user.id}:${Date.now()}`')
    expect(source).not.toContain('requireApiUser')
    expect(source).not.toContain('async function assertAdmin')
  })
})
