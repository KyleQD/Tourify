import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { HiringOnboardingUploadService } from "@/lib/services/hiring-onboarding-upload.service"

function createTokenSupabaseMock({
  invitation,
  invitationError,
  candidateById,
  candidateByToken,
}: {
  invitation?: Record<string, unknown> | null
  invitationError?: { message: string } | null
  candidateById?: Record<string, unknown> | null
  candidateByToken?: Record<string, unknown> | null
}) {
  const invitationMaybeSingle = vi.fn(async () => ({
    data: invitation ?? null,
    error: invitationError ?? null,
  }))
  const invitationEq = vi.fn(() => ({ maybeSingle: invitationMaybeSingle }))
  const invitationSelect = vi.fn(() => ({ eq: invitationEq }))

  const candidateEq = vi.fn((column: string) => ({
    maybeSingle: vi.fn(async () => {
      if (column === "id") return { data: candidateById ?? null, error: null }
      if (column === "invitation_token") return { data: candidateByToken ?? null, error: null }
      return { data: null, error: null }
    }),
  }))
  const candidateSelect = vi.fn(() => ({ eq: candidateEq }))

  const from = vi.fn((table: string) => {
    if (table === "staff_invitations") return { select: invitationSelect }
    if (table === "staff_onboarding_candidates") return { select: candidateSelect }
    throw new Error(`Unexpected table ${table}`)
  })

  return {
    supabase: { from, storage: { from: vi.fn() } },
    invitationEq,
    candidateEq,
  }
}

describe("HiringOnboardingUploadService token resolution", () => {
  it("looks up staff_invitations by token only (not invitation_token)", async () => {
    const { supabase, invitationEq } = createTokenSupabaseMock({
      invitation: {
        id: "inv-1",
        token: "onboarding-token-12345678",
        status: "pending",
        employer_entity_type: "venue",
        employer_entity_id: "00000000-0000-0000-0000-000000000010",
        position_details: { candidate_id: "00000000-0000-0000-0000-000000000020" },
      },
      candidateById: {
        id: "00000000-0000-0000-0000-000000000020",
        employer_entity_type: "venue",
        employer_entity_id: "00000000-0000-0000-0000-000000000010",
        user_id: "00000000-0000-0000-0000-000000000030",
      },
    })

    const service = new HiringOnboardingUploadService({ supabase: supabase as never })
    const result = await (service as unknown as {
      resolveTokenContext: (token: string) => Promise<{ employer?: unknown; candidateId?: string; error?: string }>
    }).resolveTokenContext("onboarding-token-12345678")

    expect(invitationEq).toHaveBeenCalledWith("token", "onboarding-token-12345678")
    expect(invitationEq).not.toHaveBeenCalledWith("invitation_token", expect.anything())
    expect(result.error).toBeUndefined()
    expect(result.candidateId).toBe("00000000-0000-0000-0000-000000000020")
  })

  it("falls back to staff_onboarding_candidates.invitation_token when invitation has no candidate_id", async () => {
    const { supabase, candidateEq } = createTokenSupabaseMock({
      invitation: {
        id: "inv-2",
        token: "onboarding-token-abcdef12",
        status: "pending",
        employer_entity_type: "venue",
        employer_entity_id: "00000000-0000-0000-0000-000000000010",
      },
      candidateById: null,
      candidateByToken: {
        id: "00000000-0000-0000-0000-000000000021",
        employer_entity_type: "venue",
        employer_entity_id: "00000000-0000-0000-0000-000000000010",
        invitation_token: "onboarding-token-abcdef12",
      },
    })

    const service = new HiringOnboardingUploadService({ supabase: supabase as never })
    const result = await (service as unknown as {
      resolveTokenContext: (token: string) => Promise<{ candidateId?: string; error?: string }>
    }).resolveTokenContext("onboarding-token-abcdef12")

    expect(candidateEq).toHaveBeenCalledWith("invitation_token", "onboarding-token-abcdef12")
    expect(result.error).toBeUndefined()
    expect(result.candidateId).toBe("00000000-0000-0000-0000-000000000021")
  })
})
