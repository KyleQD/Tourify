"use server"

/**
 * Console v2 server actions — the browser-facing surface of the governed
 * editorial pipeline. Each action resolves the acting user from the session
 * (never from the request body), runs the World permission check under that
 * session, and delegates to lib/world/editorial/server-actions.ts.
 */
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { hasWorldPermission } from "@/lib/world/console/db"
import {
  applyCandidateAction,
  applyClaimEdit,
  applyRadioRightsUpdate,
  EditorialMutationError,
  type MutationOutcome,
} from "@/lib/world/editorial/server-actions"

async function consoleContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new EditorialMutationError("permission_denied", "Sign in required.")
  const trusted = (await getTrustedMusicWriteClient(supabase)) as never
  return { trusted, actorId: user.id }
}

export async function candidateAction(formData: FormData): Promise<MutationOutcome> {
  const { trusted, actorId } = await consoleContext()
  const outcome = await applyCandidateAction(trusted, {
    actorId,
    candidateId: String(formData.get("candidateId") ?? ""),
    expectedVersion: Number(formData.get("version")) || null,
    permissionCheck: hasWorldPermission,
    input: {
      action: String(formData.get("action") ?? "") as never,
      reason: String(formData.get("reason") ?? ""),
      targetMatchId: (formData.get("targetMatchId") as string) || null,
      assigneeId: (formData.get("assigneeId") as string) || null,
    },
  })
  if (outcome.ok) revalidatePath("/internal/world/console/inbox")
  return outcome
}

export async function radioRightsAction(formData: FormData): Promise<MutationOutcome> {
  const { trusted, actorId } = await consoleContext()
  const outcome = await applyRadioRightsUpdate(trusted, {
    actorId,
    stationId: String(formData.get("stationId") ?? ""),
    expectedVersion: Number(formData.get("version")) || null,
    rightsStatus: String(formData.get("rightsStatus") ?? "metadata_only") as never,
    reason: String(formData.get("reason") ?? ""),
    permissionCheck: hasWorldPermission,
  })
  if (outcome.ok) revalidatePath("/internal/world/console/radio")
  return outcome
}

export async function claimEditAction(formData: FormData): Promise<MutationOutcome> {
  const { trusted, actorId } = await consoleContext()
  const confidenceRaw = formData.get("confidence")
  const outcome = await applyClaimEdit(trusted, {
    actorId,
    claimId: String(formData.get("claimId") ?? ""),
    expectedVersion: Number(formData.get("version")) || null,
    validFrom: ((formData.get("validFrom") as string) || "").trim() || undefined,
    validUntil: formData.get("validUntil") ? String(formData.get("validUntil")) : undefined,
    confidence:
      typeof confidenceRaw === "string" && confidenceRaw !== ""
        ? Number(confidenceRaw)
        : undefined,
    reason: String(formData.get("reason") ?? ""),
    permissionCheck: hasWorldPermission,
  })
  if (outcome.ok) revalidatePath("/internal/world/console/claims")
  return outcome
}
