import { describe, expect, it } from "vitest"

import {
  canViewVendorSensitiveFields,
  projectTourVendorRow,
  projectVendorDocumentRow,
  projectVendorMasterRow,
  VENDOR_RETENTION,
} from "@/lib/admin/vendor-field-projection"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"

describe("VEND-103 vendor field projection", () => {
  it("grants sensitive access only with vendor.sensitive", () => {
    expect(canViewVendorSensitiveFields(["vendor.view", "vendor.manage"])).toBe(false)
    expect(canViewVendorSensitiveFields(["vendor.view", "vendor.sensitive"])).toBe(true)
  })

  it("redacts contacts/tax for operational viewers and keeps identity", () => {
    const row = projectVendorMasterRow({
      row: {
        id: "v1",
        legal_name: "Acme",
        display_name: "Acme",
        category: "production",
        primary_contact_email: "a@example.com",
        tax_id_last4: "1234",
        payment_method: "ach",
        external_accounting_id: "ERP-1",
      },
      capabilities: ["vendor.view"] as AdminCapability[],
    })

    expect(row.legal_name).toBe("Acme")
    expect(row.primary_contact_email).toBeNull()
    expect(row.tax_id_last4).toBeNull()
    expect(row.payment_method).toBeNull()
    expect(row.external_accounting_id).toBeNull()
    expect(row.has_external_accounting_id).toBe(true)
    expect(row.__redacted).toBe(true)
  })

  it("passes through sensitive fields when capability present", () => {
    const row = projectVendorMasterRow({
      row: {
        legal_name: "Acme",
        primary_contact_email: "a@example.com",
        tax_id_last4: "1234",
      },
      capabilities: ["vendor.sensitive"] as AdminCapability[],
    })
    expect(row.primary_contact_email).toBe("a@example.com")
    expect(row.tax_id_last4).toBe("1234")
  })

  it("redacts tour engagement contacts and nested contact blob", () => {
    const row = projectTourVendorRow({
      row: {
        name: "Caterer",
        contact_email: "c@example.com",
        contact: { name: "Pat", email: "c@example.com", phone: "555" },
        contract_amount: 1000,
      },
      capabilities: ["vendor.view"] as AdminCapability[],
    })
    expect(row.name).toBe("Caterer")
    expect(row.contact_email).toBeNull()
    expect((row.contact as { email: unknown }).email).toBeNull()
    expect(row.contract_amount).toBeNull()
  })

  it("limits document projection to non-path metadata for ops viewers", () => {
    const row = projectVendorDocumentRow({
      row: {
        id: "d1",
        org_id: "o1",
        vendor_id: "v1",
        doc_type: "insurance",
        title: "COI",
        status: "verified",
        expires_on: "2027-01-01",
        storage_path: "org/v1/coi.pdf",
        checksum: "abc",
        verification_notes: "ok",
      },
      capabilities: ["vendor.view"] as AdminCapability[],
    })
    expect(row.title).toBe("COI")
    expect(row.storage_path).toBeUndefined()
    expect(row.checksum).toBeUndefined()
    expect(row.__redacted).toBe(true)
  })

  it("exports retention policy constants", () => {
    expect(VENDOR_RETENTION.commercialYearsAfterInactive).toBe(7)
    expect(VENDOR_RETENTION.personalContactYearsAfterInactive).toBe(2)
  })
})
