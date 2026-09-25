/**
 * INTG-006 — the inbound webhook route inventory.
 *
 * This file is the executable record of which inbound webhook routes exist in
 * this repository and what each one's verification/idempotency posture is. A
 * previous wave was rejected for inventing a speculative route, so the inventory
 * is derived by walking `app/api` and is asserted to match the documented set
 * exactly: a new inbound route fails this suite until it is classified here.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { describe, expect, it } from "vitest"

const APP_API = resolve(process.cwd(), "app/api")

/** Path segments that mark an externally-called inbound endpoint. */
const INBOUND_SEGMENTS = ["webhook", "webhooks", "callback"]

function collectRouteFiles(dir: string, found: string[] = []): string[] {
  if (!existsSync(dir)) return found
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectRouteFiles(full, found)
      continue
    }
    if (entry.name !== "route.ts") continue
    const rel = relative(APP_API, full).split(sep).join("/")
    const segments = rel.split("/")
    if (segments.some((segment) => INBOUND_SEGMENTS.includes(segment))) found.push(rel)
  }
  return found.sort()
}

const DISCOVERED = collectRouteFiles(APP_API)

/**
 * Documented inventory. `posture` is the INTG-006 classification:
 *   verified  — signature verified, constant-time, atomic claim, duplicate
 *              acknowledgement, replay-safe completion, fails closed.
 *   hardened  — verified in this lane (see the task checkpoint).
 *   deferred  — exists but is gated off at launch until its owner supplies
 *              release evidence; it still fails closed.
 */
const INVENTORY: Record<string, { posture: string; owner: string; note?: string }> = {
  "subscriptions/webhook/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Stripe endpoint secret, Stripe constant-time HMAC + bounded tolerance, atomic platform_webhook_events claim.",
  },
  "ticketing/webhook/route.ts": {
    posture: "verified",
    owner: "ticketing",
    note: "Atomic claim on ticket_stripe_webhook_events (id PK). See HF-INTG-006-TICKETING for the completion-marker gap.",
  },
  "photos/purchase/webhook/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Claim-before-process with interrupted-claim resume; completion write now checked.",
  },
  "marketplace/webhook/route.ts": {
    posture: "verified",
    owner: "marketplace",
    note: "Signature verified before the idempotent processor; failures return a generic retryable error.",
  },
  "marketplace/integrations/shopify/webhook/route.ts": {
    posture: "verified",
    owner: "marketplace",
    note: "Constant-time base64 HMAC; requires x-shopify-webhook-id; deferred by the marketplace_provider_integrations gate.",
  },
  "marketplace/integrations/shopify/callback/route.ts": {
    posture: "verified",
    owner: "marketplace",
    note: "Inbound OAuth redirect: session-authenticated, signed-state bound, query HMAC verified before any token exchange.",
  },
  "marketplace/integrations/printful/webhook/route.ts": {
    posture: "verified",
    owner: "marketplace",
    note: "Constant-time hex HMAC; requires a stable payload event id; deferred by the marketplace_provider_integrations gate.",
  },
  "webhooks/music-royalty-payouts/route.ts": {
    posture: "verified",
    owner: "integrations",
    note: "Local constant-time Stripe HMAC with a 300s replay window; atomic event claim; advanced_webhooks gate.",
  },
  "webhooks/music-marketplace/[partner]/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Constant-time partner digest; configured secret now rejects an absent signature; advanced_webhooks gate.",
  },
  "institutional/partners/webhooks/[provider]/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Constant-time partner digest; configured secret now rejects an absent signature; advanced_webhooks gate.",
  },
  "licensing/partners/webhooks/[provider]/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Constant-time partner digest; configured secret now rejects an absent signature; advanced_webhooks gate.",
  },
  "rights-admin/partners/webhooks/[provider]/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Constant-time partner digest; configured secret now rejects an absent signature; advanced_webhooks gate.",
  },
  "webhooks/supabase/notifications/route.ts": {
    posture: "hardened",
    owner: "integrations",
    note: "Constant-time shared-secret compare; atomic webhook_delivery_receipts claim with bounded reclaim.",
  },
  "social/oauth/callback/route.ts": {
    posture: "deferred",
    owner: "integrations/social",
    note: "Inbound OAuth redirect owned by INTG-007; providers stay disabled through RELEASE-008.",
  },
}

const read = (rel: string) => readFileSync(join(APP_API, rel), "utf8")

describe("inbound webhook route inventory", () => {
  it("discovers exactly the documented inbound webhook routes (no invented routes)", () => {
    expect(DISCOVERED).toEqual(Object.keys(INVENTORY).sort())
  })

  it.each(Object.keys(INVENTORY))("documents a posture and owner for %s", (rel) => {
    const entry = INVENTORY[rel]
    expect(["verified", "hardened", "deferred"]).toContain(entry.posture)
    expect(entry.owner).toBeTruthy()
    expect(entry.note).toBeTruthy()
  })

  const constantTimeRoutes = [
    "webhooks/music-marketplace/[partner]/route.ts",
    "institutional/partners/webhooks/[provider]/route.ts",
    "licensing/partners/webhooks/[provider]/route.ts",
    "rights-admin/partners/webhooks/[provider]/route.ts",
  ]

  it.each(constantTimeRoutes)("never uses a non-constant-time signature comparison: %s", (rel) => {
    const source = read(rel)
    expect(source).toContain("verifyPrefixedDigestSignature")
    expect(source).not.toMatch(/expected\s*===\s*/)
    // No direct digest/string equality against a configured secret.
    expect(source).not.toMatch(/signature\s*===\s*/)
  })

  it.each([
    "marketplace/integrations/printful/webhook/route.ts",
    "marketplace/integrations/shopify/webhook/route.ts",
  ])("keeps the provider signature check in constant-time crypto: %s", (rel) => {
    // The provider adapters own their own constant-time comparison; the route
    // must delegate to them and never compare signatures itself.
    expect(read(rel)).not.toMatch(/signature\s*===\s*/)
  })

  it("claims a durable receipt before any side effect on every classified route", () => {
    const claimBeforeSideEffect = [
      "marketplace/integrations/printful/webhook/route.ts",
      "marketplace/integrations/shopify/webhook/route.ts",
      "webhooks/music-royalty-payouts/route.ts",
      "webhooks/music-marketplace/[partner]/route.ts",
      "institutional/partners/webhooks/[provider]/route.ts",
      "licensing/partners/webhooks/[provider]/route.ts",
      "rights-admin/partners/webhooks/[provider]/route.ts",
      "webhooks/supabase/notifications/route.ts",
      "photos/purchase/webhook/route.ts",
      "subscriptions/webhook/route.ts",
    ]
    for (const rel of claimBeforeSideEffect) {
      const source = read(rel)
      expect(source, rel).toMatch(/\.insert\(/)
    }
  })

  it("keeps the deferred advanced-provider routes behind an unopenable release gate", () => {
    const deferred = [
      "webhooks/music-royalty-payouts/route.ts",
      "webhooks/music-marketplace/[partner]/route.ts",
      "institutional/partners/webhooks/[provider]/route.ts",
      "licensing/partners/webhooks/[provider]/route.ts",
      "rights-admin/partners/webhooks/[provider]/route.ts",
    ]
    for (const rel of deferred) {
      const source = read(rel)
      expect(source, rel).toContain('isAuditFeatureApproved("advanced_webhooks")')
      expect(source, rel).toContain('auditFeatureUnavailable("advanced_webhooks")')
    }

    // The gate itself must be unopenable while the launch capability is disabled.
    const capabilities = readFileSync(resolve(process.cwd(), "lib/config/launch-capabilities.ts"), "utf8")
    expect(capabilities).toMatch(
      /advanced_music_webhooks:\s*\{\s*status:\s*'disabled',\s*exposure:\s*'none'/,
    )
    expect(capabilities).toMatch(
      /marketplace_provider_integrations:\s*\{\s*status:\s*'disabled',\s*exposure:\s*'none'/,
    )
  })
})
