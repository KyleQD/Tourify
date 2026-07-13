import { beforeEach, describe, expect, it } from "vitest"

import {
  buildFieldTypeMap,
  partitionOnboardingResponses,
  redactSensitiveResponses,
} from "@/lib/hiring/sensitive-field-utils"
import { decryptJsonPayload, encryptJsonPayload } from "@/lib/security/employee-credentials-vault"
import { WorkerOnboardingProfileService } from "@/lib/services/worker-onboarding-profile.service"

describe("partitionOnboardingResponses", () => {
  const fieldTypeById = buildFieldTypeMap([
    { name: "legal_name", type: "text" },
    { name: "date_of_birth", type: "date" },
    { name: "emergency_contact", type: "emergency_contact" },
    { name: "ssn", type: "ssn" },
    { name: "bank_info", type: "bank_info" },
    { name: "government_id", type: "id_document" },
  ])

  it("splits reusable, sensitive, and document fields", () => {
    const { reusable, sensitive, documentRefs } = partitionOnboardingResponses({
      fieldTypeById,
      responses: {
        legal_name: "Alex Stage",
        date_of_birth: "1994-04-12",
        emergency_contact: { name: "Sam", phone: "555-0100" },
        ssn: "123-45-6789",
        bank_info: { routingNumber: "021000021", accountNumber: "987654321" },
        government_id: { document_id: "doc_1", fileName: "id.pdf" },
      },
    })

    expect(reusable).toEqual({
      legal_name: "Alex Stage",
      date_of_birth: "1994-04-12",
      emergency_contact: { name: "Sam", phone: "555-0100" },
    })
    expect(sensitive).toEqual({
      ssn: "123-45-6789",
      bank_info: { routingNumber: "021000021", accountNumber: "987654321" },
    })
    expect(documentRefs).toEqual({
      government_id: { document_id: "doc_1", fileName: "id.pdf" },
    })
  })

  it("treats front/back government ID uploads as document refs", () => {
    const { sensitive, documentRefs } = partitionOnboardingResponses({
      fieldTypeById,
      responses: {
        government_id: {
          front: { documentId: "doc_front", fileName: "id-front.jpg", fileType: "image/jpeg", fileSize: 1200, side: "front" },
          back: { documentId: "doc_back", fileName: "id-back.jpg", fileType: "image/jpeg", fileSize: 1100, side: "back" },
        },
      },
    })

    expect(sensitive).toEqual({})
    expect(documentRefs.government_id).toMatchObject({
      front: { documentId: "doc_front", side: "front" },
      back: { documentId: "doc_back", side: "back" },
    })
  })

  it("excludes already-redacted summaries from the vault partition", () => {
    const { sensitive } = partitionOnboardingResponses({
      fieldTypeById,
      responses: {
        ssn: { submitted: true, redacted: true, last4: "6789" },
      },
    })

    expect(sensitive).toEqual({})
  })
})

describe("redactSensitiveResponses for employer storage", () => {
  it("never stores raw SSN/bank on the candidate-visible payload", () => {
    const fieldTypeById = buildFieldTypeMap([
      { name: "legal_name", type: "text" },
      { name: "ssn", type: "ssn" },
      { name: "bank_info", type: "bank_info" },
    ])

    const redacted = redactSensitiveResponses({
      fieldTypeById,
      responses: {
        legal_name: "Alex Stage",
        ssn: "123-45-6789",
        bank_info: { routingNumber: "021000021", accountNumber: "987654321" },
      },
    })

    expect(redacted.legal_name).toBe("Alex Stage")
    expect(redacted.ssn).toMatchObject({ submitted: true, redacted: true })
    expect(JSON.stringify(redacted)).not.toContain("123-45-6789")
    expect(JSON.stringify(redacted)).not.toContain("987654321")
  })
})

describe("encryptJsonPayload / decryptJsonPayload", () => {
  beforeEach(() => {
    process.env.EMPLOYEE_CREDENTIALS_SECRET = "test-onboarding-vault-secret"
  })

  it("round-trips sensitive field maps", () => {
    const payload = { ssn: "123-45-6789", bank_info: { accountNumber: "11112222" } }
    const envelope = encryptJsonPayload(payload)
    expect(envelope.algorithm).toBe("aes-256-gcm")
    expect(JSON.stringify(envelope)).not.toContain("123-45-6789")

    const decrypted = decryptJsonPayload(envelope)
    expect(decrypted).toEqual(payload)
  })
})

describe("WorkerOnboardingProfileService.resolvePrefill", () => {
  function createProfileSupabase(row: Record<string, unknown> | null) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error: null }),
          }),
        }),
      }),
    }
  }

  beforeEach(() => {
    process.env.EMPLOYEE_CREDENTIALS_SECRET = "test-onboarding-vault-secret"
  })

  it("prefers current draft over saved profile", async () => {
    const result = await WorkerOnboardingProfileService.resolvePrefill({
      supabase: createProfileSupabase(null) as never,
      userId: "user_1",
      sessionUserId: "user_1",
      draftExistingResponses: {
        id: "resp_1",
        responses: { legal_name: "Draft Name" },
      },
      templateFieldNames: ["legal_name", "ssn"],
    })

    expect(result.prefillSource).toBe("draft")
    expect(result.responses).toEqual({ responses: { legal_name: "Draft Name" } })
  })

  it("decrypts sensitive fields only when session user owns the profile", async () => {
    const envelope = encryptJsonPayload({ ssn: "123-45-6789" })
    const supabase = createProfileSupabase({
      user_id: "user_1",
      profile_data: { legal_name: "Alex Stage" },
      sensitive_envelope: envelope,
      document_refs: {},
    })

    const owner = await WorkerOnboardingProfileService.resolvePrefill({
      supabase: supabase as never,
      userId: "user_1",
      sessionUserId: "user_1",
      templateFieldNames: ["legal_name", "ssn"],
    })

    expect(owner.prefillSource).toBe("saved_profile")
    expect(owner.responses).toEqual({
      responses: { legal_name: "Alex Stage", ssn: "123-45-6789" },
    })

    const stranger = await WorkerOnboardingProfileService.resolvePrefill({
      supabase: supabase as never,
      userId: "user_1",
      sessionUserId: "user_other",
      templateFieldNames: ["legal_name", "ssn"],
    })

    expect(stranger.prefillSource).toBe("saved_profile")
    expect(stranger.responses).toEqual({
      responses: { legal_name: "Alex Stage" },
    })
    expect(JSON.stringify(stranger.responses)).not.toContain("123-45-6789")
  })

  it("returns none when anonymous and no draft", async () => {
    const result = await WorkerOnboardingProfileService.resolvePrefill({
      supabase: createProfileSupabase(null) as never,
      userId: null,
      sessionUserId: null,
    })

    expect(result).toEqual({ responses: null, prefillSource: "none" })
  })
})

describe("WorkerOnboardingProfileService.upsertFromResponses", () => {
  beforeEach(() => {
    process.env.EMPLOYEE_CREDENTIALS_SECRET = "test-onboarding-vault-secret"
  })

  it("upserts reusable plaintext and vaulted sensitive values without raw PII in profile_data", async () => {
    const capture: { upserted: Record<string, unknown> | null } = { upserted: null }

    const supabase = {
      from: (table: string) => {
        expect(table).toBe("worker_onboarding_profiles")
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: async (row: Record<string, unknown>) => {
            capture.upserted = row
            return { error: null }
          },
        }
      },
    }

    const result = await WorkerOnboardingProfileService.upsertFromResponses({
      supabase: supabase as never,
      userId: "user_1",
      fieldTypeById: buildFieldTypeMap([
        { name: "legal_name", type: "text" },
        { name: "ssn", type: "ssn" },
      ]),
      responses: {
        legal_name: "Alex Stage",
        ssn: "123-45-6789",
      },
    })

    expect(result).toEqual({ ok: true })
    expect(capture.upserted).not.toBeNull()
    expect(capture.upserted?.profile_data).toEqual({ legal_name: "Alex Stage" })
    expect(JSON.stringify(capture.upserted?.profile_data)).not.toContain("123-45-6789")
    expect(capture.upserted?.sensitive_envelope).toBeTruthy()
    expect(decryptJsonPayload(capture.upserted!.sensitive_envelope)).toEqual({ ssn: "123-45-6789" })
  })
})
