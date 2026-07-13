import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { HiringComplianceService } from "@/lib/services/hiring-compliance.service"
import type { HiringComplianceCheckInput, HiringStoredDocument } from "@/types/hiring-compliance"

const employer = {
  entityType: "venue" as const,
  entityId: "00000000-0000-0000-0000-000000000010",
  displayName: "Test Venue",
}

function makeDocument(overrides: Partial<HiringStoredDocument> & Pick<HiringStoredDocument, "id" | "label">): HiringStoredDocument {
  return {
    employer,
    candidateId: "00000000-0000-0000-0000-000000000020",
    fieldId: "government_id",
    documentType: "id_document",
    credentialType: "government_id",
    bucket: "staff-id-documents",
    storagePath: `path/${overrides.id}.jpg`,
    fileName: `${overrides.id}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    status: "uploaded",
    ...overrides,
  }
}

function baseInput(documents: HiringStoredDocument[]): HiringComplianceCheckInput {
  return {
    candidateId: "00000000-0000-0000-0000-000000000020",
    employer,
    templateFields: [
      {
        fieldId: "government_id",
        label: "Government ID",
        type: "id_document",
        required: true,
        blocking: true,
        requiresAdminReview: true,
        credentialType: "government_id",
      },
    ],
    responses: {},
    documents,
  }
}

describe("HiringComplianceService id_document sides", () => {
  let service: HiringComplianceService

  beforeEach(() => {
    service = new HiringComplianceService({ supabase: {} as never })
  })

  it("blocks when only one ID side is uploaded", () => {
    const result = service.evaluateCompliance(
      baseInput([
        makeDocument({
          id: "doc-front",
          label: "Government ID — Front",
          side: "front",
          metadata: { side: "front" },
        }),
      ])
    )

    expect(result.complete).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.issues[0]?.reason).toContain("Front and back")
  })

  it("requires admin review when both sides are uploaded but not approved", () => {
    const result = service.evaluateCompliance(
      baseInput([
        makeDocument({
          id: "doc-front",
          label: "Government ID — Front",
          side: "front",
          metadata: { side: "front" },
        }),
        makeDocument({
          id: "doc-back",
          label: "Government ID — Back",
          side: "back",
          metadata: { side: "back" },
        }),
      ])
    )

    expect(result.blocked).toBe(true)
    expect(result.needsReviewCount).toBe(1)
    expect(result.issues[0]?.reason).toContain("admin review")
  })

  it("marks complete when both sides are approved", () => {
    const result = service.evaluateCompliance(
      baseInput([
        makeDocument({
          id: "doc-front",
          label: "Government ID — Front",
          side: "front",
          status: "approved",
          metadata: { side: "front" },
        }),
        makeDocument({
          id: "doc-back",
          label: "Government ID — Back",
          side: "back",
          status: "approved",
          metadata: { side: "back" },
        }),
      ])
    )

    expect(result.complete).toBe(true)
    expect(result.blocked).toBe(false)
    expect(result.completedRequiredCount).toBe(1)
  })

  it("treats legacy single-side ID uploads as incomplete", () => {
    const result = service.evaluateCompliance(
      baseInput([
        makeDocument({
          id: "doc-legacy",
          label: "Government ID",
          status: "uploaded",
        }),
      ])
    )

    expect(result.complete).toBe(false)
    expect(result.issues[0]?.reason).toContain("Front and back")
  })
})
