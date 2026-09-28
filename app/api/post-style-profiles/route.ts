import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveActingContext } from "@/lib/auth/acting-context"
import {
  listStyleProfiles,
  createStyleProfile,
} from "@/lib/post-style-profiles/profiles.service"
import { sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize"
import { getTemplateById } from "@/lib/appearance/template-registry"

export async function GET(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx
  const ownerId = profileId ?? userId

  try {
    const profiles = await listStyleProfiles(supabase, accountType, ownerId)
    return NextResponse.json({ profiles })
  } catch {
    return NextResponse.json({ error: "Failed to load style profiles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx
  const ownerId = profileId ?? userId

  const body = await request.json()
  const { name, templateId, configuration, setAsDefault, schemaVersion } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 })
  }

  const template = getTemplateById(templateId)
  if (!template || template.lifecycle !== "active" || !template.premiere) {
    return NextResponse.json({ error: "Unknown or inactive template" }, { status: 400 })
  }

  if (schemaVersion !== undefined && schemaVersion !== 3) {
    return NextResponse.json({ error: "Premiere styles require schemaVersion 3" }, { status: 400 })
  }

  let sanitized
  try {
    sanitized = sanitizePostStyleConfiguration(configuration ?? {}, templateId)
  } catch {
    return NextResponse.json({ error: "Invalid style configuration" }, { status: 400 })
  }

  try {
    const profile = await createStyleProfile(supabase, {
      ownerType: accountType,
      ownerId,
      name,
      templateId,
      configuration: sanitized as unknown as Record<string, unknown>,
      schemaVersion: 3,
      templateVersion: template.version,
      setAsDefault: Boolean(setAsDefault),
      createdBy: userId,
    })
    return NextResponse.json({ profile }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create style profile" }, { status: 500 })
  }
}
