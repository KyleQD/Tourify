import { describe, it, expect } from "vitest"
import {
  createChangeNotice,
  sendChangeNotice,
  getReAckRequired,
  acknowledgeChangeNotice,
  summarizeChangeNotice,
  type ChangeNoticeSection,
  type ChangeNoticeRecipient,
} from "@/lib/admin/pub-change-notice"

const SECTION: ChangeNoticeSection = {
  section_key: "stops",
  fields: [{ field: "venue", before: "NYC", after: "LA", display_label: "Venue" }],
  re_ack_policy: "required",
  remediation_link: "/admin/plan/tour-1/stops",
}

const RECIPIENT: ChangeNoticeRecipient = {
  recipient_id: "w-1",
  affected_section_keys: ["stops"],
  re_ack_required: true,
  acknowledged_at: null,
}

describe("createChangeNotice", () => {
  it("creates a draft notice", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: "pub-0", sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T" })
    expect(n.status).toBe("draft")
    expect(n.sent_at).toBeNull()
  })
})

describe("sendChangeNotice", () => {
  it("sends a draft notice", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: null, sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T1" })
    const r = sendChangeNotice(n, "T2")
    expect(r.ok).toBe(true)
    expect(r.notice?.status).toBe("sent")
    expect(r.notice?.sent_at).toBe("T2")
  })

  it("cannot send non-draft notice", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: null, sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T1" })
    const sent = sendChangeNotice(n, "T2").notice!
    const r = sendChangeNotice(sent, "T3")
    expect(r.ok).toBe(false)
  })

  it("cannot send notice with no sections", () => {
    const n = createChangeNotice({ notice_id: "n-2", publication_id: "pub-1", previous_publication_id: null, sections: [], recipients: [RECIPIENT], created_by: "u", now: "T" })
    expect(sendChangeNotice(n, "T").ok).toBe(false)
  })
})

describe("getReAckRequired / acknowledgeChangeNotice", () => {
  it("returns unacknowledged re-ack recipients", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: null, sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T" })
    expect(getReAckRequired(n)).toHaveLength(1)
  })

  it("acknowledges recipient and removes from re-ack list", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: null, sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T" })
    const acked = acknowledgeChangeNotice(n, "w-1", "T2")
    expect(getReAckRequired(acked)).toHaveLength(0)
  })
})

describe("summarizeChangeNotice", () => {
  it("summarizes notice correctly", () => {
    const n = createChangeNotice({ notice_id: "n-1", publication_id: "pub-1", previous_publication_id: null, sections: [SECTION], recipients: [RECIPIENT], created_by: "u", now: "T" })
    const s = summarizeChangeNotice(n)
    expect(s.total_sections).toBe(1)
    expect(s.sections_requiring_re_ack).toBe(1)
    expect(s.re_ack_pending_count).toBe(1)
    expect(s.all_recipients_acked).toBe(false)
  })
})
