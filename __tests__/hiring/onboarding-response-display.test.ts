import { describe, expect, it } from "vitest"

import {
  formatOnboardingResponseLabel,
  formatOnboardingResponseValue,
} from "@/lib/hiring/onboarding-response-display"

describe("formatOnboardingResponseValue", () => {
  it("summarizes a redacted government ID without internal document IDs", () => {
    const display = formatOnboardingResponseValue({
      back: true,
      front: true,
      redacted: true,
      submitted: true,
      front_document_id: "864ef24c-90ff-4287-ab72-771b0f87d80d",
    })

    expect(display).toEqual({
      kind: "text",
      text: "Submitted (front and back uploaded)",
    })
    expect(JSON.stringify(display)).not.toContain("front_document_id")
    expect(JSON.stringify(display)).not.toContain("864ef24c")
  })

  it("summarizes tax forms with last four digits only", () => {
    const display = formatOnboardingResponseValue({
      last4: "1111",
      redacted: true,
      submitted: true,
    })

    expect(display).toEqual({
      kind: "text",
      text: "Submitted - ending in 1111",
    })
    expect(JSON.stringify(display)).not.toContain("redacted")
    expect(JSON.stringify(display)).not.toContain("submitted")
  })

  it("renders emergency contact details as readable labeled lines", () => {
    const display = formatOnboardingResponseValue({
      name: "Kyle Daley",
      email: "kqdaley@gmail.com",
      phone: "8057227627",
      relationship: "person",
    })

    expect(display).toEqual({
      kind: "lines",
      lines: [
        { label: "Name", value: "Kyle Daley" },
        { label: "Email", value: "kqdaley@gmail.com" },
        { label: "Phone", value: "8057227627" },
        { label: "Relationship", value: "person" },
      ],
    })
  })

  it("keeps primitive and empty values predictable", () => {
    expect(formatOnboardingResponseValue("Kyle Daley")).toEqual({ kind: "text", text: "Kyle Daley" })
    expect(formatOnboardingResponseValue(true)).toEqual({ kind: "text", text: "Yes" })
    expect(formatOnboardingResponseValue(null)).toEqual({ kind: "empty" })
    expect(formatOnboardingResponseValue("")).toEqual({ kind: "empty" })
  })

  it("uses friendly known labels for approval review fields", () => {
    expect(formatOnboardingResponseLabel("government_id")).toBe("Government ID")
    expect(formatOnboardingResponseLabel("w9_or_tax_form")).toBe("W-9 or tax form")
  })
})
