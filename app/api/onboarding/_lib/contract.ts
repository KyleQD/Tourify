import { z } from "zod"

export const onboardingFlowTypeSchema = z.enum(["artist", "venue", "staff", "invitation"])

const onboardingTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("invitation"), token: z.string().trim().min(8) }),
  z.object({ kind: z.literal("candidate"), id: z.string().uuid() }),
  z.object({ kind: z.literal("flow"), id: z.string().uuid() }),
])

const onboardingDocumentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  type: z.string().min(1),
})

/**
 * Canonical request sent to the onboarding submit implementation.
 *
 * The optional legacy fields are accepted only at the boundary so existing
 * onboarding pages can migrate independently. Internal handlers use `target`.
 */
export const onboardingSubmissionSchema = z.object({
  target: onboardingTargetSchema,
  responses: z.record(z.unknown()),
  completed: z.boolean().default(true),
  template_id: z.string().optional(),
  documents: z.array(onboardingDocumentSchema).optional(),
})

export type OnboardingSubmission = z.infer<typeof onboardingSubmissionSchema>
export type OnboardingTarget = OnboardingSubmission["target"]

const legacySubmissionSchema = z.object({
  target: onboardingTargetSchema.optional(),
  token: z.string().trim().min(8).optional(),
  invitation_token: z.string().trim().min(8).optional(),
  candidate_id: z.string().uuid().optional(),
  flow_id: z.string().uuid().optional(),
  id: z.string().uuid().optional(),
  responses: z.record(z.unknown()),
  completed: z.boolean().default(true),
  template_id: z.string().optional(),
  documents: z.array(onboardingDocumentSchema).optional(),
})

type SubmissionDefaults = {
  target?: OnboardingTarget
}

/**
 * Normalize all supported onboarding POST shapes to the one public contract.
 * A route may provide a target default when it is encoded in the URL or action.
 */
export function parseOnboardingSubmission(
  input: unknown,
  defaults: SubmissionDefaults = {},
): OnboardingSubmission {
  const parsed = legacySubmissionSchema.parse(input)
  const target =
    parsed.target ??
    defaults.target ??
    (parsed.token || parsed.invitation_token
      ? { kind: "invitation" as const, token: parsed.token || parsed.invitation_token! }
      : parsed.candidate_id
        ? { kind: "candidate" as const, id: parsed.candidate_id }
        : parsed.flow_id || parsed.id
          ? { kind: "flow" as const, id: parsed.flow_id || parsed.id! }
          : undefined)

  if (!target) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["target"],
        message: "An onboarding target is required",
      },
    ])
  }

  return onboardingSubmissionSchema.parse({
    target,
    responses: parsed.responses,
    completed: parsed.completed,
    template_id: parsed.template_id,
    documents: parsed.documents,
  })
}

export function onboardingErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      error: "Validation failed",
      details: error.flatten(),
    }
  }

  return { error: "Failed to submit onboarding" }
}
