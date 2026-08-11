import "server-only"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"

/**
 * SEC-111 — Append-only security audit writer with action-class fail policy.
 *
 * | action_class      | audit failure |
 * |-------------------|---------------|
 * | mutation          | fail_closed   |
 * | export            | fail_closed   |
 * | privileged_read   | fail_open     |
 * | authz_decision    | fail_open     |
 */

export type SecurityAuditActionClass =
  | "mutation"
  | "privileged_read"
  | "export"
  | "authz_decision"

export type SecurityAuditResult = "success" | "denied" | "error"
export type SecurityAuditFailPolicy = "fail_closed" | "fail_open"

export const SECURITY_AUDIT_FAIL_POLICY: Record<
  SecurityAuditActionClass,
  SecurityAuditFailPolicy
> = {
  mutation: "fail_closed",
  export: "fail_closed",
  privileged_read: "fail_open",
  authz_decision: "fail_open",
}

export class SecurityAuditWriteError extends Error {
  readonly code = "audit_write_failed"
  readonly actionClass: SecurityAuditActionClass
  readonly failPolicy: SecurityAuditFailPolicy

  constructor(actionClass: SecurityAuditActionClass, cause?: unknown) {
    super(`Security audit write failed for action class ${actionClass}`)
    this.name = "SecurityAuditWriteError"
    this.actionClass = actionClass
    this.failPolicy = SECURITY_AUDIT_FAIL_POLICY[actionClass]
    if (cause instanceof Error) this.cause = cause
  }
}

export interface WriteSecurityAuditEventInput {
  actorUserId?: string | null
  principalType?: "user" | "service_job" | "system"
  actingOrgId?: string | null
  actingProfileId?: string | null
  action: string
  actionClass: SecurityAuditActionClass
  targetType?: string | null
  targetId?: string | null
  correlationId?: string | null
  result: SecurityAuditResult
  reason?: string | null
  ipFingerprint?: string | null
  userAgentFingerprint?: string | null
  beforeDiff?: Record<string, unknown> | null
  afterDiff?: Record<string, unknown> | null
  moduleId?: string | null
  metadata?: Record<string, unknown>
  /** When true, skip fail-closed throw (tests / dual-write soft path). */
  forceFailOpen?: boolean
}

function fingerprint(value: string | null | undefined, max = 128): string | null {
  if (!value) return null
  return value.slice(0, max)
}

/**
 * Write one append-only security audit event.
 * Throws SecurityAuditWriteError when policy is fail_closed and the write fails.
 */
export async function writeSecurityAuditEvent(
  input: WriteSecurityAuditEventInput,
): Promise<{ id: string | null }> {
  const failPolicy = input.forceFailOpen
    ? "fail_open"
    : SECURITY_AUDIT_FAIL_POLICY[input.actionClass]

  try {
    if (!input.actingOrgId) throw new Error("Security audit service-role writes require a verified actingOrgId.")
    return await executeServiceRoleJob({
      orgId: input.actingOrgId,
      reason: `Write security audit event for ${input.action}`,
      moduleId: "security.audit",
    }, async (supabase) => {
      const { data, error } = await supabase.rpc("write_security_audit_event", {
        p_actor_user_id: input.actorUserId ?? null,
        p_principal_type: input.principalType ?? "user",
        p_acting_org_id: input.actingOrgId,
        p_acting_profile_id: input.actingProfileId ?? null,
        p_action: input.action,
        p_action_class: input.actionClass,
        p_target_type: input.targetType ?? null,
        p_target_id: input.targetId ?? null,
        p_correlation_id: input.correlationId ?? null,
        p_result: input.result,
        p_reason: input.reason ?? null,
        p_ip_fingerprint: fingerprint(input.ipFingerprint),
        p_user_agent_fingerprint: fingerprint(input.userAgentFingerprint, 256),
        p_before_diff: input.beforeDiff ?? null,
        p_after_diff: input.afterDiff ?? null,
        p_module_id: input.moduleId ?? null,
        p_metadata: input.metadata ?? {},
      })

      if (error) throw error
      return { id: typeof data === "string" ? data : null }
    })
  } catch (cause) {
    console.error(
      "[security-audit] write failed",
      input.actionClass,
      input.action,
      cause,
    )
    if (failPolicy === "fail_closed") {
      throw new SecurityAuditWriteError(input.actionClass, cause)
    }
    return { id: null }
  }
}

export function auditFailPolicyFor(
  actionClass: SecurityAuditActionClass,
): SecurityAuditFailPolicy {
  return SECURITY_AUDIT_FAIL_POLICY[actionClass]
}
