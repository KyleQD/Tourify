import { NextRequest, NextResponse } from "next/server"

import { EnhancedOnboardingService } from "@/lib/services/enhanced-onboarding.service"
import { createClient } from "@/lib/supabase/server"
import { onboardingErrorResponse, parseOnboardingSubmission } from "../_lib/contract"
import { submitFlowOnboardingRequest } from "../_lib/flow-submit"
import { submitTokenOnboardingRequest } from "../_lib/token-submit"

/**
 * Canonical onboarding submission endpoint.
 *
 * `target` is the stable contract. Legacy `invitation_token`, `candidate_id`,
 * and `flow_id` aliases are normalized at the boundary so each onboarding
 * surface can migrate without maintaining separate submit logic.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const submission = parseOnboardingSubmission(await request.json())

    if (submission.target.kind === "invitation") {
      return submitTokenOnboardingRequest({
        submission,
        completedByUserId: user.id,
      })
    }

    if (submission.target.kind === "candidate") {
      const result = await EnhancedOnboardingService.submitOnboardingResponses({
        candidate_id: submission.target.id,
        responses: submission.responses,
        documents: submission.documents,
      })

      return NextResponse.json(result)
    }

    return submitFlowOnboardingRequest({ submission, userId: user.id, supabase })
  } catch (error) {
    console.error("Error submitting onboarding responses:", error)
    const response = onboardingErrorResponse(error)
    return NextResponse.json(response, { status: response.details ? 400 : 500 })
  }
}
