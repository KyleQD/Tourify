import { describe, expect, it } from "vitest"
import {
  canReadProtectedDataClass,
  classifyProtectedField,
  PROTECTED_DATA_CLASS_POLICIES,
  projectByProtectedDataPolicy,
  projectCredentialRecord,
  projectIncidentRecord,
} from "@/lib/admin/protected-data-policy"
import {
  canViewAccessibilityDietary,
  canViewTravelerIdentity,
  projectTravelerRecord,
} from "@/lib/admin/traveler-field-projection"
import { resolveAdminCapabilities } from "@/lib/auth/admin-capabilities"

describe("SEC-203 protected-data policy", () => {
  it("registers all required protected classes", () => {
    const classes = new Set(PROTECTED_DATA_CLASS_POLICIES.map((row) => row.class))
    for (const required of [
      "traveler_contact",
      "traveler_identity",
      "accessibility_dietary",
      "financial_details",
      "contract_terms",
      "contract_signature",
      "credentials",
      "incidents",
      "vendor_sensitive",
      "workforce_sensitive",
    ] as const) {
      expect(classes.has(required)).toBe(true)
    }
  })

  it("grants logistics.sensitive to tour_manager but not viewer", () => {
    const manager = resolveAdminCapabilities("tour_manager")
    const viewer = resolveAdminCapabilities("viewer")
    expect(manager).toContain("logistics.sensitive")
    expect(viewer).not.toContain("logistics.sensitive")
    expect(canViewTravelerIdentity(manager)).toBe(true)
    expect(canViewTravelerIdentity(viewer)).toBe(false)
  })

  it("redacts traveler contact/identity/dietary by capability", () => {
    const viewer = resolveAdminCapabilities("viewer")
    const manager = resolveAdminCapabilities("tour_manager")

    const row = {
      member_name: "Ada",
      member_email: "ada@example.com",
      passport_number: "X123",
      dietary_restrictions: ["vegan"],
      status: "confirmed",
    }

    const asViewer = projectTravelerRecord({ row, capabilities: viewer })
    expect(asViewer.member_name).toBe("Ada")
    expect(asViewer.status).toBe("confirmed")
    expect(asViewer.member_email).toBeNull()
    expect(asViewer.member_email__redacted).toBe(true)
    expect(asViewer.passport_number).toBeNull()
    expect(asViewer.dietary_restrictions).toBeNull()

    const asManager = projectTravelerRecord({ row, capabilities: manager })
    expect(asManager.member_email).toBe("ada@example.com")
    expect(asManager.passport_number).toBe("X123")
    expect(asManager.dietary_restrictions).toEqual(["vegan"])
    expect(canViewAccessibilityDietary(manager)).toBe(true)
  })

  it("classifies fields into policy classes", () => {
    expect(classifyProtectedField("passport_number")).toBe("traveler_identity")
    expect(classifyProtectedField("dietary_restrictions")).toBe("accessibility_dietary")
    expect(classifyProtectedField("payment_reference")).toBe("financial_details")
    expect(classifyProtectedField("credential_token")).toBe("credentials")
    expect(classifyProtectedField("incident_narrative")).toBe("incidents")
    expect(classifyProtectedField("status")).toBeNull()
  })

  it("projects credentials for scan vs manage", () => {
    const scanOnly = projectCredentialRecord({
      row: { id: "1", token: "secret", status: "active" },
      capabilities: ["ticketing.scan"],
    })
    expect(scanOnly.token).toBeNull()
    expect(scanOnly.token__present).toBe(true)

    const manage = projectCredentialRecord({
      row: { id: "1", token: "secret", status: "active" },
      capabilities: ["ticketing.manage"],
    })
    expect(manage.token).toBe("secret")
  })

  it("redacts incident narratives without live_ops/audit", () => {
    expect(
      canReadProtectedDataClass({
        dataClass: "incidents",
        capabilities: ["event.view"],
      }),
    ).toBe(false)

    const projected = projectIncidentRecord({
      row: { id: "i1", title: "Spill", incident_narrative: "Contains PII" },
      capabilities: ["event.view"],
    })
    expect(projected.title).toBe("Spill")
    expect(projected.incident_narrative).toBeNull()

    const live = projectIncidentRecord({
      row: { id: "i1", incident_narrative: "Contains PII" },
      capabilities: ["event.live_ops"],
    })
    expect(live.incident_narrative).toBe("Contains PII")
  })

  it("projects contract signature fields only with sign/manage", () => {
    const viewOnly = projectByProtectedDataPolicy({
      row: { id: "c1", title: "Deal", signature: "sig", terms: "secret terms" },
      capabilities: ["contract.view"],
    })
    expect(viewOnly.title).toBe("Deal")
    expect(viewOnly.signature).toBeNull()
    expect(viewOnly.terms).toBeNull()

    const signer = projectByProtectedDataPolicy({
      row: { id: "c1", signature: "sig", terms: "secret terms" },
      capabilities: ["contract.manage", "contract.sign"],
    })
    expect(signer.signature).toBe("sig")
    expect(signer.terms).toBe("secret terms")
  })
})
