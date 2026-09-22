import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { UnifiedOnboardingService } from "@/lib/services/unified-onboarding.service"
import type { Database } from "@/lib/database.types"
import type { OnboardingSubmission } from "./contract"

export async function submitFlowOnboardingRequest({
  submission,
  userId,
  supabase,
}: {
  submission: OnboardingSubmission
  userId: string
  supabase: SupabaseClient<Database>
}) {
  if (submission.target.kind !== "flow") {
    throw new Error("Flow target required for flow onboarding")
  }

  const existingFlow = await UnifiedOnboardingService.getUserOnboardingFlowById(
    userId,
    submission.target.id,
    supabase,
  )

  if (!existingFlow) {
    return NextResponse.json({ error: "Flow not found or access denied" }, { status: 404 })
  }

  const flow = submission.completed
    ? await UnifiedOnboardingService.completeOnboardingFlow(
        submission.target.id,
        submission.responses,
        supabase,
        userId,
      )
    : await UnifiedOnboardingService.updateOnboardingFlow(
        {
          id: submission.target.id,
          responses: submission.responses,
          status: "in_progress",
        },
        supabase,
        userId,
      )

  if (!flow) {
    return NextResponse.json({ error: "Failed to submit onboarding flow" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: flow })
}
