import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  adminAccessErrorResponse,
  assertAdminTourAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminAuth } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1).max(50),
  role: z.string().min(1).max(64).optional().default("admin"),
  team_name: z.string().min(1).max(120).optional().default("Core Production"),
  // Default false: tour-scoped admin must not imply org membership/billing access.
  grant_org_membership: z.boolean().optional().default(false),
  org_role: z.string().min(1).max(64).optional().default("tour_manager"),
  profiles: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        name: z.string().optional(),
        email: z.string().optional(),
      }),
    )
    .optional(),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

async function ensureCoreTeam(
  supabase: { from: (table: string) => any },
  tourId: string,
  teamName: string,
) {
  const { data: existing } = await supabase
    .from("tour_teams")
    .select("id,name")
    .eq("tour_id", tourId)
    .eq("name", teamName)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data, error } = await supabase
    .from("tour_teams")
    .insert({ tour_id: tourId, name: teamName, team_type: "core" })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export const POST = withAdminAuth(async (req: NextRequest, { supabase, user }) => {
  try {
    const tourId = extractTourId(req.url)
    if (!tourId) return NextResponse.json({ error: "tour id required" }, { status: 400 })

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    await assertAdminTourAccess({ supabase, userId: user.id, tourId })

    const { data: tourRow } = await supabase
      .from("tours")
      .select("id,org_id")
      .eq("id", tourId)
      .maybeSingle()

    const teamId = await ensureCoreTeam(supabase, tourId, parsed.data.team_name)

    const profileByUser = new Map(
      (parsed.data.profiles || []).map((p) => [p.user_id, p]),
    )

    const granted: Array<{ userId: string; memberId: string; role: string }> = []

    for (const userId of parsed.data.user_ids) {
      const profile = profileByUser.get(userId)
      const displayName = profile?.name || "Tour admin"
      const email = profile?.email || null

      const { data: existing } = await supabase
        .from("tour_team_members")
        .select("id,role")
        .eq("tour_id", tourId)
        .eq("user_id", userId)
        .maybeSingle()

      const row = {
        tour_id: tourId,
        team_id: teamId,
        user_id: userId,
        role: parsed.data.role,
        name: displayName,
        email,
        contact_email: email,
        status: "confirmed",
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        await supabase.from("tour_team_members").update(row).eq("id", existing.id)
        granted.push({ userId, memberId: existing.id, role: parsed.data.role })
        continue
      }

      const { data: inserted, error } = await supabase
        .from("tour_team_members")
        .insert(row)
        .select("id")
        .single()

      if (error) throw new Error(error.message)
      granted.push({ userId, memberId: inserted.id, role: parsed.data.role })
    }

    let orgGrants = 0
    const orgId = tourRow?.org_id as string | undefined
    if (parsed.data.grant_org_membership && orgId) {
      for (const userId of parsed.data.user_ids) {
        const { data: existing } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("org_id", orgId)
          .eq("user_id", userId)
          .maybeSingle()
        if (existing) continue

        const { error } = await supabase.from("org_members").insert({
          org_id: orgId,
          user_id: userId,
          role: parsed.data.org_role,
          invited_by: user.id,
        })
        if (!error) orgGrants += 1
      }
    }

    return NextResponse.json({
      success: true,
      teamId,
      granted,
      orgGrants,
    })
  } catch (error: unknown) {
    const { status, message } = adminAccessErrorResponse(
      error,
      "Failed to grant tour admins",
      400,
    )
    return NextResponse.json({ error: message }, { status })
  }
})
