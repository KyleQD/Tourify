import { isAuditFeatureApproved } from "@/lib/config/audit-feature-gates"

describe("AUDIT:RUN-002 server-side feature gates", () => {
  const original = process.env

  beforeEach(() => {
    process.env = { ...original }
    delete process.env.FEATURE_AUDIT_POLLS_APPROVED
    delete process.env.FEATURE_AUDIT_MARKETPLACE_INTEGRATIONS_APPROVED
    delete process.env.FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED
  })

  afterAll(() => {
    process.env = original
  })

  it("fails closed when approval is absent", () => {
    expect(isAuditFeatureApproved("polls")).toBe(false)
    expect(isAuditFeatureApproved("marketplace_integrations")).toBe(false)
    expect(isAuditFeatureApproved("advanced_webhooks")).toBe(false)
  })

  it("keeps launch-disabled capabilities closed even with a legacy approval variable", () => {
    process.env.FEATURE_AUDIT_POLLS_APPROVED = "true"
    process.env.FEATURE_AUDIT_MARKETPLACE_INTEGRATIONS_APPROVED = "true"
    process.env.FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED = "true"

    expect(isAuditFeatureApproved("polls")).toBe(false)
    expect(isAuditFeatureApproved("marketplace_integrations")).toBe(false)
    expect(isAuditFeatureApproved("advanced_webhooks")).toBe(false)
  })
})
