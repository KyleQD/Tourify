/**
 * TOUR-207 — Archive/restore side effects.
 *
 * Archive: revoke eligible shares, clear feed tokens, preserve legal/finance.
 * Restore: return to pre_archive_state when valid; do not re-create revoked shares.
 */

import type { TourLifecycleState } from "@/lib/admin/tour-lifecycle"
import { normalizeTourLifecycleState } from "@/lib/admin/tour-lifecycle"

export interface TourArchiveSideEffectResult {
  grantsRevoked: number
  publicationTokensRevoked: number
  calendarTokenCleared: boolean
  shareTokenCleared: boolean
  preserved: {
    financeTransactions: number
    settlements: number
    contracts: number
  }
  preArchiveState: TourLifecycleState | null
}

export function resolveRestoreTargetState(
  settings: Record<string, unknown> | null | undefined,
  fallback: TourLifecycleState = "completed",
): TourLifecycleState {
  const lifecycle =
    settings?.lifecycle && typeof settings.lifecycle === "object" && !Array.isArray(settings.lifecycle)
      ? (settings.lifecycle as Record<string, unknown>)
      : {}
  const pre = normalizeTourLifecycleState(
    typeof lifecycle.pre_archive_state === "string" ? lifecycle.pre_archive_state : null,
  )
  if (pre === "completed" || pre === "settled" || pre === "cancelled") return pre
  return fallback
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

async function countPreserved(
  supabase: SupabaseLike,
  table: string,
  tourId: string,
  orgId?: string,
): Promise<number> {
  try {
    let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("tour_id", tourId)
    if (orgId) query = query.eq("org_id", orgId)
    const { count, error } = await query
    if (error) return 0
    return typeof count === "number" ? count : 0
  } catch {
    return 0
  }
}

/**
 * Revoke eligible shares and clear feed tokens. Never deletes finance/legal rows.
 */
export async function applyTourArchiveSideEffects(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
  actorUserId: string
  currentState: TourLifecycleState
  tour: Record<string, unknown>
}): Promise<{
  result: TourArchiveSideEffectResult
  nextSettings: Record<string, unknown>
  clearCalendarToken: boolean
}> {
  const now = new Date().toISOString()
  const settings =
    args.tour.settings && typeof args.tour.settings === "object" && !Array.isArray(args.tour.settings)
      ? { ...(args.tour.settings as Record<string, unknown>) }
      : {}

  let grantsRevoked = 0
  {
    const { data, error } = await args.supabase
      .from("entity_grants")
      .update({
        status: "revoked",
        revoked_at: now,
        revoked_by: args.actorUserId,
        updated_at: now,
      })
      .eq("org_id", args.orgId)
      .eq("resource_type", "tour")
      .eq("resource_id", args.tourId)
      .eq("status", "active")
      .select("id")
    if (!error && Array.isArray(data)) grantsRevoked = data.length
  }

  let publicationTokensRevoked = 0
  for (const filter of [
    { aggregate_id: args.tourId },
    { tour_id: args.tourId },
  ] as const) {
    const { data, error } = await args.supabase
      .from("admin_publication_share_tokens")
      .update({ revoked_at: now })
      .eq("org_id", args.orgId)
      .is("revoked_at", null)
      .match(filter)
      .select("id")
    if (!error && Array.isArray(data) && data.length > 0) {
      publicationTokensRevoked += data.length
      break
    }
  }

  const hadCalendar = Boolean(args.tour.calendar_token)
  const hadShare = Boolean(settings.share_token || args.tour.share_token)
  if (settings.share_token) delete settings.share_token

  const preserved = {
    financeTransactions: await countPreserved(
      args.supabase,
      "financial_transactions",
      args.tourId,
      args.orgId,
    ),
    settlements: await countPreserved(args.supabase, "settlements", args.tourId),
    contracts: await countPreserved(args.supabase, "contracts", args.tourId),
  }

  const lifecycle =
    settings.lifecycle && typeof settings.lifecycle === "object" && !Array.isArray(settings.lifecycle)
      ? { ...(settings.lifecycle as Record<string, unknown>) }
      : {}

  lifecycle.pre_archive_state = args.currentState
  lifecycle.archived_by = args.actorUserId
  lifecycle.archived_at = now
  lifecycle.archive_preserved = preserved
  lifecycle.archive_revoked = {
    grants: grantsRevoked,
    publication_tokens: publicationTokensRevoked,
    calendar_token: hadCalendar,
    share_token: hadShare,
  }

  settings.lifecycle = lifecycle

  return {
    result: {
      grantsRevoked,
      publicationTokensRevoked,
      calendarTokenCleared: hadCalendar,
      shareTokenCleared: hadShare,
      preserved,
      preArchiveState: args.currentState,
    },
    nextSettings: settings,
    clearCalendarToken: hadCalendar,
  }
}
