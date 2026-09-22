import { resolveAdminFeatureFlag, type AdminFeatureFlagResolution } from "@/lib/admin/feature-flags/resolver"
import { requireTourAccess } from "@/lib/admin/tour-access.service"

export const LOGISTICS_PLAN_WORKSPACE_FLAG = "admin_logistics_plan_workspace_v1"

type SupabaseLike = { from: (table: string) => any }

export class LogisticsPlanAccessError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status = 403, code = "logistics_plan_access_denied") {
    super(message)
    this.name = "LogisticsPlanAccessError"
    this.status = status
    this.code = code
  }
}

function featureFlagEnvironment(): string {
  const configured = process.env.ADMIN_FEATURE_FLAG_ENV?.trim()
  if (configured) return configured
  if (process.env.VERCEL_ENV === "production") return "production"
  return "staging"
}

export async function resolveLogisticsPlanWorkspaceFlag(args: {
  supabase: SupabaseLike
  orgId: string
  now?: Date
}): Promise<AdminFeatureFlagResolution> {
  const environment = featureFlagEnvironment()
  const [definitionResult, assignmentResult] = await Promise.all([
    args.supabase
      .from("admin_feature_flag_definitions")
      .select("key, safe_default, environments, state, expires_at")
      .eq("key", LOGISTICS_PLAN_WORKSPACE_FLAG)
      .maybeSingle(),
    args.supabase
      .from("admin_org_feature_flag_assignments")
      .select("enabled, rollout_percentage, environment, assignment_version")
      .eq("org_id", args.orgId)
      .eq("flag_key", LOGISTICS_PLAN_WORKSPACE_FLAG)
      .eq("environment", environment)
      .maybeSingle(),
  ])

  if (definitionResult.error || assignmentResult.error) {
    throw new LogisticsPlanAccessError(
      "The logistics workspace feature state is unavailable.",
      503,
      "feature_flag_store_unavailable",
    )
  }

  return resolveAdminFeatureFlag({
    definition: definitionResult.data,
    assignment: assignmentResult.data,
    orgId: args.orgId,
    environment,
    now: args.now,
  })
}

export async function requireLogisticsPlanAccess(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  tourId?: string | null
}): Promise<{ flag: AdminFeatureFlagResolution }> {
  const flag = await resolveLogisticsPlanWorkspaceFlag({
    supabase: args.supabase,
    orgId: args.orgId,
  })
  if (!flag.enabled) {
    throw new LogisticsPlanAccessError(
      "The logistics plan workspace is not enabled for this organization.",
      404,
      "logistics_plan_workspace_unavailable",
    )
  }

  if (args.tourId) {
    await requireTourAccess({
      supabase: args.supabase,
      userId: args.userId,
      tourId: args.tourId,
      orgId: args.orgId,
    })
  }

  return { flag }
}
