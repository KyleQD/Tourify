import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/**
 * VEND-101 — Legacy tour vendors surface → canonical tour access + vendor capability.
 * Prefer /api/admin/tours/vendors for new clients.
 */

const createVendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  type: z.string().min(1, "Vendor type is required"),
  contact_name: z.string().min(1, "Contact name is required"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().optional(),
  status: z.enum(["confirmed", "pending", "declined"]).default("pending"),
  services: z.array(z.string()).default([]),
  contract_amount: z.number().min(0).optional(),
  payment_status: z.enum(["paid", "partial", "pending"]).default("pending"),
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("vendor.view", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data: vendors, error: vendorsError } = await supabase
        .from("tour_vendors")
        .select("*")
        .eq("tour_id", id)
        .order("name", { ascending: true })

      if (vendorsError) throw new Error(vendorsError.message)

      return NextResponse.json({
        success: true,
        vendors: vendors || [],
        message: "Tour vendors fetched successfully",
      })
    } catch (error) {
      return routeError(error, "Failed to fetch vendors")
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("vendor.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const validatedData = createVendorSchema.parse(await request.json())
      const now = new Date().toISOString()
      const { data: vendor, error: vendorError } = await supabase
        .from("tour_vendors")
        .insert({
          ...validatedData,
          tour_id: id,
          user_id: user.id,
          created_by: user.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (vendorError) throw new Error(vendorError.message)

      return NextResponse.json({
        success: true,
        vendor,
        message: "Vendor added successfully to tour",
      }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to create vendor")
    }
  })(request)
}
