import { beforeEach, describe, expect, it, vi } from "vitest"

const assertCanManageHiring = vi.fn(async () => ({ ok: true as const, data: true }))
const upsertRosterFromCompletedOnboarding = vi.fn()
const sendRosterAddedNotification = vi.fn(async () => ({ sent: true }))
const sendOnboardingChangesRequestedNotification = vi.fn(async () => ({ sent: true }))
const resolveHiringEntityDisplayName = vi.fn(async () => "DreamStream")

vi.mock("@/lib/auth/hiring-permissions", () => ({
  assertCanManageHiring: (...args: Parameters<typeof assertCanManageHiring>) => assertCanManageHiring(...args),
}))

vi.mock("@/lib/services/hiring-roster.service", () => ({
  HiringRosterService: class {
    upsertRosterFromCompletedOnboarding = (...args: Parameters<typeof upsertRosterFromCompletedOnboarding>) =>
      upsertRosterFromCompletedOnboarding(...args)
    upsertRosterFromApproval = vi.fn()
  },
}))

vi.mock("@/lib/rebuild/hiring-roster-notify", () => ({
  sendRosterAddedNotification: (...args: Parameters<typeof sendRosterAddedNotification>) =>
    sendRosterAddedNotification(...args),
}))

vi.mock("@/lib/rebuild/hiring-onboarding-changes-notify", () => ({
  sendOnboardingChangesRequestedNotification: (
    ...args: Parameters<typeof sendOnboardingChangesRequestedNotification>
  ) => sendOnboardingChangesRequestedNotification(...args),
}))

vi.mock("@/lib/auth/hiring-entity-resolver", () => ({
  resolveHiringEntityDisplayName: (...args: Parameters<typeof resolveHiringEntityDisplayName>) =>
    resolveHiringEntityDisplayName(...args),
}))

vi.mock("@/lib/services/worker-onboarding-profile.service", () => ({
  WorkerOnboardingProfileService: {
    upsertFromResponses: vi.fn(),
  },
}))

vi.mock("@/lib/services/onboarding-template-resolver.service", () => ({
  resolveOnboardingTemplate: vi.fn(),
}))

vi.mock("@/lib/services/hiring-onboarding-templates.service", () => ({
  getTemplateById: vi.fn(),
}))

import { HiringOnboardingService } from "@/lib/services/hiring-onboarding.service"

function createChainableQuery(finalResult: { data: unknown; error: unknown }) {
  const query: Record<string, unknown> = {}
  query.select = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.insert = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.maybeSingle = vi.fn(async () => finalResult)
  query.single = vi.fn(async () => finalResult)
  query.then = undefined
  return query
}

function createMockSupabase(args: {
  lookup: Record<string, unknown>
  update?: Record<string, unknown>
  documents?: Array<Record<string, unknown>>
  invitation?: Record<string, unknown> | null
}) {
  const lookupResult = { data: args.lookup, error: null }
  const updateResult = {
    data: args.update ?? {
      ...args.lookup,
      status: "completed",
      stage: "approved",
      compliance_status: "approved",
      onboarding_progress: 100,
    },
    error: null,
  }
  const documents = args.documents ?? []
  const invitation = args.invitation ?? {
    id: "inv_1",
    token: "token_abc",
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "staff_onboarding_candidates") {
        return {
          select: vi.fn(() => createChainableQuery(lookupResult)),
          update: vi.fn(() => createChainableQuery(updateResult)),
        }
      }

      if (table === "staff_documents") {
        const docsQuery: Record<string, unknown> = {}
        docsQuery.select = vi.fn(() => docsQuery)
        docsQuery.eq = vi.fn(() => docsQuery)
        docsQuery.update = vi.fn(() => docsQuery)
        docsQuery.in = vi.fn(async () => ({ data: null, error: null }))
        // list documents resolves as thenable / awaited chain ending without single
        docsQuery.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve(resolve({ data: documents, error: null }))
        return docsQuery
      }

      if (table === "staff_invitations") {
        return {
          select: vi.fn(() => createChainableQuery({ data: invitation, error: null })),
          update: vi.fn(() => createChainableQuery({ data: invitation, error: null })),
        }
      }

      if (table === "onboarding_responses") {
        return {
          update: vi.fn(() => createChainableQuery({ data: null, error: null })),
        }
      }

      if (table === "hiring_audit_events") {
        return {
          insert: vi.fn(async () => ({ error: null })),
        }
      }

      return createChainableQuery({ data: null, error: null })
    }),
  }
}

describe("HiringOnboardingService.approveOnboardingCandidate", () => {
  const actor = {
    userId: "admin_1",
    employer: {
      entityType: "organization" as const,
      entityId: "org_1",
      displayName: "DreamStream",
    },
  }

  beforeEach(() => {
    assertCanManageHiring.mockClear()
    upsertRosterFromCompletedOnboarding.mockReset()
    sendRosterAddedNotification.mockClear()
    sendOnboardingChangesRequestedNotification.mockClear()
    resolveHiringEntityDisplayName.mockClear()

    upsertRosterFromCompletedOnboarding.mockResolvedValue({
      id: "staff_1",
      userId: "user_worker",
      status: "active",
      complianceStatus: "submitted",
      position: "Growth Specialist",
      department: "Marketing",
    })
  })

  it("approves submitted candidate, finalizes roster, and notifies worker", async () => {
    const candidate = {
      id: "cand_1",
      status: "submitted",
      stage: "review",
      user_id: "user_worker",
      position: "Growth Specialist",
      department: "Marketing",
      job_application_id: "app_1",
      invitation_token: "token_abc",
    }

    const supabase = createMockSupabase({
      lookup: candidate,
      documents: [{ id: "doc_1", status: "uploaded", required: true, label: "ID" }],
    })
    const result = await HiringOnboardingService.approveOnboardingCandidate({
      supabase: supabase as never,
      actor,
      candidateId: "cand_1",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.candidate.status).toBe("completed")
    expect(result.data.candidate.stage).toBe("approved")
    expect(result.data.rosterMember).toMatchObject({ id: "staff_1" })
    expect(result.data.notificationSent).toBe(true)
    expect(upsertRosterFromCompletedOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "cand_1",
        actorUserId: "admin_1",
      })
    )
    expect(sendRosterAddedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        workerUserId: "user_worker",
        candidateId: "cand_1",
        staffMemberId: "staff_1",
        employerName: "DreamStream",
      })
    )
  })

  it("blocks approve when a required document is rejected", async () => {
    const candidate = {
      id: "cand_block",
      status: "submitted",
      stage: "review",
      user_id: "user_worker",
    }

    const supabase = createMockSupabase({
      lookup: candidate,
      documents: [{ id: "doc_bad", status: "rejected", required: true, label: "Passport" }],
    })

    const result = await HiringOnboardingService.approveOnboardingCandidate({
      supabase: supabase as never,
      actor,
      candidateId: "cand_block",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain("required document")
    expect(upsertRosterFromCompletedOnboarding).not.toHaveBeenCalled()
  })

  it("rejects candidates that have not submitted", async () => {
    const candidate = {
      id: "cand_2",
      status: "in_progress",
      stage: "onboarding",
      user_id: "user_worker",
    }

    const supabase = createMockSupabase({ lookup: candidate })
    const result = await HiringOnboardingService.approveOnboardingCandidate({
      supabase: supabase as never,
      actor,
      candidateId: "cand_2",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain("submit")
    expect(upsertRosterFromCompletedOnboarding).not.toHaveBeenCalled()
    expect(sendRosterAddedNotification).not.toHaveBeenCalled()
  })

  it("rejectOnboardingCandidate does not activate roster", async () => {
    const candidate = {
      id: "cand_3",
      status: "submitted",
      stage: "review",
      application_id: null,
      job_application_id: "app_3",
    }

    const supabase = createMockSupabase({
      lookup: candidate,
      update: { ...candidate, status: "rejected", stage: "rejected" },
    })

    const result = await HiringOnboardingService.rejectOnboardingCandidate({
      supabase: supabase as never,
      actor,
      candidateId: "cand_3",
      notes: "Incomplete docs",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.candidate.status).toBe("rejected")
    expect(upsertRosterFromCompletedOnboarding).not.toHaveBeenCalled()
    expect(sendRosterAddedNotification).not.toHaveBeenCalled()
  })

  it("requestOnboardingChanges requires notes", async () => {
    const candidate = {
      id: "cand_4",
      status: "submitted",
      stage: "review",
      user_id: "user_worker",
      invitation_token: "token_abc",
      job_application_id: "app_4",
    }

    const supabase = createMockSupabase({ lookup: candidate })
    const result = await HiringOnboardingService.requestOnboardingChanges({
      supabase: supabase as never,
      actor,
      candidateId: "cand_4",
      notes: "   ",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain("Notes are required")
    expect(sendOnboardingChangesRequestedNotification).not.toHaveBeenCalled()
  })

  it("requestOnboardingChanges sets needs_revision, reopens invite, and notifies worker", async () => {
    const candidate = {
      id: "cand_5",
      status: "submitted",
      stage: "review",
      user_id: "user_worker",
      invitation_token: "token_abc",
      position: "Stagehand",
      job_application_id: "app_5",
    }

    const supabase = createMockSupabase({
      lookup: candidate,
      update: {
        ...candidate,
        status: "needs_revision",
        stage: "onboarding",
        compliance_status: "blocked",
        notes: "Please re-upload your ID front and back.",
      },
    })

    const result = await HiringOnboardingService.requestOnboardingChanges({
      supabase: supabase as never,
      actor,
      candidateId: "cand_5",
      notes: "Please re-upload your ID front and back.",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.candidate.status).toBe("needs_revision")
    expect(result.data.notificationSent).toBe(true)
    expect(upsertRosterFromCompletedOnboarding).not.toHaveBeenCalled()
    expect(sendOnboardingChangesRequestedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        workerUserId: "user_worker",
        candidateId: "cand_5",
        notes: "Please re-upload your ID front and back.",
        employerName: "DreamStream",
      })
    )
  })
})
