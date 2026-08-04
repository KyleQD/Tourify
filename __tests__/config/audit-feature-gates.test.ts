import { isAuditFeatureApproved } from "@/lib/config/audit-feature-gates"

describe("AUDIT:RUN-002 server-side feature gates", () => {
  const original = process.env

  beforeEach(() => {
    process.env = { ...original }
    delete process.env.FEATURE_AUDIT_POLLS_APPROVED
    delete process.env.FEATURE_AUDIT_MARKETPLACE_INTEGRATIONS_APPROVED
  })

  afterAll(() => {
    process.env = original
  })

  it("fails closed when approval is absent", () => {
    expect(isAuditFeatureApproved("polls")).toBe(false)
    expect(isAuditFeatureApproved("marketplace_integrations")).toBe(false)
  })

  it("accepts only explicit server-side approval", () => {
    process.env.FEATURE_AUDIT_POLLS_APPROVED = "true"
    expect(isAuditFeatureApproved("polls")).toBe(true)
  })
})

