export interface AdminFeatureFlagDefinitionRow {
  key: string
  safe_default: boolean
  environments: string[]
  state: "active" | "retired"
  expires_at: string
}

export interface AdminFeatureFlagAssignmentRow {
  enabled: boolean
  rollout_percentage: number
  environment: string
  assignment_version: number
}

export interface AdminFeatureFlagResolution {
  enabled: boolean
  state: "ready" | "unavailable" | "expired" | "retired"
  reason: string
  assignmentVersion: number | null
}

function stableBucket(orgId: string, key: string): number {
  let hash = 2166136261
  for (const char of `${orgId}:${key}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export function resolveAdminFeatureFlag(args: {
  definition: AdminFeatureFlagDefinitionRow | null
  assignment: AdminFeatureFlagAssignmentRow | null
  orgId: string
  environment: string
  now?: Date
}): AdminFeatureFlagResolution {
  if (!args.definition) {
    return { enabled: false, state: "unavailable", reason: "definition_missing", assignmentVersion: null }
  }
  if (args.definition.state === "retired") {
    return { enabled: args.definition.safe_default, state: "retired", reason: "definition_retired", assignmentVersion: null }
  }
  if (new Date(args.definition.expires_at) <= (args.now ?? new Date())) {
    return { enabled: args.definition.safe_default, state: "expired", reason: "definition_expired", assignmentVersion: null }
  }
  if (!args.definition.environments.includes(args.environment)) {
    return { enabled: args.definition.safe_default, state: "unavailable", reason: "environment_not_allowed", assignmentVersion: null }
  }
  if (!args.assignment || args.assignment.environment !== args.environment) {
    return { enabled: args.definition.safe_default, state: "unavailable", reason: "assignment_missing", assignmentVersion: null }
  }
  const enabled = args.assignment.enabled
    && stableBucket(args.orgId, args.definition.key) < args.assignment.rollout_percentage
  return {
    enabled,
    state: enabled ? "ready" : "unavailable",
    reason: enabled ? "assignment_enabled" : "assignment_disabled_or_outside_rollout",
    assignmentVersion: args.assignment.assignment_version,
  }
}
