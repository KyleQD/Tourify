import type { SupabaseClient } from "@supabase/supabase-js"

export interface ListEventDocumentsParams {
  eventId: string
  userRole: string
}

/**
 * Event-scoped documents with the same visibility rules as Event HQ (visible_to).
 */
export async function listVisibleEventDocuments(
  supabase: SupabaseClient,
  input: ListEventDocumentsParams
) {
  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", input.eventId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw error

  const rows = data || []
  return rows.filter((doc: { visible_to?: string[] }) => {
    if (!doc.visible_to || doc.visible_to.includes("all")) return true
    return doc.visible_to.includes(input.userRole)
  })
}
