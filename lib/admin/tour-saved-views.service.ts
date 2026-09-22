/**
 * TOUR-209 — Persist and list personal/organization tour portfolio saved views.
 */

import {
  presentTourSavedView,
  TourSavedViewError,
  validateTourSavedViewPayload,
  type TourSavedViewRecord,
} from "@/lib/admin/tour-saved-view"


type SupabaseLike = { from: (table: string) => any }

export async function listTourSavedViews(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
}): Promise<TourSavedViewRecord[]> {
  const { data, error } = await args.supabase
    .from("tour_saved_views")
    .select("*")
    .eq("org_id", args.orgId)
    .or(`scope.eq.organization,and(scope.eq.personal,owner_user_id.eq.${args.userId})`)
    .order("updated_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return []
    throw new Error(error.message)
  }

  const views: TourSavedViewRecord[] = []
  for (const row of data ?? []) {
    try {
      views.push(presentTourSavedView(row as Record<string, unknown>))
    } catch {
      // Skip views whose filters/columns no longer validate (permission/schema drift).
    }
  }
  return views
}

export async function createTourSavedView(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
  name: unknown
  scope: unknown
  filters: unknown
  columns: unknown
  is_default?: unknown
}): Promise<TourSavedViewRecord> {
  const payload = validateTourSavedViewPayload(args)
  if (payload.scope === "organization") {
    // Organization views are shared; any org member may create (RLS + org membership).
  }

  if (payload.is_default) {
    await clearDefaultSavedViews({
      supabase: args.supabase,
      orgId: args.orgId,
      userId: args.userId,
      scope: payload.scope,
    })
  }

  const { data, error } = await args.supabase
    .from("tour_saved_views")
    .insert({
      org_id: args.orgId,
      scope: payload.scope,
      owner_user_id: payload.scope === "personal" ? args.userId : null,
      name: payload.name,
      filters: payload.filters,
      columns: payload.columns,
      is_default: payload.is_default,
      created_by: args.userId,
      updated_by: args.userId,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new TourSavedViewError("duplicate_view_name", "A view with that name already exists.", 409)
    }
    throw new Error(error.message)
  }
  return presentTourSavedView(data as Record<string, unknown>)
}

export async function updateTourSavedView(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
  viewId: string
  name?: unknown
  scope?: unknown
  filters?: unknown
  columns?: unknown
  is_default?: unknown
}): Promise<TourSavedViewRecord> {
  const { data: existing, error: lookupError } = await args.supabase
    .from("tour_saved_views")
    .select("*")
    .eq("id", args.viewId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (lookupError) throw new Error(lookupError.message)
  if (!existing) throw new TourSavedViewError("view_not_found", "Saved view not found.", 404)

  if (
    existing.scope === "personal"
    && String(existing.owner_user_id || "") !== args.userId
  ) {
    throw new TourSavedViewError("view_forbidden", "Cannot update another user's personal view.", 403)
  }

  const payload = validateTourSavedViewPayload({
    name: args.name !== undefined ? args.name : existing.name,
    scope: args.scope !== undefined ? args.scope : existing.scope,
    filters: args.filters !== undefined ? args.filters : existing.filters,
    columns: args.columns !== undefined ? args.columns : existing.columns,
    is_default: args.is_default !== undefined ? args.is_default : existing.is_default,
  })

  if (payload.scope === "personal" && existing.scope === "organization") {
    throw new TourSavedViewError("invalid_view_scope", "Cannot convert an organization view to personal.")
  }

  if (payload.is_default) {
    await clearDefaultSavedViews({
      supabase: args.supabase,
      orgId: args.orgId,
      userId: args.userId,
      scope: payload.scope,
    })
  }

  const { data, error } = await args.supabase
    .from("tour_saved_views")
    .update({
      name: payload.name,
      scope: payload.scope,
      owner_user_id: payload.scope === "personal" ? args.userId : null,
      filters: payload.filters,
      columns: payload.columns,
      is_default: payload.is_default,
      updated_by: args.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.viewId)
    .eq("org_id", args.orgId)
    .select("*")
    .maybeSingle()

  if (error) {
    if (error.code === "23505") {
      throw new TourSavedViewError("duplicate_view_name", "A view with that name already exists.", 409)
    }
    throw new Error(error.message)
  }
  if (!data) throw new TourSavedViewError("view_not_found", "Saved view not found.", 404)
  return presentTourSavedView(data as Record<string, unknown>)
}

export async function deleteTourSavedView(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
  viewId: string
}): Promise<void> {
  const { data: existing, error: lookupError } = await args.supabase
    .from("tour_saved_views")
    .select("id, scope, owner_user_id")
    .eq("id", args.viewId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (lookupError) throw new Error(lookupError.message)
  if (!existing) throw new TourSavedViewError("view_not_found", "Saved view not found.", 404)
  if (
    existing.scope === "personal"
    && String(existing.owner_user_id || "") !== args.userId
  ) {
    throw new TourSavedViewError("view_forbidden", "Cannot delete another user's personal view.", 403)
  }

  const { error } = await args.supabase
    .from("tour_saved_views")
    .delete()
    .eq("id", args.viewId)
    .eq("org_id", args.orgId)
  if (error) throw new Error(error.message)
}

async function clearDefaultSavedViews(args: {
  supabase: SupabaseLike
  orgId: string
  userId: string
  scope: "personal" | "organization"
}): Promise<void> {
  let query = args.supabase
    .from("tour_saved_views")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("org_id", args.orgId)
    .eq("scope", args.scope)
    .eq("is_default", true)

  if (args.scope === "personal") {
    query = query.eq("owner_user_id", args.userId)
  }

  const { error } = await query
  if (error && error.code !== "42P01") throw new Error(error.message)
}
