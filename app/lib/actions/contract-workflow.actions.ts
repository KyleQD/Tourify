"use server"

import { z } from "zod"
import { createSafeActionClient } from "next-safe-action"
import { createClient } from "@/lib/supabase/server"
import {
  sendContractCompletionEmails,
  sendContractInviteEmail,
} from "@/lib/services/contract-email.service"

const action = createSafeActionClient()

export const resolveCounterpartyAction = action
  .schema(z.object({ username: z.string().min(1).max(80) }))
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: "Not authenticated" }

    const { data: profileId, error } = await supabase.rpc("lookup_profile_id_by_username", {
      p_username: parsedInput.username.trim(),
    })
    if (error) return { success: false as const, error: error.message }
    if (!profileId) return { success: false as const, error: "No user found with that username" }
    if (profileId === user.id) return { success: false as const, error: "You cannot send a contract to yourself" }

    const { data: prof } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", profileId)
      .maybeSingle()

    return {
      success: true as const,
      data: {
        userId: profileId as string,
        username: prof?.username ?? null,
        displayName: prof?.full_name ?? null,
      },
    }
  })

export const sendContractAction = action
  .schema(z.object({ contractId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: "Not authenticated" }

    const { error } = await supabase.rpc("send_artist_contract", { p_contract_id: parsedInput.contractId })
    if (error) return { success: false as const, error: error.message }

    const emailResult = await sendContractInviteEmail({ contractId: parsedInput.contractId })
    if (!emailResult.ok) console.warn("[sendContractAction] invite email:", emailResult.error)

    if (emailResult.ok) {
      const { data: row } = await supabase
        .from("artist_contracts")
        .select("metadata")
        .eq("id", parsedInput.contractId)
        .eq("user_id", user.id)
        .maybeSingle()

      const prev = (row?.metadata || {}) as Record<string, unknown>
      const contractEmails = {
        ...((prev.contract_emails as object) || {}),
        invite_sent_at: new Date().toISOString(),
      }
      await supabase
        .from("artist_contracts")
        .update({
          metadata: { ...prev, contract_emails: contractEmails },
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsedInput.contractId)
        .eq("user_id", user.id)
    }

    return { success: true as const, emailSent: emailResult.ok as boolean }
  })

export const signContractAction = action
  .schema(
    z.object({
      contractId: z.string().uuid(),
      signerRole: z.enum(["owner", "counterparty"]),
      legalName: z.string().min(2).max(200),
    })
  )
  .action(async ({ parsedInput }) => {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: "Not authenticated" }

    const { error } = await supabase.rpc("sign_artist_contract", {
      p_contract_id: parsedInput.contractId,
      p_signer_role: parsedInput.signerRole,
      p_legal_name: parsedInput.legalName.trim(),
    })
    if (error) return { success: false as const, error: error.message }

    const { data: updated } = await supabase
      .from("artist_contracts")
      .select("status")
      .eq("id", parsedInput.contractId)
      .maybeSingle()

    if (updated?.status === "signed") {
      const done = await sendContractCompletionEmails({ contractId: parsedInput.contractId })
      if (!done.ok) console.warn("[signContractAction] completion email:", done.error)
    }

    return { success: true as const }
  })
