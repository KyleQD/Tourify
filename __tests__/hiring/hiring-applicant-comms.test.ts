import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Minimal chainable Supabase stub. Each table maps to a queue of results that
 * are returned in order as the terminal `.maybeSingle()` / `.single()` calls
 * resolve, so we can script both the "conversation exists" and "conversation
 * created" branches deterministically.
 */
function createSupabaseStub(script: {
  conversationLookup?: { data: any; error: any }
  conversationInsert?: { data: any; error: any }
  messageInsert?: { data: any; error: any }
}) {
  const conversationUpdate = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }))

  const from = vi.fn((table: string) => {
    if (table === "conversations") {
      return {
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            maybeSingle: vi.fn(async () => script.conversationLookup ?? { data: null, error: null }),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => script.conversationInsert ?? { data: null, error: null }),
          })),
        })),
        update: conversationUpdate,
      }
    }
    if (table === "messages") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => script.messageInsert ?? { data: null, error: null }),
          })),
        })),
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return { from, conversationUpdate }
}

const createServiceRoleClient = vi.fn()

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => createServiceRoleClient(),
}))

import {
  ensureJobApplicationConversation,
  postApplicantHiringMessage,
} from "@/lib/rebuild/hiring-applicant-comms"

describe("ensureJobApplicationConversation", () => {
  beforeEach(() => createServiceRoleClient.mockReset())

  it("returns null without touching the database when the participants are identical", async () => {
    const result = await ensureJobApplicationConversation({
      applicationId: "app_1",
      applicantUserId: "same_user",
      hiringManagerUserId: "same_user",
    })
    expect(result).toBeNull()
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("reuses an existing conversation instead of creating a duplicate", async () => {
    const stub = createSupabaseStub({ conversationLookup: { data: { id: "existing_conv" }, error: null } })
    createServiceRoleClient.mockReturnValue(stub)

    const result = await ensureJobApplicationConversation({
      applicationId: "app_1",
      applicantUserId: "applicant",
      hiringManagerUserId: "manager",
    })

    expect(result).toBe("existing_conv")
  })

  it("creates a job-application conversation when none exists", async () => {
    const stub = createSupabaseStub({
      conversationLookup: { data: null, error: null },
      conversationInsert: { data: { id: "new_conv" }, error: null },
    })
    createServiceRoleClient.mockReturnValue(stub)

    const result = await ensureJobApplicationConversation({
      applicationId: "app_1",
      applicantUserId: "applicant",
      hiringManagerUserId: "manager",
    })

    expect(result).toBe("new_conv")
  })
})

describe("postApplicantHiringMessage", () => {
  beforeEach(() => createServiceRoleClient.mockReset())

  it("ensures the conversation and delivers the message", async () => {
    const stub = createSupabaseStub({
      conversationLookup: { data: { id: "conv_1" }, error: null },
      messageInsert: { data: { id: "msg_1" }, error: null },
    })
    createServiceRoleClient.mockReturnValue(stub)

    const result = await postApplicantHiringMessage({
      applicationId: "app_1",
      applicantUserId: "applicant",
      hiringManagerUserId: "manager",
      content: "You've been approved.",
    })

    expect(result).toEqual({ conversationId: "conv_1", delivered: true })
    expect(stub.conversationUpdate).toHaveBeenCalled()
  })

  it("reports no delivery when the conversation cannot be resolved", async () => {
    const stub = createSupabaseStub({
      conversationLookup: { data: null, error: null },
      conversationInsert: { data: null, error: { message: "insert failed" } },
    })
    createServiceRoleClient.mockReturnValue(stub)

    const result = await postApplicantHiringMessage({
      applicationId: "app_1",
      applicantUserId: "applicant",
      hiringManagerUserId: "manager",
      content: "You've been approved.",
    })

    expect(result).toEqual({ conversationId: null, delivered: false })
  })
})
