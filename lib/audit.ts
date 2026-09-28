import { createClient } from "@supabase/supabase-js"
import { writeSecurityAuditEvent } from "@/lib/security/write-security-audit-event"

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface AuditPayload {
  actorId: string
  orgId: string
  action: "create" | "update" | "delete" | "publish" | "unpublish" | "settle" | "refund" | "hire" | "fire" | "flag" | "toggle"
  entityType: "event" | "tour" | "transaction" | "budget" | "settlement" | "staff" | "rbac" | "ticket" | "feature_flag" | "content" | "artist" | "venue"
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  request?: { ip?: string; userAgent?: string }
  correlationId?: string
}

/**
 * Legacy admin_audit_log writer + SEC-111 dual-write to security_audit_events.
 * Dual-write uses fail_open so existing callers are not blocked before full cutover.
 */
export async function logAuditEvent(payload: AuditPayload): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from("admin_audit_log").insert({
      actor_id: payload.actorId,
      org_id: payload.orgId,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      old_values: payload.oldValues ?? null,
      new_values: payload.newValues ?? null,
      ip_address: payload.request?.ip ?? null,
      user_agent: payload.request?.userAgent ?? null,
    })
  } catch {
    console.error("[audit] Failed to write admin_audit_log", payload.action, payload.entityType)
  }

  try {
    await writeSecurityAuditEvent({
      actorUserId: payload.actorId,
      actingOrgId: payload.orgId,
      action: payload.action,
      actionClass: "mutation",
      targetType: payload.entityType,
      targetId: payload.entityId ?? null,
      correlationId: payload.correlationId ?? null,
      result: "success",
      ipFingerprint: payload.request?.ip,
      userAgentFingerprint: payload.request?.userAgent,
      beforeDiff: payload.oldValues ?? null,
      afterDiff: payload.newValues ?? null,
      moduleId: "legacy.logAuditEvent",
      forceFailOpen: true,
    })
  } catch {
    // forceFailOpen should not throw; keep belt-and-suspenders
  }
}
