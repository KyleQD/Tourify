import { readFileSync } from "fs"
import { resolve } from "path"

const routes = [
  ["app/api/subscriptions/webhook/route.ts", "STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS"],
  ["app/api/ticketing/webhook/route.ts", "STRIPE_WEBHOOK_SECRET_TICKETING"],
  ["app/api/photos/purchase/webhook/route.ts", "STRIPE_WEBHOOK_SECRET_PHOTOS"],
  ["app/api/marketplace/webhook/route.ts", "STRIPE_WEBHOOK_SECRET_MARKETPLACE"],
  ["app/api/webhooks/music-royalty-payouts/route.ts", "STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES"],
] as const

describe("Stripe webhook secret boundaries", () => {
  it.each(routes)("uses only the dedicated endpoint secret for %s", (routePath, secretName) => {
    const source = readFileSync(resolve(process.cwd(), routePath), "utf8")

    expect(source).toContain(`process.env.${secretName}`)
    expect(source).not.toMatch(/process\.env\.STRIPE_WEBHOOK_SECRET(?!_)/)
  })
})
