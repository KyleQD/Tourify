import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'

// Validation schemas
const onboardingFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "textarea", "email", "phone", "date", "select", "multiselect", "file", "checkbox"]),
  label: z.string().min(1, "Label is required"),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  description: z.string().optional()
})

const updateTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  fields: z.array(onboardingFieldSchema).min(1, "At least one field is required"),
  isDefault: z.boolean().optional().default(false)
})

export async function GET(
  req: Request,
  { params }: any
) {
  try {
    const { data: template, error } = await supabase
      .from("onboarding_templates")
      .select("*")
      .eq("id", params.id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error fetching onboarding template:", error)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    const body = await req.json()
    const validatedData = updateTemplateSchema.parse(body)

    // If this template is set as default, unset other defaults
    if (validatedData.isDefault) {
      await supabase
        .from("onboarding_templates")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", params.id)
    }

    const { data: template, error } = await supabase
      .from("onboarding_templates")
      .update({
        name: validatedData.name,
        description: validatedData.description,
        fields: validatedData.fields,
        is_default: validatedData.isDefault,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error updating onboarding template:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    // Check if template exists and if it's the default
    const { data: existingTemplate, error: fetchError } = await supabase
      .from("onboarding_templates")
      .select("is_default")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Don't allow deleting the default template if it's the only one
    if (existingTemplate.is_default) {
      const { data: templateCount, error: countError } = await supabase
        .from("onboarding_templates")
        .select("id", { count: "exact" })

      if (countError) throw countError

      if (templateCount.length === 1) {
        return NextResponse.json(
          { error: "Cannot delete the only template" },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from("onboarding_templates")
      .delete()
      .eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting onboarding template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
} 