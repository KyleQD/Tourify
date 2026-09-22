import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { upsertMessageById } from "@/lib/messaging/realtime-state"

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("realtime message delivery state", () => {
  it("deduplicates POST and Realtime delivery by message id", () => {
    const first = { id: "message-1", content: "first", read_at: null }

    expect(upsertMessageById([], first)).toEqual([first])
    expect(upsertMessageById([first], { ...first, content: "updated" })).toEqual([
      { ...first, content: "updated" },
    ])
  })

  it("recovers missed rows after a channel reconnects", () => {
    const client = readSource("app/messages/messages-page-client.tsx")
    const subscribedBranch = client.slice(
      client.indexOf("subscriptionStatus === 'SUBSCRIBED'"),
      client.indexOf("subscriptionStatus === 'CHANNEL_ERROR'"),
    )

    expect(subscribedBranch).toContain("await fetchMessages(selectedConversation)")
    expect(client).toContain("upsertMessageById(prev, delivered)")
    expect(client).toContain("!lastMessage.is_read")
  })
})

describe("conversation membership non-disclosure", () => {
  it("returns the same not-found response for missing and unauthorized conversations", () => {
    const routePaths = [
      "app/api/messages/route.ts",
      "app/api/messages/[conversationId]/realtime/route.ts",
      "app/api/messages/[conversationId]/accept/route.ts",
      "app/api/messages/[conversationId]/context/route.ts",
      "app/api/messages/[conversationId]/decline/route.ts",
    ]

    for (const routePath of routePaths) {
      const source = readSource(routePath)
      const membershipBranch = source.slice(
        source.indexOf("if (!isConversationParticipant"),
        source.indexOf("if (!isConversationParticipant") + 240,
      )

      expect(membershipBranch, routePath).toContain("Conversation not found")
      expect(membershipBranch, routePath).toContain("status: 404")
      expect(membershipBranch, routePath).not.toContain("Forbidden")
    }
  })

  it("keeps message inserts and updates protected by active RLS predicates", () => {
    const migration = readSource("supabase/migrations/20260823160000_messaging_isolation.sql")

    expect(migration).toContain("auth.uid() = sender_id")
    expect(migration).toContain("auth.uid() IN (c.participant_1, c.participant_2)")
    expect(migration).toContain("CREATE POLICY messages_update_author_only")
    expect(migration).toContain("Realtime (postgres_changes) inherits")
  })
})
