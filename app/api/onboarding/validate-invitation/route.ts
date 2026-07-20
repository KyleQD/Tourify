import { NextRequest, NextResponse } from "next/server"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { buildTokenOnboardingPayload } from "@/lib/services/token-onboarding-payload.service"

export const dynamic = "force-dynamic"

/**
 * Thin alias over the canonical hire-token onboarding payload.
 * Prefer /onboarding/hire/[token] + GET /api/onboarding/[token] for new flows.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim()
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid invitation token" }, { status: 400 })
    }

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({ supabase, token })

    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      template: {
        id: payload.template.id,
        name: payload.template.name,
        fields: payload.template.fields.map((field) => ({
          id: field.name,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options,
        })),
      },
      candidate: payload.candidate,
      employer: payload.employer,
    })
  } catch (error) {
    console.error("validate-invitation error:", error)
    return NextResponse.json({ error: "Failed to validate invitation" }, { status: 500 })
  }
}
