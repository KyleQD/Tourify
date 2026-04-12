/**
 * Marketplace smoke test
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 AUTH_BEARER_TOKEN=... npx tsx scripts/marketplace-smoke-test.ts
 * Optional:
 *   TEST_LISTING_ID=<uuid> TEST_VARIANT_ID=<uuid>
 */

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

async function apiFetch({
  baseUrl,
  token,
  path,
  method = "GET",
  body,
}: {
  baseUrl: string
  token: string
  path: string
  method?: "GET" | "POST"
  body?: Record<string, unknown>
}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

async function run() {
  const baseUrl = getRequiredEnv("BASE_URL").replace(/\/$/, "")
  const token = getRequiredEnv("AUTH_BEARER_TOKEN")

  console.log("Running marketplace smoke test")
  console.log(`Base URL: ${baseUrl}`)

  const preview = await apiFetch({
    baseUrl,
    token,
    path: "/api/marketplace/migrations/backfill-artist-merch",
  })
  console.log("[1/4] Backfill preview:", preview.status, preview.ok ? "ok" : "failed")
  if (!preview.ok) {
    console.error(preview.json)
    process.exit(1)
  }

  const dryRun = await apiFetch({
    baseUrl,
    token,
    path: "/api/marketplace/migrations/backfill-artist-merch",
    method: "POST",
    body: { dryRun: true, publishActiveItems: true },
  })
  console.log("[2/4] Backfill dry run:", dryRun.status, dryRun.ok ? "ok" : "failed")
  if (!dryRun.ok) {
    console.error(dryRun.json)
    process.exit(1)
  }

  const discover = await apiFetch({
    baseUrl,
    token,
    path: "/api/marketplace/discover?limit=5",
  })
  console.log("[3/4] Marketplace discover:", discover.status, discover.ok ? "ok" : "failed")
  if (!discover.ok) {
    console.error(discover.json)
    process.exit(1)
  }

  const testListingId = process.env.TEST_LISTING_ID
  if (!testListingId) {
    console.log("[4/4] Checkout skipped (set TEST_LISTING_ID to run checkout smoke)")
    process.exit(0)
  }

  const checkout = await apiFetch({
    baseUrl,
    token,
    path: "/api/marketplace/checkout",
    method: "POST",
    body: {
      lines: [
        {
          listingId: testListingId,
          variantId: process.env.TEST_VARIANT_ID || undefined,
          quantity: 1,
        },
      ],
    },
  })

  console.log("[4/4] Marketplace checkout:", checkout.status, checkout.ok ? "ok" : "failed")
  if (!checkout.ok) {
    console.error(checkout.json)
    process.exit(1)
  }

  console.log("Smoke test completed successfully.")
}

run().catch(error => {
  console.error("Marketplace smoke test failed:", error)
  process.exit(1)
})

export {}
