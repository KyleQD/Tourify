import { bookingsToCsv } from "../bookings-export"

describe("bookingsToCsv (VEN-099)", () => {
  it("emits a header row and one line per booking", () => {
    const csv = bookingsToCsv([
      { id: "a1", event_name: "Show", status: "approved" },
      { id: "b2", event_name: "Party", status: "pending" },
    ])
    const lines = csv.split("\r\n")
    expect(lines[0]).toContain("request_id,event_name")
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain("a1,Show")
  })

  it("escapes commas and quotes", () => {
    const csv = bookingsToCsv([{ id: "x", event_name: 'Show, "The Sequel"' }])
    expect(csv).toContain('"Show, ""The Sequel"""')
  })

  it("neutralizes formula-injection prefixes", () => {
    const csv = bookingsToCsv([
      { id: "y", event_name: "=HYPERLINK(\"http://evil\")" },
      { id: "z", contact_email: "+12223334444" },
    ])
    const lines = csv.split("\r\n")
    expect(lines[1]).toContain("'=HYPERLINK")
    expect(lines[2]).toContain("'+12223334444")
  })

  it("handles null/undefined cells as empty", () => {
    const csv = bookingsToCsv([{ id: "n", event_name: null }])
    const [, row] = csv.split("\r\n")
    expect(row.startsWith("n,,")).toBe(true)
  })
})
