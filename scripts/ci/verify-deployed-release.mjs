#!/usr/bin/env node

import { appendFileSync } from "node:fs"

const DOMAINS = {
  staging: ["https://demo.tourify.live"],
  production: ["https://tourify.live", "https://www.tourify.live"],
}

function origin(value, label) {
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error(`${label} must be a clean HTTPS origin`)
  return url.origin
}

export async function verifyDeployedRelease(input, fetcher = fetch) {
  const domains = DOMAINS[input.environment]
  if (!domains) throw new Error("Deployment environment must be staging or production")
  if (!/^[a-f0-9]{40}$/i.test(input.releaseSha || "")) throw new Error("Release SHA must be a full Git commit SHA")
  const deploymentOrigin = origin(input.deploymentUrl, "Deployment URL")
  const databaseOrigin = origin(input.supabaseUrl, "Expected Supabase URL")
  if (input.stripeMode !== "test" && input.stripeMode !== "live") throw new Error("Expected Stripe mode is required")
  let deploymentId
  for (const target of [deploymentOrigin, ...domains]) {
    const response = await fetcher(`${target}/api/health`, {
      redirect: "manual",
      cache: "no-store",
      headers: input.bypassSecret ? { "x-vercel-protection-bypass": input.bypassSecret } : {},
    })
    if (response.status !== 200) throw new Error(`${target} health probe returned ${response.status}`)
    const sha = response.headers.get("x-tourify-release-sha")
    const id = response.headers.get("x-tourify-deployment-id")
    const db = response.headers.get("x-tourify-supabase-origin")
    const stripe = response.headers.get("x-tourify-stripe-mode")
    if (sha?.toLowerCase() !== input.releaseSha.toLowerCase()) throw new Error(`${target} release SHA is absent or mismatched`)
    if (!/^dpl_[A-Za-z0-9]+$/.test(id || "")) throw new Error(`${target} lacks a Vercel-generated deployment ID`)
    if (db !== databaseOrigin) throw new Error(`${target} Supabase origin is absent or mismatched`)
    if (stripe !== input.stripeMode) throw new Error(`${target} Stripe mode is absent or mismatched`)
    if (deploymentId && id !== deploymentId) throw new Error(`${target} alias does not serve the exact deployment`)
    deploymentId = id
  }
  return deploymentId
}

async function main() {
  const id = await verifyDeployedRelease({
    environment: process.argv[2],
    deploymentUrl: process.env.DEPLOYMENT_URL,
    releaseSha: process.env.RELEASE_SHA,
    supabaseUrl: process.env.EXPECTED_SUPABASE_URL,
    stripeMode: process.env.EXPECTED_STRIPE_MODE,
    bypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
  })
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deployment_id=${id}\n`)
  console.log(`Verified ${process.argv[2]} deployment ${id}, exact SHA, database origin, Stripe mode, and aliases`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
