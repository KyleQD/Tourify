import { createClient } from "@supabase/supabase-js"

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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
}

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
    // Audit failures are non-fatal — log and continue
    console.error("[audit] Failed to write audit event", payload.action, payload.entityType)
  }
}
