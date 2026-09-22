import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  findWorkforceDuplicateCandidates,
  previewWorkforceMerge,
  WorkforceMergeError,
  executeWorkforceMerge,
} from "@/lib/admin/workforce-identity-merge.service"

const ORG_ID = "22222222-2222-4222-8222-222222222222"
const KEEP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const MERGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const USER_ID = "11111111-1111-4111-8111-111111111111"

function createStaffClient(rows: Array<Record<string, unknown>>) {
  return {
    from(table: string) {
      if (table === "staff_members") {
        return {
          select: () => ({
            or: () => ({
              limit: async () => ({ data: rows, error: null }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        }
      }
      if (
        table === "employment_assignments"
        || table === "staff_shifts"
        || table === "staff_shift_assignments"
      ) {
        return {
          select: () => ({
            eq: () => ({
              then: undefined,
            }),
            // head count path
          }),
          update: () => ({
            eq: async () => ({ error: null, count: 1 }),
          }),
        }
      }
      if (table === "workforce_identity_aliases") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: "alias-1" }, error: null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected ${table}`)
    },
  }
}

describe("WORK-105 identity merge", () => {
  it("flags same user_id pairs as strong candidates", async () => {
    const supabase = createStaffClient([
      {
        id: KEEP_ID,
        user_id: USER_ID,
        email: "a@example.com",
        name: "Alex",
        employer_entity_type: "organization",
        employer_entity_id: ORG_ID,
        org_id: ORG_ID,
        status: "active",
      },
      {
        id: MERGE_ID,
        user_id: USER_ID,
        email: "a+dup@example.com",
        name: "Alex Dup",
        employer_entity_type: "organization",
        employer_entity_id: ORG_ID,
        org_id: ORG_ID,
        status: "pending",
      },
    ])

    // Patch count queries used by preview
    const originalFrom = supabase.from.bind(supabase)
    supabase.from = (table: string) => {
      const base = originalFrom(table)
      if (
        table === "employment_assignments"
        || table === "staff_shifts"
        || table === "staff_shift_assignments"
      ) {
        return {
          select: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
          update: () => ({
            eq: async () => ({ error: null, count: 0 }),
          }),
        }
      }
      return base
    }

    const candidates = await findWorkforceDuplicateCandidates({
      supabase: supabase as any,
      orgId: ORG_ID,
    })
    expect(candidates.length).toBe(1)
    expect(candidates[0].strength).toBe("strong")
    expect(candidates[0].signal).toBe("same_user_id")
  })

  it("never allows merge on name-only weak signals", async () => {
    const supabase = {
      from(table: string) {
        if (table === "staff_members") {
          return {
            select: () => ({
              or: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: KEEP_ID,
                      user_id: null,
                      email: null,
                      name: "Sam Stage",
                      employer_entity_type: "organization",
                      employer_entity_id: ORG_ID,
                      org_id: ORG_ID,
                      status: "active",
                    },
                    {
                      id: MERGE_ID,
                      user_id: null,
                      email: null,
                      name: "Sam Stage",
                      employer_entity_type: "organization",
                      employer_entity_id: ORG_ID,
                      org_id: ORG_ID,
                      status: "pending",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => Promise.resolve({ count: 0, error: null }),
          }),
        }
      },
    }

    const preview = await previewWorkforceMerge({
      supabase: supabase as any,
      orgId: ORG_ID,
      keepStaffMemberId: KEEP_ID,
      mergeStaffMemberId: MERGE_ID,
    })
    expect(preview.canMerge).toBe(false)
    expect(preview.candidate.strength).toBe("weak")

    await expect(
      executeWorkforceMerge({
        supabase: supabase as any,
        orgId: ORG_ID,
        keepStaffMemberId: KEEP_ID,
        mergeStaffMemberId: MERGE_ID,
        actorUserId: USER_ID,
        confirmPreview: true,
      }),
    ).rejects.toBeInstanceOf(WorkforceMergeError)
  })
})
