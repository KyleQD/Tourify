import {
  STAFF_SENSITIVE_COLUMNS,
  STAFF_SUMMARY_COLUMNS,
  staffSummarySelect,
  stripSensitiveStaffFields,
  toStaffSummaryDto,
} from "@/lib/venue/staff-dto"

/**
 * VEN-017 — permission-scoped staff DTO contract tests.
 */

const SENSITIVE_ROW = {
  id: "sm-1",
  venue_id: "vp-1",
  user_id: "u-1",
  name: "Alex Rivera",
  email: "alex@example.com",
  phone: "+1-555-0100",
  role: "technician",
  department: "Audio",
  employment_type: "part_time",
  status: "active",
  avatar_url: null,
  hire_date: "2025-03-01",
  date_of_birth: "1990-01-01",
  address: "12 Private Ln",
  city: "Detroit",
  state: "MI",
  country: "USA",
  postal_code: "48201",
  emergency_contact: { name: "Sam", phone: "+1-555-0199" },
  hourly_rate: 42,
  pay_frequency: "biweekly",
  admin_notes: "sensitive",
  internal_notes: "sensitive",
  notes: "sensitive",
  last_performance_review: "2026-01-15",
  next_review_date: "2027-01-15",
  performance_metrics: { score: 4.8 },
}

describe("VEN-017 — staff DTO sanitization", () => {
  it("strips every sensitive column from raw rows", () => {
    const stripped = stripSensitiveStaffFields(SENSITIVE_ROW) as Record<string, unknown>
    for (const column of STAFF_SENSITIVE_COLUMNS) {
      expect(stripped).not.toHaveProperty(column)
    }
    expect(stripped.name).toBe("Alex Rivera")
  })

  it("projects a typed summary DTO with no PII/pay/HR fields", () => {
    const dto = toStaffSummaryDto(SENSITIVE_ROW)
    expect(dto).toEqual({
      id: "sm-1",
      venueId: "vp-1",
      userId: "u-1",
      name: "Alex Rivera",
      email: "alex@example.com",
      role: "technician",
      department: "Audio",
      employmentType: "part_time",
      status: "active",
      avatarUrl: null,
      hireDate: "2025-03-01",
    })
    const serialized = JSON.stringify(dto)
    for (const forbidden of ["hourly_rate", "emergency_contact", "date_of_birth", "admin_notes"]) {
      expect(serialized).not.toContain(forbidden)
    }
  })

  it("summary select allowlist never contains a sensitive column", () => {
    const selected = staffSummarySelect().split(", ")
    for (const column of STAFF_SENSITIVE_COLUMNS) {
      expect(selected).not.toContain(column)
    }
    for (const column of STAFF_SUMMARY_COLUMNS) {
      expect(selected).toContain(column)
    }
  })

  it("falls back gracefully on partial rows", () => {
    const dto = toStaffSummaryDto({ id: "sm-2", email: "x@y.z", first_name: "Bo", last_name: "Chen" })
    expect(dto.name).toBe("Bo Chen")
    expect(dto.status).toBe("inactive")
    expect(dto.venueId).toBeNull()
  })
})
