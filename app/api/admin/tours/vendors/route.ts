import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { buildTourVendorWrite, presentTourVendor, tourVendorInputSchema } from "@/lib/admin/tour-collaboration"
import { withAdminCapability } from "@/lib/auth/api-auth"

const idSchema = z.string().uuid()

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

async function loadVendor(supabase: any, id: string) {
  const { data, error } = await supabase.from("tour_vendors").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Record<string, unknown> | null
}

export const GET = withAdminCapability("vendor.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const tourId = idSchema.parse(new URL(request.url).searchParams.get("tour_id"))
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const { data, error } = await supabase
      .from("tour_vendors")
      .select("*")
      .eq("tour_id", tourId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: (data ?? []).map((row: Record<string, unknown>) => presentTourVendor(row)) })
  } catch (error) {
    return errorResponse(error, "Failed to load tour vendors")
  }
})

export const POST = withAdminCapability("vendor.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const input = tourVendorInputSchema.parse(await request.json())
    await assertAdminTourAccess({ supabase, userId: user.id, tourId: input.tour_id, orgId: admin.orgId })

    const { data, error } = await supabase
      .from("tour_vendors")
      .insert(buildTourVendorWrite(input, user.id))
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: presentTourVendor(data) }, { status: 201 })
  } catch (error) {
    return errorResponse(error, "Failed to add tour vendor")
  }
})

export const PATCH = withAdminCapability("vendor.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json()
    const id = idSchema.parse(body.id)
    const existing = await loadVendor(supabase, id)
    if (!existing) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const current = presentTourVendor(existing)
    const input = tourVendorInputSchema.parse({ ...current, ...body, tour_id: tourId })
    const write = buildTourVendorWrite(input, String(existing.created_by || user.id))
    const { data, error } = await supabase
      .from("tour_vendors")
      .update({ ...write, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tour_id", tourId)
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: presentTourVendor(data) })
  } catch (error) {
    return errorResponse(error, "Failed to update tour vendor")
  }
})

export const DELETE = withAdminCapability("vendor.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const id = idSchema.parse(url.searchParams.get("id"))
    const suppliedTourId = url.searchParams.get("tour_id")
    const existing = await loadVendor(supabase, id)
    if (!existing) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    const tourId = idSchema.parse(existing.tour_id)
    if (suppliedTourId && suppliedTourId !== tourId) {
      return NextResponse.json({ error: "Vendor does not belong to the supplied tour" }, { status: 409 })
    }
    await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId })

    const { error } = await supabase.from("tour_vendors").delete().eq("id", id).eq("tour_id", tourId)
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, "Failed to remove tour vendor")
  }
})
