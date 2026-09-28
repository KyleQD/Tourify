import { describe, expect, it } from "vitest"

import {
  classifyPublicationSection,
  PublicationFieldClassificationError,
} from "@/lib/admin/publication-field-policy"
import { renderPublicationSnapshot } from "@/lib/admin/publication-snapshot-renderer"

describe("PUB-002 publication field policy", () => {
  it("classifies every nested leaf by section inheritance", () => {
    const result = classifyPublicationSection({
      publicationType: "tour_book",
      sectionKey: "itinerary",
      payload: {
        stops: [{ name: "Opening", localDate: "2026-08-01", venueLabel: "Hall" }],
      },
    })

    expect(result.sectionAudienceClass).toBe("worker")
    expect(result.fieldAudienceClasses).toEqual({
      "stops[].name": "worker",
      "stops[].localDate": "worker",
      "stops[].venueLabel": "worker",
    })
  })

  it("raises protected fields and the effective section access class", () => {
    const result = classifyPublicationSection({
      publicationType: "day_sheet",
      sectionKey: "hospitality",
      payload: {
        meals: [{ provider: "Caterer", dietary_restrictions: "allergy", cost: 450 }],
      },
    })

    expect(result.fieldAudienceClasses["meals[].provider"]).toBe("department")
    expect(result.fieldAudienceClasses["meals[].dietary_restrictions"]).toBe("sensitive_traveler")
    expect(result.fieldAudienceClasses["meals[].cost"]).toBe("financial")
    expect(result.accessClassification).toBe("sensitive_traveler")
  })

  it("rejects an unclassified custom section", () => {
    expect(() =>
      classifyPublicationSection({
        publicationType: "tour_book",
        sectionKey: "promoter_secret_blob",
        payload: { value: "x" },
      }),
    ).toThrow(PublicationFieldClassificationError)
  })

  it("allows an explicit class for custom sections and will not downgrade built-ins", () => {
    const custom = classifyPublicationSection({
      publicationType: "tour_book",
      sectionKey: "custom_department_notes",
      payload: { note: "x" },
      audienceClass: "department",
    })
    expect(custom.fieldAudienceClasses.note).toBe("department")

    const protectedContact = classifyPublicationSection({
      publicationType: "contact_sheet",
      sectionKey: "contacts",
      payload: { personal_phone: "555-0100" },
      audienceClass: "public",
      fieldAudienceClasses: { personal_phone: "public" },
    })
    expect(protectedContact.sectionAudienceClass).toBe("personnel")
    expect(protectedContact.fieldAudienceClasses.personal_phone).toBe("sensitive_traveler")
  })

  it("records the resolved field map in the immutable manifest", () => {
    const rendered = renderPublicationSnapshot({
      publicationType: "tour_book",
      orgId: "org-1",
      subjectType: "tour",
      subjectId: "tour-1",
      sourcePlanVersion: 1,
      sections: [
        {
          key: "contacts",
          title: "Contacts",
          required: true,
          payload: { contacts: [{ name: "Pat", personal_phone: "555-0100" }] },
        },
      ],
    })

    expect(rendered.ok).toBe(true)
    expect(rendered.manifest.sections[0].audienceClass).toBe("personnel")
    expect(rendered.manifest.sections[0].accessClassification).toBe("sensitive_traveler")
    expect(rendered.manifest.sections[0].fieldAudienceClasses["contacts[].name"]).toBe("personnel")
  })
})
