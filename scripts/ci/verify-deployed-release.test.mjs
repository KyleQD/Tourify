import assert from "node:assert/strict"
import test from "node:test"

import { verifyDeployedRelease } from "./verify-deployed-release.mjs"

const valid = {
  environment: "staging",
  deploymentUrl: "https://tourify-abc.vercel.app",
  releaseSha: "a".repeat(40),
  supabaseUrl: "https://staging-ref.supabase.co",
  stripeMode: "test",
}

const headers = {
  "x-tourify-release-sha": valid.releaseSha,
  "x-tourify-deployment-id": "dpl_staging123",
  "x-tourify-supabase-origin": valid.supabaseUrl,
  "x-tourify-stripe-mode": "test",
}

test("requires the deployment URL and staging alias to serve one exact release", async () => {
  const targets = []
  const id = await verifyDeployedRelease(valid, async (url) => {
    targets.push(url)
    return new Response("ok", { status: 200, headers })
  })
  assert.equal(id, "dpl_staging123")
  assert.deepEqual(targets, ["https://tourify-abc.vercel.app/api/health", "https://demo.tourify.live/api/health"])
})

test("rejects an alias serving a different deployment", async () => {
  await assert.rejects(verifyDeployedRelease(valid, async (url) => new Response("ok", {
    status: 200,
    headers: { ...headers, "x-tourify-deployment-id": url.includes("demo.tourify.live") ? "dpl_other" : "dpl_staging123" },
  })), /alias does not serve/)
})

test("rejects missing release metadata and non-test payment mode", async () => {
  await assert.rejects(verifyDeployedRelease(valid, async () => new Response("ok", {
    status: 200,
    headers: { ...headers, "x-tourify-release-sha": "" },
  })), /release SHA is absent/)
  await assert.rejects(verifyDeployedRelease(valid, async () => new Response("ok", {
    status: 200,
    headers: { ...headers, "x-tourify-stripe-mode": "live" },
  })), /Stripe mode is absent/)
})
