import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth } from "@/lib/auth/api-auth"
import { resolveHiringActorFromRequest } from "@/lib/api/hiring-route-helpers"
import { presentTemplateListItem } from "@/lib/hiring/api-presenters"
import { ROLE_PACKS, resolveRolePackTemplate } from "@/lib/hiring/role-packs"
import { createTemplateForEmployer, listTemplatesForEmployer } from "@/lib/services/hiring-onboarding-templates.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"

export async function GET(request: NextRequest) {
  return withAdminAuth(async () => {
    return NextResponse.json({
      ok: true,
      data: ROLE_PACKS.map((pack) => ({
        id: pack.id,
        label: pack.label,
        description: pack.description,
      })),
    })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const packIds: string[] = Array.isArray(body?.pack_ids)
      ? body.pack_ids.filter((id: unknown): id is string => typeof id === "string")
      : typeof body?.pack_id === "string"
        ? [body.pack_id]
        : ROLE_PACKS.map((pack) => pack.id)

    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request: req, supabase, body })
    if (!actorResult.ok) {
      return NextResponse.json({ ok: false, error: { message: actorResult.error.message } }, { status: 403 })
    }

    const existing = await listTemplatesForEmployer({
      supabase,
      employer: actorResult.data.employer,
    })
    const existingNames = new Set(
      (existing.data ?? [])
        .filter((row) => row.scope === "employer")
        .map((row) => String(row.name ?? "").toLowerCase())
    )

    const created = []
    for (const packId of packIds) {
      const source = resolveRolePackTemplate(packId)
      if (!source) continue

      if (existingNames.has(source.name.toLowerCase())) continue

      const { data, error } = await createTemplateForEmployer({
        supabase,
        employer: actorResult.data.employer,
        actorUserId: actorResult.data.userId,
        input: {
          name: source.name,
          description: source.description,
          department: source.department,
          position: source.position,
          employmentType: source.employment_type,
          fields: source.fields,
          estimatedDays: source.estimated_days,
          requiredDocuments: source.required_documents ?? [],
          tags: [...(source.tags ?? []), "role-pack", packId],
          isDefault: Boolean(source.is_default),
        },
      })

      if (error || !data) continue
      existingNames.add(String(data.name ?? "").toLowerCase())
      created.push(presentTemplateListItem({ ...data, scope: "employer" }))
    }

    return NextResponse.json({ ok: true, data: created })
  })(request)
}
