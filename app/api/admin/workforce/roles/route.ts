import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminAuth } from "@/lib/auth/api-auth"
import { listRoleTemplatesForOwner } from "@/lib/staff/role-templates"

const querySchema = z.object({
  employer_entity_type: z.enum(["venue", "organization", "artist"]).optional(),
  employer_entity_id: z.string().uuid().optional(),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid workforce role query", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { employer_entity_type, employer_entity_id } = parsed.data
  const owner =
    employer_entity_id &&
    (employer_entity_type === "venue" || employer_entity_type === "organization")
      ? { entityType: employer_entity_type, entityId: employer_entity_id }
      : null

  const roles = await listRoleTemplatesForOwner(supabase, owner)
  return NextResponse.json({ roles, data: roles, total: roles.length })
})
