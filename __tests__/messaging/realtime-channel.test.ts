import { describe, expect, it, vi } from "vitest"

import { getMessagingRealtimeTopic } from "@/lib/messaging/realtime-channel"

describe("messaging realtime topics", () => {
  it("does not expose the conversation id and remains stable", () => {
    vi.stubEnv("SUPABASE_REALTIME_CHANNEL_SECRET", "test-secret")

    const first = getMessagingRealtimeTopic("00000000-0000-0000-0000-000000000001")
    const second = getMessagingRealtimeTopic("00000000-0000-0000-0000-000000000001")

    expect(first).toBe(second)
    expect(first).toMatch(/^messages:[a-f0-9]{64}$/)
    expect(first).not.toContain("00000000-0000-0000-0000-000000000001")
  })
})
