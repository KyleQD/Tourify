#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const cronRoot = path.join(root, "app/api/cron")
const vercelConfig = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"))
const inventory = JSON.parse(readFileSync(path.join(root, "scripts/ci/cron-route-inventory.json"), "utf8"))

function collectRoutes(directory = cronRoot, prefix = "/api/cron") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectRoutes(entryPath, `${prefix}/${entry.name}`)
    return entry.name === "route.ts" ? [{ path: prefix, file: entryPath }] : []
  })
}

function isFiveFieldCron(value) {
  return typeof value === "string" && value.trim().split(/\s+/).length === 5
}

const failures = []
const routes = collectRoutes().sort((left, right) => left.path.localeCompare(right.path))
const scheduled = vercelConfig.crons ?? []
const scheduledPaths = new Set()

for (const job of scheduled) {
  if (typeof job?.path !== "string" || !job.path.startsWith("/api/cron/")) {
    failures.push(`invalid Vercel cron path: ${String(job?.path)}`)
    continue
  }
  if (scheduledPaths.has(job.path)) failures.push(`duplicate Vercel cron path: ${job.path}`)
  scheduledPaths.add(job.path)
  if (!isFiveFieldCron(job.schedule)) failures.push(`invalid five-field cron schedule for ${job.path}`)

  const source = routes.find((route) => route.path === job.path)
  if (!source) {
    failures.push(`scheduled cron route is missing: ${job.path}`)
    continue
  }
  const body = readFileSync(source.file, "utf8")
  if (!body.includes("isAuthorizedCronRequest") && !body.includes("process.env.CRON_SECRET")) {
    failures.push(`scheduled cron route does not visibly require CRON_SECRET: ${job.path}`)
  }
}

for (const route of routes) {
  if (scheduledPaths.has(route.path)) continue
  const deferred = inventory.unscheduled?.[route.path]
  if (!deferred?.owner || !deferred?.reason || !deferred?.next_action) {
    failures.push(`unscheduled cron route lacks an explicit local inventory entry: ${route.path}`)
  }
}

for (const deferredPath of Object.keys(inventory.unscheduled ?? {})) {
  if (!routes.some((route) => route.path === deferredPath)) {
    failures.push(`inventory references a missing cron route: ${deferredPath}`)
  }
  if (scheduledPaths.has(deferredPath)) {
    failures.push(`inventory marks a scheduled route as unscheduled: ${deferredPath}`)
  }
}

if (failures.length > 0) {
  console.error(`Cron route inventory failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(`Cron route inventory passed: ${scheduled.length} scheduled, ${routes.length - scheduled.length} explicitly deferred.`)
}
