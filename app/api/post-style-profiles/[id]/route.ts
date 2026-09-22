import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { resolveActingContext } from "@/lib/auth/acting-context"
import {
  updateStyleProfile,
  archiveStyleProfile,
} from "@/lib/post-style-profiles/profiles.service"
import { sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize"
import { getTemplateById } from "@/lib/appearance/template-registry"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx
  const ownerId = profileId ?? userId
  const { id } = await params
  const body = await request.json()
  const { name, templateId, configuration, setAsDefault, schemaVersion } = body

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const template = templateId ? getTemplateById(templateId) : null
  if (!templateId || !template || template.lifecycle !== "active" || !template.premiere) {
    return NextResponse.json({ error: "Unknown, inactive, or legacy template" }, { status: 400 })
  }
  if (schemaVersion !== undefined && schemaVersion !== 3) {
    return NextResponse.json({ error: "Premiere styles require schemaVersion 3" }, { status: 400 })
  }

  let sanitized
  try {
    sanitized = configuration
      ? sanitizePostStyleConfiguration(configuration, templateId)
      : undefined
  } catch {
    return NextResponse.json({ error: "Invalid style configuration" }, { status: 400 })
  }

  try {
    const profile = await updateStyleProfile(supabase, id, userId, accountType, ownerId, {
      name,
      templateId,
      configuration: sanitized as unknown as Record<string, unknown> | undefined,
      setAsDefault,
      templateVersion: template.version,
      schemaVersion: 3,
    })
    return NextResponse.json({ profile })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update"
    const status =
      msg.includes("unauthorized") || msg.includes("not found") ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { userId, accountType, profileId, supabase } = ctx
  const ownerId = profileId ?? userId
  const { id } = await params

  try {
    await archiveStyleProfile(supabase, id, userId, accountType, ownerId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to archive profile" }, { status: 500 })
  }
}
