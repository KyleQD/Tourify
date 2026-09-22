#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

export function validateToolchain(input) {
  const failures = []
  const nodeMatch = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(input.nodeVersion || "")
  if (!nodeMatch || Number(nodeMatch[1]) !== 24) {
    failures.push(`Node 24.x is required; received ${input.nodeVersion || "unknown"}`)
  }

  const npmMatch = /^npm\/(\d+\.\d+\.\d+)\s/i.exec(input.userAgent || "")
  if (!npmMatch) {
    failures.push("Commands must run through npm; npm_config_user_agent is missing or not npm")
  } else if (`npm@${npmMatch[1]}` !== input.packageManager) {
    failures.push(
      `npm ${input.packageManager?.replace(/^npm@/, "") || "unknown"} is required; received ${npmMatch[1]}`,
    )
  }

  if (String(input.legacyPeerDeps || "").toLowerCase() === "true") {
    failures.push("legacy-peer-deps is forbidden; resolve the peer dependency set")
  }

  if (!input.lockfileExists) failures.push("package-lock.json is required")
  else if (input.lockfileVersion !== 3) {
    failures.push(`package-lock.json lockfileVersion 3 is required; received ${input.lockfileVersion}`)
  }

  if (input.packageManager !== "npm@11.17.0") {
    failures.push(`packageManager must be npm@11.17.0; received ${input.packageManager || "missing"}`)
  }
  if (input.nodeEngine !== "24.x") {
    failures.push(`engines.node must be 24.x; received ${input.nodeEngine || "missing"}`)
  }
  if (input.npmEngine !== "11.17.0") {
    failures.push(`engines.npm must be 11.17.0; received ${input.npmEngine || "missing"}`)
  }

  return failures
}

function main() {
  const root = process.cwd()
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
  const lockPath = path.join(root, "package-lock.json")
  const lockfileExists = existsSync(lockPath)
  const lockfile = lockfileExists ? JSON.parse(readFileSync(lockPath, "utf8")) : null
  const failures = validateToolchain({
    nodeVersion: process.version,
    userAgent: process.env.npm_config_user_agent,
    legacyPeerDeps: process.env.npm_config_legacy_peer_deps,
    lockfileExists,
    lockfileVersion: lockfile?.lockfileVersion,
    packageManager: packageJson.packageManager,
    nodeEngine: packageJson.engines?.node,
    npmEngine: packageJson.engines?.npm,
  })

  if (failures.length > 0) {
    for (const failure of failures) console.error(`✗ ${failure}`)
    process.exitCode = 1
    return
  }

  console.log(`✓ Node ${process.version}; ${packageJson.packageManager}; lockfile v${lockfile.lockfileVersion}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
