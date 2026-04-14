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

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  fields: z.array(onboardingFieldSchema).min(1, "At least one field is required"),
  isDefault: z.boolean().optional().default(false)
})

const updateTemplateSchema = createTemplateSchema.partial()

export async function GET() {
  try {
    const { data: templates, error } = await supabase
      .from("onboarding_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, templates })
  } catch (error) {
    console.error("Error fetching onboarding templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = createTemplateSchema.parse(body)

    // If this template is set as default, unset other defaults
    if (validatedData.isDefault) {
      await supabase
        .from("onboarding_templates")
        .update({ is_default: false })
        .eq("is_default", true)
    }

    const { data: template, error } = await supabase
      .from("onboarding_templates")
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        fields: validatedData.fields,
        is_default: validatedData.isDefault,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error("Error creating onboarding template:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
} 