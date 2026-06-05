import { NextRequest, NextResponse } from "next/server"
import { withAdminAuth } from "@/lib/auth/api-auth"
import { createClient } from "@supabase/supabase-js"

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export const GET = withAdminAuth(async (request: NextRequest, { user }: { user: any }) => {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const offset = (page - 1) * limit
    const actorId = searchParams.get("actor_id")
    const entityType = searchParams.get("entity_type")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile?.org_id) {
      return NextResponse.json({ error: "No org found for user" }, { status: 403 })
    }

    let query = supabase
      .from("admin_audit_log")
      .select(`
        id, actor_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent, created_at,
        actor:profiles!actor_id(id, full_name, username, avatar_url)
      `, { count: "exact" })
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (actorId) query = query.eq("actor_id", actorId)
    if (entityType) query = query.eq("entity_type", entityType)
    if (from) query = query.gte("created_at", from)
    if (to) query = query.lte("created_at", to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      logs: data,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    console.error("[GET /api/admin/audit]", err)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
})
