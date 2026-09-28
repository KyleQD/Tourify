import "server-only"

import { createHmac } from "node:crypto"

/**
 * Return an opaque, stable topic for a conversation.
 *
 * The conversation id is deliberately not exposed as the Realtime topic. The
 * API route authenticates membership before returning this value, while the
 * message rows themselves remain protected by the existing RLS policies.
 */
export function getMessagingRealtimeTopic(conversationId: string): string {
  const secret =
    process.env.SUPABASE_REALTIME_CHANNEL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET

  if (!secret) {
    throw new Error("Missing realtime channel secret")
  }

  const digest = createHmac("sha256", secret).update(conversationId).digest("hex")
  return `messages:${digest}`
}
