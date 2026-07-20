import { describe, expect, it } from "vitest"

import {
  createJobPostingApiSchema,
} from "@/lib/api/hiring-api-schemas"
import {
  getDefaultJobPostingValues,
  jobPostingFormSchema,
} from "@/lib/hiring/job-posting-builder-schema"
import { resolveRolePackTemplate, ROLE_PACKS } from "@/lib/hiring/role-packs"
import {
  partitionOnboardingResponses,
  redactSensitiveResponses,
} from "@/lib/hiring/sensitive-field-utils"
import {
  buildOnboardingTemplateSnapshot,
  templateFromSnapshot,
} from "@/lib/hiring/template-snapshot"
import {
  decryptJsonPayload,
  encryptJsonPayload,
} from "@/lib/security/employee-credentials-vault"

describe("job posting publish requires onboarding template", () => {
  it("allows draft without a template", () => {
    const values = getDefaultJobPostingValues({
      title: "Security Guard",
      description: "Night shift security for festival gates and backstage.",
      department: "Security",
      position: "Guard",
      status: "draft",
      onboarding_template_id: null,
    })

    const parsed = jobPostingFormSchema.safeParse(values)
    expect(parsed.success).toBe(true)
  })

  it("rejects published postings without a template", () => {
    const values = getDefaultJobPostingValues({
      title: "Security Guard",
      description: "Night shift security for festival gates and backstage.",
      department: "Security",
      position: "Guard",
      status: "published",
      onboarding_template_id: null,
    })

    const parsed = jobPostingFormSchema.safeParse(values)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.includes("onboarding_template_id"))).toBe(true)
    }
  })

  it("accepts published postings with a template id", () => {
    const templateId = "11111111-1111-4111-8111-111111111111"
    const values = getDefaultJobPostingValues({
      title: "Security Guard",
      description: "Night shift security for festival gates and backstage.",
      department: "Security",
      position: "Guard",
      status: "published",
      onboarding_template_id: templateId,
      application_form_template: { fields: [] },
    })

    const parsed = jobPostingFormSchema.safeParse(values)
    expect(parsed.success).toBe(true)

    const apiParsed = createJobPostingApiSchema.safeParse({
      title: values.title,
      description: values.description,
      department: values.department,
      position: values.position,
      status: "published",
      onboarding_template_id: templateId,
      application_form_template: { fields: [] },
      entity_type: "organization",
      entity_id: "22222222-2222-4222-8222-222222222222",
    })
    expect(apiParsed.success).toBe(true)
  })
})

describe("onboarding template snapshots", () => {
  it("round-trips snapshot fields for token onboarding", () => {
    const snapshot = buildOnboardingTemplateSnapshot({
      id: "tmpl-1",
      name: "Security Guard",
      description: "Licensed security onboarding",
      department: "Security",
      position: "Guard",
      employment_type: "contractor",
      fields: [
        {
          id: "legal_name",
          name: "legal_name",
          label: "Legal name",
          type: "text",
          section: "Identity",
          order: 10,
          required: true,
        },
      ],
      required_documents: ["Government ID"],
      estimated_days: 3,
      version: 2,
    })

    expect(snapshot.version).toBe(2)
    expect(snapshot.snapshotted_at).toBeTruthy()

    const restored = templateFromSnapshot(snapshot)
    expect(restored?.id).toBe("tmpl-1")
    expect(restored?.fields).toHaveLength(1)
    expect(restored?.required_documents).toEqual(["Government ID"])
  })

  it("prefers snapshot over null/invalid values", () => {
    expect(templateFromSnapshot(null)).toBeNull()
    expect(templateFromSnapshot({ name: "Missing id" })).toBeNull()
  })
})

describe("sensitive response partition and vault encryption", () => {
  it("redacts sensitive fields and encrypts the vault payload", () => {
    process.env.EMPLOYEE_CREDENTIALS_SECRET = "test-hiring-vault-secret-key"

    const responses = {
      legal_name: "Ada Lovelace",
      ssn: "123-45-6789",
      bank_info: { accountNumber: "99887766", routingNumber: "021000021" },
      resume: { document_id: "doc-1", fileName: "resume.pdf" },
    }
    const fieldTypeById = {
      legal_name: "text",
      ssn: "ssn",
      bank_info: "bank_info",
      resume: "file",
    }

    const redacted = redactSensitiveResponses({ responses, fieldTypeById })
    expect(redacted.legal_name).toBe("Ada Lovelace")
    expect(redacted.ssn).toMatchObject({ redacted: true, submitted: true })

    const partitioned = partitionOnboardingResponses({ responses, fieldTypeById })
    expect(partitioned.reusable.legal_name).toBe("Ada Lovelace")
    expect(partitioned.sensitive.ssn).toBe("123-45-6789")
    expect(partitioned.documentRefs.resume).toBeTruthy()

    const envelope = encryptJsonPayload(partitioned.sensitive)
    const decrypted = decryptJsonPayload(envelope)
    expect(decrypted.ssn).toBe("123-45-6789")
    expect(decrypted.bank_info).toEqual(responses.bank_info)
  })
})

describe("role packs", () => {
  it("resolves every configured pack to a default template", () => {
    for (const pack of ROLE_PACKS) {
      const template = resolveRolePackTemplate(pack.id)
      expect(template).toBeTruthy()
      expect(template?.fields.length).toBeGreaterThan(0)
    }
  })
})
