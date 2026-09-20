import { readFileSync } from "fs"
import { resolve } from "path"

const routePaths = [
  "app/api/marketplace/integrations/printful/webhook/route.ts",
  "app/api/marketplace/integrations/shopify/webhook/route.ts",
  "app/api/webhooks/music-marketplace/[partner]/route.ts",
  "app/api/institutional/partners/webhooks/[provider]/route.ts",
  "app/api/licensing/partners/webhooks/[provider]/route.ts",
  "app/api/rights-admin/partners/webhooks/[provider]/route.ts",
] as const

const deferredRoutePaths = [
  "app/api/webhooks/music-marketplace/[partner]/route.ts",
  "app/api/institutional/partners/webhooks/[provider]/route.ts",
  "app/api/licensing/partners/webhooks/[provider]/route.ts",
  "app/api/rights-admin/partners/webhooks/[provider]/route.ts",
  "app/api/webhooks/music-royalty-payouts/route.ts",
] as const

describe("route-local webhook contracts", () => {
  it.each(routePaths)("claims before processing and completes %s", (routePath) => {
    const source = readFileSync(resolve(process.cwd(), routePath), "utf8")

    expect(source).toMatch(/verify(?:[A-Z]|Partner|Printful|Shopify)/)
    expect(source).toContain(".insert(")
    expect(source).toMatch(/23505|duplicate key/)
    expect(source).toContain("processed_at")
    expect(source).toMatch(/status: [\"']processed[\"']|processed_at: new Date\(\)/)
  })

  it("does not synthesize Shopify event ids from wall-clock time", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/api/marketplace/integrations/shopify/webhook/route.ts"),
      "utf8",
    )

    expect(source).not.toContain("Date.now()")
    expect(source).toContain('x-shopify-webhook-id')
  })

  it("uses the notification delivery log as the Supabase webhook dedupe boundary", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/api/webhooks/supabase/notifications/route.ts"),
      "utf8",
    )

    expect(source).toContain("notification_delivery_log")
    expect(source).toContain("duplicate: true")
    expect(source).toContain("timingSafeEqual")
  })

  it.each(deferredRoutePaths)("fails closed behind the advanced webhook release gate: %s", (routePath) => {
    const source = readFileSync(resolve(process.cwd(), routePath), "utf8")

    expect(source).toContain('isAuditFeatureApproved("advanced_webhooks")')
    expect(source).toContain('auditFeatureUnavailable("advanced_webhooks")')
  })

  it("does not expose provider or database failure details from the Stripe marketplace webhook", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/marketplace/webhook/route.ts"), "utf8")
    const processor = readFileSync(resolve(process.cwd(), "lib/marketplace/webhook-processor.ts"), "utf8")

    expect(route).toContain("WEBHOOK_PROCESSING_FAILED")
    expect(route).not.toContain("message: result.message")
    expect(processor).toContain("last_error: 'internal_error'")
    expect(processor).toContain("WEBHOOK_PROCESSING_FAILED")
  })
})
