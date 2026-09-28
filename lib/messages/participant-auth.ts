import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * VEN-095 — acting-account participant resolution for conversations.
 *
 * Conversation participants may be a human profile id OR an institutional
 * account id (e.g. venue_profiles.id, per VEN-025). Authorization therefore
 * cannot compare against auth.uid() alone: the acting account must be
 * resolved server-side and proven to belong to the authenticated user.
 *
 * A client-supplied `actingAccountId` hint is honored ONLY when it matches an
 * active account owned by that user (VEN-004 pattern) — never trusted as-is.
 */
export async function resolveActingAccountIds(
  userId: string,
  actingAccountId?: string | null,
): Promise<{ ids: string[]; error?: string }> {
  const ids = new Set<string>([userId])

  if (actingAccountId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actingAccountId)) {
    if (actingAccountId === userId) {
      return { ids: [userId] }
    }

    const supabase = createServiceRoleClient()

    // Venue account: owner or delegated main_profile holder.
    const { data: venueRow } = await supabase
      .from("venue_profiles")
      .select("id")
      .eq("id", actingAccountId)
      .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`)
      .maybeSingle()
    if (venueRow?.id) {
      ids.add(venueRow.id)
      return { ids: Array.from(ids) }
    }

    // Artist account.
    const { data: artistRow } = await supabase
      .from("artist_profiles")
      .select("id")
      .eq("id", actingAccountId)
      .eq("user_id", userId)
      .maybeSingle()
    if (artistRow?.id) {
      ids.add(artistRow.id)
      return { ids: Array.from(ids) }
    }

    // Hint provided but not owned → deny the hint (do NOT silently fall back),
    // so a stale/cross-account context can never widen access.
    return { ids: [userId], error: "Acting account is not owned by this user" }
  }

  return { ids: Array.from(ids) }
}

/** True when ANY of the acting ids participates in the conversation. */
export function isConversationParticipant(
  conversation: { participant_1: string; participant_2: string },
  actingIds: string[],
): boolean {
  return (
    actingIds.includes(conversation.participant_1) ||
    actingIds.includes(conversation.participant_2)
  )
}
