import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

import {
  adminAccessErrorResponse,
  assertEventAuthority,
  extractIdFromPath,
  requireEventChildAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const documentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  document_type: z
    .enum(["general", "runsheet", "safety", "contact_list", "schedule", "map_notes", "technical", "custom"])
    .default("general"),
  visible_to: z.array(z.enum(["admin", "manager", "staff", "crew", "vendor", "all"])).default(["all"]),
  pinned: z.boolean().default(false),
})

export const GET = withAdminCapability("event.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    await assertEventAuthority({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    const svc = createServiceClient()
    const { data, error } = await svc
      .from("event_documents")
      .select("*")
      .eq("event_id", eventId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          success: true,
          documents: [],
          userRole: "admin",
          _notice: "event_documents table not yet created",
        })
      }
      console.error("[Event Documents] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
    }

    return NextResponse.json({ success: true, documents: data || [], userRole: "admin" })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to load documents")
    return NextResponse.json({ error: message }, { status })
  }
})

export const POST = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    await assertEventAuthority({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
    })

    const body = await request.json()
    const validated = documentSchema.parse(body)
    const svc = createServiceClient()

    const { data, error } = await svc
      .from("event_documents")
      .insert({
        event_id: eventId,
        author_id: user.id,
        title: validated.title,
        content: validated.content,
        document_type: validated.document_type,
        visible_to: validated.visible_to,
        pinned: validated.pinned,
      })
      .select()
      .single()

    if (error) {
      console.error("[Event Documents] Insert error:", error)
      return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
    }

    return NextResponse.json({ success: true, document: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }
    const { status, message } = adminAccessErrorResponse(error, "Failed to create document")
    return NextResponse.json({ error: message }, { status })
  }
})

export const PATCH = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: "Missing document id" }, { status: 400 })

    await requireEventChildAccess({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
      childTable: "event_documents",
      childId: id,
      parentFkColumn: "event_id",
    })

    const allowedFields: Record<string, unknown> = {}
    if (updates.title) allowedFields.title = updates.title
    if (updates.content) allowedFields.content = updates.content
    if (updates.document_type) allowedFields.document_type = updates.document_type
    if (updates.visible_to) allowedFields.visible_to = updates.visible_to
    if (typeof updates.pinned === "boolean") allowedFields.pinned = updates.pinned
    allowedFields.updated_at = new Date().toISOString()

    const svc = createServiceClient()
    const { error } = await svc
      .from("event_documents")
      .update(allowedFields)
      .eq("id", id)
      .eq("event_id", eventId)

    if (error) {
      console.error("[Event Documents] Update error:", error)
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to update document")
    return NextResponse.json({ error: message }, { status })
  }
})

export const DELETE = withAdminCapability("event.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const eventId = extractIdFromPath(request.url, "events")
    if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    if (!admin.orgId) return NextResponse.json({ error: "Organization required" }, { status: 403 })

    const docId = new URL(request.url).searchParams.get("id")
    if (!docId) return NextResponse.json({ error: "Missing document id" }, { status: 400 })

    await requireEventChildAccess({
      supabase,
      userId: user.id,
      eventId,
      orgId: admin.orgId,
      childTable: "event_documents",
      childId: docId,
      parentFkColumn: "event_id",
    })

    const svc = createServiceClient()
    await svc.from("event_documents").delete().eq("id", docId).eq("event_id", eventId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const { status, message } = adminAccessErrorResponse(error, "Failed to delete document")
    return NextResponse.json({ error: message }, { status })
  }
})
