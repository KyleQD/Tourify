/**
 * VEN-291/292/293/295/296 — venue workflow notification routing.
 *
 * Fanout resolves CURRENT authorized humans from canonical RBAC at send time
 * (never a stale recipient list), tags rows into the venue account inbox, and
 * routes delivery through the existing OptimizedNotificationService so each
 * human's notification_preferences (channels + quiet hours) still govern.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"

export type VenueWorkflow =
  | "booking_request"
  | "booking_transition"
  | "hiring_stage"
  | "shift_published"
  | "checkin_alert"
  | "document_shared"

/** Fallback when a venue has no active subscription row for a workflow. */
export const DEFAULT_WORKFLOW_ROUTES: Record<VenueWorkflow, { permission: string; priority: "low" | "normal" | "high" | "urgent" }> = {
  booking_request: { permission: "manage_bookings", priority: "high" },
  booking_transition: { permission: "manage_bookings", priority: "normal" },
  hiring_stage: { permission: "hiring_manage", priority: "normal" },
  shift_published: { permission: "scheduling_manage", priority: "normal" },
  checkin_alert: { permission: "door_check_in", priority: "high" },
  document_shared: { permission: "manage_documents", priority: "normal" },
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/**
 * VEN-292 — resolve the distinct humans currently holding `permission` on a
 * venue. Service-role REQUIRED: rbac_user_entity_roles RLS limits users to
 * self-read. Handles the historical 'venue'/'Venue' casing split and always
 * includes the venue profile owners as a floor.
 */
export async function resolveVenueRecipients(
  service: SupabaseClient,
  venueId: string,
  permission: string,
): Promise<string[]> {
  const recipients = new Set<string>()

  // Role-based resolution through the canonical catalog.
  const { data: assignments } = await service
    .from("rbac_user_entity_roles")
    .select("user_id, role_id")
    .in("entity_type", ["Venue", "venue"])
    .eq("entity_id", venueId)
    .eq("is_active", true)

  const roleIds = Array.from(new Set((assignments || []).map((a: any) => a.role_id)))
  if (roleIds.length > 0) {
    const { data: grantedRoles } = await service
      .from("rbac_role_permissions")
      .select("role_id, rbac_permissions!inner(name)")
      .in("role_id", roleIds)
      .eq("rbac_permissions.name", permission)

    const allowedRoleIds = new Set((grantedRoles || []).map((g: any) => g.role_id))
    for (const assignment of assignments || []) {
      if (allowedRoleIds.has(assignment.role_id)) recipients.add(assignment.user_id)
    }
  }

  // Owner floor — venue accounts always reach their owners.
  const { data: profile } = await service
    .from("venue_profiles")
    .select("user_id, main_profile_id")
    .eq("id", venueId)
    .maybeSingle()
  if (profile?.user_id) recipients.add(profile.user_id)
  if (profile?.main_profile_id) recipients.add(profile.main_profile_id)

  return [...recipients]
}

/** Active subscription row or the built-in default route. */
export async function resolveWorkflowRoute(
  service: SupabaseClient,
  venueId: string,
  workflow: VenueWorkflow,
): Promise<{ permission: string; priority: "low" | "normal" | "high" | "urgent"; source: "subscription" | "default" }> {
  const { data: sub } = await service
    .from("venue_workflow_subscriptions")
    .select("target_permission, min_priority")
    .eq("venue_id", venueId)
    .eq("workflow", workflow)
    .eq("is_active", true)
    .maybeSingle()

  if (sub) {
    return {
      permission: String(sub.target_permission),
      priority: (String(sub.min_priority) as "low" | "normal" | "high" | "urgent") || "normal",
      source: "subscription",
    }
  }
  return { ...DEFAULT_WORKFLOW_ROUTES[workflow], source: "default" }
}

// ── VEN-296 — payload PII boundary ────────────────────────────────────────────

const SENSITIVE_KEYS =
  /^(buyer_email|email|phone|phone_number|contact_email|contact_phone|ssn|salary|pay_rate|emergency_contact|date_of_birth|dob)$/i

/**
 * Strips sensitive fields unless the caller explicitly proves every recipient
 * holds the gating permission (e.g. view_attendee_contact). Unknown keys pass;
 * KNOWN sensitive keys are dropped defensively.
 */
export function sanitizeFanoutPayload<T extends Record<string, unknown>>(
  payload: T,
  options: { includeSensitive: boolean },
): T {
  if (options.includeSensitive) return payload
  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (!SENSITIVE_KEYS.test(key)) cleaned[key] = value
  }
  return cleaned as T
}

export interface FanoutInput {
  venueId: string
  workflow: VenueWorkflow
  /** Notification type key from the notifications type CHECK constraint. */
  notificationType: string
  title: string
  content?: string
  /** VEN-293 — deep link into the acting surface. */
  link?: string
  actorUserId?: string | null
  /** Stable identity for dedupe across retries (resource id + event class). */
  dedupeKey: string
  /** Extra metadata merged after PII sanitization. */
  extraMetadata?: Record<string, unknown>
  /**
   * When true, sensitive payload fields survive ONLY because the producer
   * verified recipients hold the gating permission themselves.
   */
  recipientsHoldSensitivePermission?: boolean
}

export interface FanoutResult {
  recipients: number
  routed_via: "subscription" | "default"
  skipped_duplicate: boolean
}

/**
 * VEN-291/292 — send one logical operational event to every current human
 * holding the routed permission on this venue. Delivery per human still flows
 * through should_send_notification + preferences (VEN-294).
 */
export async function fanoutVenueNotification(
  service: SupabaseClient,
  input: FanoutInput,
): Promise<FanoutResult> {
  const route = await resolveWorkflowRoute(service, input.venueId, input.workflow)
  const userIds = await resolveVenueRecipients(service, input.venueId, route.permission)

  // Dedupe probe: any prior row with this dedupe_key short-circuits replay.
  const { data: dupe } = await service
    .from("notifications")
    .select("id")
    .contains("metadata", { dedupe_key: input.dedupeKey })
    .limit(1)
    .maybeSingle()
  if (dupe) {
    return { recipients: userIds.length, routed_via: route.source, skipped_duplicate: true }
  }

  const baseMetadata: Record<string, unknown> = {
    venue_id: input.venueId,
    workflow: input.workflow,
    routed_permission: route.permission,
    ...(input.link ? { link: input.link } : {}),
    ...(input.actorUserId ? { actor_user_id: input.actorUserId } : {}),
    dedupe_key: input.dedupeKey,
    ...sanitizeFanoutPayload(input.extraMetadata || {}, {
      includeSensitive: Boolean(input.recipientsHoldSensitivePermission),
    }),
  }

  if (userIds.length > 0) {
    try {
      await OptimizedNotificationService.createBatchNotifications(
        userIds.map((userId) => ({
          userId,
          type: input.notificationType,
          title: input.title,
          content: input.content || "",
          priority: route.priority,
          targetProfileId: input.venueId,
          targetAccountType: "venue" as const,
          metadata: baseMetadata,
        })),
      )
    } catch (error) {
      console.error("[venue-fanout] batch create failed:", error)
    }
  }

  return { recipients: round2(userIds.length), routed_via: route.source, skipped_duplicate: false }
}
