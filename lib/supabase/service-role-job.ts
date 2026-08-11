import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  isAllowedServiceRoleModule,
  type ServiceRoleModuleId,
} from "@/lib/supabase/service-role-allowlist"

export interface ServiceRoleJobContext {
  /** Verified organization scope for this privileged call. */
  orgId: string
  /** Human/operator reason recorded for auditability. */
  reason: string
  /** Named internal module from the SEC-109 allowlist. */
  moduleId: ServiceRoleModuleId
  /** Optional client-supplied target IDs that must be revalidated against orgId. */
  target?: {
    eventId?: string | null
    tourId?: string | null
    saleId?: string | null
  }
}

export class ServiceRoleJobError extends Error {
  readonly code:
    | "module_not_allowed"
    | "org_required"
    | "reason_required"
    | "org_not_found"
    | "target_org_mismatch"

  constructor(
    code: ServiceRoleJobError["code"],
    message: string,
  ) {
    super(message)
    this.name = "ServiceRoleJobError"
    this.code = code
  }
}

function requireJobContext(context: ServiceRoleJobContext): void {
  if (!context.moduleId || !isAllowedServiceRoleModule(context.moduleId))
    throw new ServiceRoleJobError("module_not_allowed", "Service role module is not allowlisted.")
  if (!context.orgId?.trim())
    throw new ServiceRoleJobError("org_required", "Service role jobs require a verified orgId.")
  if (!context.reason?.trim() || context.reason.trim().length < 3)
    throw new ServiceRoleJobError("reason_required", "Service role jobs require a non-empty reason.")
}

async function revalidateOrgAndTargets(
  client: SupabaseClient,
  context: ServiceRoleJobContext,
): Promise<void> {
  const { data: org, error: orgError } = await client
    .from("organizations")
    .select("id")
    .eq("id", context.orgId)
    .maybeSingle()

  if (orgError || !org)
    throw new ServiceRoleJobError("org_not_found", "Organization not found for service role job.")

  const eventId = context.target?.eventId
  if (eventId) {
    const { data: event } = await client
      .from("events_v2")
      .select("id, org_id")
      .eq("id", eventId)
      .maybeSingle()
    if (!event || event.org_id !== context.orgId)
      throw new ServiceRoleJobError("target_org_mismatch", "Event does not belong to the verified org.")
  }

  const tourId = context.target?.tourId
  if (tourId) {
    const { data: tour } = await client
      .from("tours")
      .select("id, org_id")
      .eq("id", tourId)
      .maybeSingle()
    if (!tour || tour.org_id !== context.orgId)
      throw new ServiceRoleJobError("target_org_mismatch", "Tour does not belong to the verified org.")
  }

  const saleId = context.target?.saleId
  if (saleId) {
    const { data: sale } = await client
      .from("ticket_sales")
      .select("id, event_id, org_id")
      .eq("id", saleId)
      .maybeSingle()

    if (!sale)
      throw new ServiceRoleJobError("target_org_mismatch", "Sale not found for service role job.")

    if (sale.org_id && sale.org_id !== context.orgId)
      throw new ServiceRoleJobError("target_org_mismatch", "Sale does not belong to the verified org.")

    if (!sale.org_id && sale.event_id) {
      const { data: event } = await client
        .from("events_v2")
        .select("id, org_id")
        .eq("id", sale.event_id)
        .maybeSingle()
      if (!event || event.org_id !== context.orgId)
        throw new ServiceRoleJobError("target_org_mismatch", "Sale event does not belong to the verified org.")
    }
  }
}

/**
 * SEC-109 — Privileged Supabase access for named internal modules/jobs only.
 * Every call must supply verified orgId + reason; client-supplied targets are revalidated.
 */
export async function executeServiceRoleJob<T>(
  context: ServiceRoleJobContext,
  run: (client: SupabaseClient, context: ServiceRoleJobContext) => Promise<T>,
): Promise<T> {
  requireJobContext(context)
  const client = createServiceRoleClient()
  await revalidateOrgAndTargets(client, context)
  return run(client, context)
}

export async function resolveServiceRoleJobOrgId(input: {
  reason: string
  moduleId: ServiceRoleModuleId
  lookup: (client: SupabaseClient) => Promise<string | null>
}): Promise<string | null> {
  if (!isAllowedServiceRoleModule(input.moduleId))
    throw new ServiceRoleJobError("module_not_allowed", "Service role module is not allowlisted.")
  if (!input.reason?.trim() || input.reason.trim().length < 3)
    throw new ServiceRoleJobError("reason_required", "Service role jobs require a non-empty reason.")

  const client = createServiceRoleClient()
  const orgId = await input.lookup(client)
  if (!orgId) return null
  await revalidateOrgAndTargets(client, {
    orgId,
    reason: input.reason,
    moduleId: input.moduleId,
  })
  return orgId
}

export async function listServiceRoleJobOrgIds(input: {
  reason: string
  moduleId: ServiceRoleModuleId
  lookup: (client: SupabaseClient) => Promise<string[]>
}): Promise<string[]> {
  if (!isAllowedServiceRoleModule(input.moduleId))
    throw new ServiceRoleJobError("module_not_allowed", "Service role module is not allowlisted.")
  if (!input.reason?.trim() || input.reason.trim().length < 3)
    throw new ServiceRoleJobError("reason_required", "Service role jobs require a non-empty reason.")

  const client = createServiceRoleClient()
  const orgIds = Array.from(new Set((await input.lookup(client)).filter(Boolean)))
  for (const orgId of orgIds) {
    await revalidateOrgAndTargets(client, {
      orgId,
      reason: input.reason,
      moduleId: input.moduleId,
    })
  }
  return orgIds
}
