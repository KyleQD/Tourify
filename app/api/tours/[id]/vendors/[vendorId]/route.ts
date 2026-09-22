import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Legacy vendor-by-id → canonical tour access. */

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  status: z.enum(["confirmed", "pending", "declined"]).optional(),
  services: z.array(z.string()).optional(),
  contract_amount: z.number().min(0).optional(),
  payment_status: z.enum(["paid", "partial", "pending"]).optional(),
  notes: z.string().optional(),
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.errors },
      { status: 400 },
    )
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> },
) {
  const { id, vendorId } = await params
  return withAdminCapability("vendor.view", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data: vendor, error: vendorError } = await supabase
        .from("tour_vendors")
        .select("*")
        .eq("id", vendorId)
        .eq("tour_id", id)
        .maybeSingle()

      if (vendorError) throw new Error(vendorError.message)
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

      return NextResponse.json({ success: true, vendor })
    } catch (error) {
      return routeError(error, "Failed to fetch vendor")
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> },
) {
  const { id, vendorId } = await params
  return withAdminCapability("vendor.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const validatedData = updateVendorSchema.parse(await request.json())
      const { data: updated, error: updateError } = await supabase
        .from("tour_vendors")
        .update({ ...validatedData, updated_at: new Date().toISOString() })
        .eq("id", vendorId)
        .eq("tour_id", id)
        .select()
        .maybeSingle()

      if (updateError) throw new Error(updateError.message)
      if (!updated) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

      return NextResponse.json({ success: true, vendor: updated })
    } catch (error) {
      return routeError(error, "Failed to update vendor")
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vendorId: string }> },
) {
  const { id, vendorId } = await params
  return withAdminCapability("vendor.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data, error: deleteError } = await supabase
        .from("tour_vendors")
        .delete()
        .eq("id", vendorId)
        .eq("tour_id", id)
        .select("id")
        .maybeSingle()

      if (deleteError) throw new Error(deleteError.message)
      if (!data) return NextResponse.json({ error: "Vendor not found" }, { status: 404 })

      return NextResponse.json({ success: true, message: "Vendor deleted successfully" })
    } catch (error) {
      return routeError(error, "Failed to delete vendor")
    }
  })(request)
}
