import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { buildTokenOnboardingPayload } from "@/lib/services/token-onboarding-payload.service"
import { parseOnboardingSubmission } from "../_lib/contract"
import { submitTokenOnboardingRequest } from "../_lib/token-submit"

const routeParamsSchema = z.object({
  token: z.string().min(8, "Invalid onboarding token"),
})

function getReadableError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unexpected onboarding error"
}

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = routeParamsSchema.safeParse(await context.params)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    // Session user gates vault decrypt for sensitive prefill — never decrypt for anonymous/mismatched users.
    const authClient = await createClient()
    const {
      data: { user: sessionUser },
    } = await authClient.auth.getUser()

    const supabase = createHiringServiceClient()
    const payload = await buildTokenOnboardingPayload({
      supabase,
      token: params.data.token,
      sessionUserId: sessionUser?.id ?? null,
    })

    if (!payload) {
      return NextResponse.json({ error: "Onboarding invitation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error("Error fetching onboarding data:", error)
    return NextResponse.json({ error: getReadableError(error) }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = routeParamsSchema.safeParse(await context.params)

    if (!params.success) {
      return NextResponse.json({ error: "Invalid onboarding token" }, { status: 400 })
    }

    const submission = parseOnboardingSubmission(await request.json(), {
      target: { kind: "invitation", token: params.data.token },
    })

    return submitTokenOnboardingRequest({ submission })
  } catch (error) {
    console.error("Error processing onboarding:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to process onboarding" }, { status: 500 })
  }
}
