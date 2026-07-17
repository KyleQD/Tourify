import "server-only"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { isOrganizationType, normalizeAccountType } from "@/lib/accounts/account-types"

type SupabaseLike = any

const ADMIN_ORG_ROLES = new Set(["owner", "admin", "tour_manager", "production"])

export interface AdminWorkspaceScope {
  userId: string
  accountType: "organization"
  organizerAccountId: string
  organizerSubtype: string | null
  opsOrgId: string | null
  source: "header" | "query" | "session"
}

interface AuthLike {
  user: { id?: string | null }
  supabase: SupabaseLike
}

function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    { status },
  )
}

function readAccountFromQuery(request: NextRequest): string | null {
  try {
    const url = new URL(request.url)
    return url.searchParams.get("account")
  } catch {
    return null
  }
}

async function readSessionAccount(supabase: SupabaseLike, userId: string) {
  const { data } = await supabase
    .from("user_sessions")
    .select("active_profile_id, active_account_type")
    .eq("user_id", userId)
    .maybeSingle()

  if (!data?.active_profile_id) return null
  const accountType = normalizeAccountType(data.active_account_type)
  if (!isOrganizationType(accountType)) return null
  return String(data.active_profile_id)
}

async function verifyOrganizerScope(args: {
  supabase: SupabaseLike
  userId: string
  organizerAccountId: string
  source: AdminWorkspaceScope["source"]
}): Promise<AdminWorkspaceScope | NextResponse> {
  const { data: organizer, error } = await args.supabase
    .from("organizer_accounts")
    .select("id, user_id, subtype, organization_type, ops_org_id, is_active")
    .eq("id", args.organizerAccountId)
    .maybeSingle()

  if (error) {
    return jsonError("Unable to resolve organization workspace.", 500)
  }

  if (!organizer?.id || organizer.is_active === false) {
    return jsonError("Organization workspace was not found.", 404)
  }

  const opsOrgId = organizer.ops_org_id ? String(organizer.ops_org_id) : null
  const ownsOrganizer = organizer.user_id === args.userId

  let hasOrgGrant = false
  if (!ownsOrganizer && opsOrgId) {
    const { data: member, error: memberError } = await args.supabase
      .from("org_members")
      .select("role")
      .eq("org_id", opsOrgId)
      .eq("user_id", args.userId)
      .maybeSingle()

    if (memberError) {
      return jsonError("Unable to verify organization workspace access.", 500)
    }

    hasOrgGrant = ADMIN_ORG_ROLES.has(String(member?.role || ""))
  }

  if (!ownsOrganizer && !hasOrgGrant) {
    return jsonError("Organization workspace is not available to this user.", 403)
  }

  return {
    userId: args.userId,
    accountType: "organization",
    organizerAccountId: String(organizer.id),
    organizerSubtype: organizer.subtype || organizer.organization_type || null,
    opsOrgId,
    source: args.source,
  }
}

export async function resolveAdminWorkspaceScope(
  request: NextRequest,
  auth: AuthLike,
): Promise<AdminWorkspaceScope | NextResponse> {
  const scope = await resolveOptionalAdminWorkspaceScope(request, auth)
  if (scope) return scope
  return jsonError("No active organization workspace was provided.", 400)
}

export async function resolveOptionalAdminWorkspaceScope(
  request: NextRequest,
  auth: AuthLike,
): Promise<AdminWorkspaceScope | NextResponse | null> {
  const userId = auth.user?.id
  if (!userId) return jsonError("Unauthorized", 401)

  const headerProfileId = request.headers.get("x-acting-profile-id")
  const headerAccountType = request.headers.get("x-acting-account-type")

  if (headerProfileId || headerAccountType) {
    const accountType = normalizeAccountType(headerAccountType || "")
    if (!headerProfileId || !isOrganizationType(accountType)) {
      return jsonError("Admin workspace data requires an active organization account.", 400)
    }

    return verifyOrganizerScope({
      supabase: auth.supabase,
      userId,
      organizerAccountId: headerProfileId,
      source: "header",
    })
  }

  const queryAccountId = readAccountFromQuery(request)
  if (queryAccountId) {
    return verifyOrganizerScope({
      supabase: auth.supabase,
      userId,
      organizerAccountId: queryAccountId,
      source: "query",
    })
  }

  const sessionAccountId = await readSessionAccount(auth.supabase, userId)
  if (sessionAccountId) {
    return verifyOrganizerScope({
      supabase: auth.supabase,
      userId,
      organizerAccountId: sessionAccountId,
      source: "session",
    })
  }

  return null
}

export function requireOpsOrgId(scope: AdminWorkspaceScope): string | NextResponse {
  if (scope.opsOrgId) return scope.opsOrgId
  return jsonError("Organization workspace is missing its operational scope.", 409, {
    organizerAccountId: scope.organizerAccountId,
  })
}

export function impossibleUuid() {
  return "00000000-0000-0000-0000-000000000000"
}
