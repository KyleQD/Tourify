import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest, checkAdminPermissions } from "@/lib/auth/api-auth"
import { serviceRoleClient as supabase } from "@/lib/supabase/service-role"

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  fields: z.array(z.any()).min(1, "At least one field is required").optional(),
  isDefault: z.boolean().optional(),
})

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  return { auth }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await requireAdmin(request)
  if (check.error) return check.error

  try {
    const { data: template, error } = await supabase
      .from("onboarding_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Template not found" }, { status: 404 })
      throw error
    }
    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error fetching onboarding template:", error)
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await requireAdmin(request)
  if (check.error) return check.error

  try {
    const body = await request.json()
    const validatedData = updateTemplateSchema.parse(body)

    if (validatedData.isDefault) {
      await supabase.from("onboarding_templates").update({ is_default: false }).eq("is_default", true).neq("id", id)
    }

    const { data: template, error } = await supabase
      .from("onboarding_templates")
      .update({
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.fields && { fields: validatedData.fields }),
        ...(validatedData.isDefault !== undefined && { is_default: validatedData.isDefault }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Template not found" }, { status: 404 })
      throw error
    }
    return NextResponse.json({ success: true, template })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }
    console.error("Error updating onboarding template:", error)
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const check = await requireAdmin(request)
  if (check.error) return check.error

  try {
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("onboarding_templates")
      .select("is_default")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") return NextResponse.json({ error: "Template not found" }, { status: 404 })
      throw fetchError
    }

    if (existingTemplate?.is_default) {
      const { count } = await supabase.from("onboarding_templates").select("id", { count: "exact", head: true })
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "Cannot delete the only template" }, { status: 400 })
      }
    }

    const { error } = await supabase.from("onboarding_templates").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting onboarding template:", error)
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}
