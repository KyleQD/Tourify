import { beforeEach, describe, expect, it, vi } from "vitest"

import { HiringCandidateWorkflowService } from "@/lib/services/hiring-candidate-workflow.service"
import { createHiringServiceClient } from "@/lib/supabase/hiring-service-client"
import { canManageHiring } from "@/lib/auth/hiring-permissions"
import type { HiringEntity } from "@/types/hiring-entity"

vi.mock("@/lib/supabase/hiring-service-client", () => ({
  createHiringServiceClient: vi.fn(),
}))

vi.mock("@/lib/auth/hiring-permissions", () => ({
  canManageHiring: vi.fn(async () => ({ ok: true, data: { allowed: true } })),
}))

type TableRows = Record<string, Array<Record<string, unknown>>>

// Minimal chainable/thenable Supabase stub: select/eq/in/order all return the same
// builder, and awaiting it resolves the rows configured for that table. This mirrors
// how the two-phase fetch reads candidates then hydrates related tables by key.
function createListSupabaseMock(tables: TableRows) {
  function makeBuilder(table: string) {
    const result = { data: tables[table] ?? [], error: null }
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    }
    return builder
  }

  return { from: (table: string) => makeBuilder(table) }
}

const employer: HiringEntity = { entityType: "organization", entityId: "org_1", displayName: "Neon Room" }

describe("HiringCandidateWorkflowService.listCandidates", () => {
  beforeEach(() => {
    vi.mocked(canManageHiring).mockResolvedValue({ ok: true, data: { allowed: true } } as never)
  })

  it("links candidates to job applications via job_application_id (no embed join)", async () => {
    const supabase = createListSupabaseMock({
      staff_onboarding_candidates: [
        {
          id: "cand_1",
          user_id: "user_1",
          job_application_id: "app_1",
          job_posting_id: "job_1",
          template_id: "tpl_1",
          name: "Casey Crew",
          email: "casey@example.com",
          status: "pending",
          stage: "invitation",
          employer_entity_type: "organization",
          employer_entity_id: "org_1",
          created_at: "2026-06-30T00:00:00.000Z",
        },
      ],
      job_applications: [
        { id: "app_1", status: "approved", rating: 5, created_at: "2026-06-29T00:00:00.000Z", form_responses: {} },
      ],
      job_posting_templates: [
        { id: "job_1", title: "Bartender", department: "Bar", position: "Bartender", location: "Main", employment_type: "contractor" },
      ],
      staff_onboarding_templates: [
        { id: "tpl_1", name: "New Staff", description: "Default", required_documents: ["Government ID"] },
      ],
      staff_documents: [],
      onboarding_workflows: [],
      staff_members: [],
      employment_assignments: [],
    })

    vi.mocked(createHiringServiceClient).mockReturnValue(supabase as never)

    const result = await HiringCandidateWorkflowService.listCandidates({ actorUserId: "admin_1", employer })

    expect(result.error).toBeUndefined()
    expect(result.data).toHaveLength(1)

    const candidate = result.data![0]
    expect(candidate.applicationId).toBe("app_1")
    expect(candidate.application?.status).toBe("approved")
    expect(candidate.job?.title).toBe("Bartender")
    expect(candidate.template?.name).toBe("New Staff")
  })

  it("returns an empty list without hydrating related tables", async () => {
    const supabase = createListSupabaseMock({ staff_onboarding_candidates: [] })
    vi.mocked(createHiringServiceClient).mockReturnValue(supabase as never)

    const result = await HiringCandidateWorkflowService.listCandidates({ actorUserId: "admin_1", employer })

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual([])
  })

  it("maps approved documents to verified and surfaces onboarding answers", async () => {
    const supabase = createListSupabaseMock({
      staff_onboarding_candidates: [
        {
          id: "cand_2",
          user_id: "user_2",
          name: "Alex Stage",
          email: "alex@example.com",
          status: "submitted",
          stage: "review",
          onboarding_progress: 100,
          onboarding_responses: { legal_name: "Alex Stage", date_of_birth: "1994-04-12" },
          employer_entity_type: "organization",
          employer_entity_id: "org_1",
          created_at: "2026-06-30T00:00:00.000Z",
        },
      ],
      job_applications: [],
      job_posting_templates: [],
      staff_onboarding_templates: [],
      staff_documents: [
        {
          id: "doc_1",
          candidate_id: "cand_2",
          label: "Government ID",
          document_type: "id",
          file_name: "id.pdf",
          status: "approved",
          required: true,
        },
      ],
      onboarding_workflows: [],
      staff_members: [],
      employment_assignments: [],
    })

    vi.mocked(createHiringServiceClient).mockReturnValue(supabase as never)

    const result = await HiringCandidateWorkflowService.listCandidates({ actorUserId: "admin_1", employer })
    const candidate = result.data![0]

    expect(candidate.onboardingResponses).toEqual({ legal_name: "Alex Stage", date_of_birth: "1994-04-12" })
    expect(candidate.documents?.[0]?.status).toBe("verified")
  })
})
