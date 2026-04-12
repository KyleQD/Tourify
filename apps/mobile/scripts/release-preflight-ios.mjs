#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { execSync } from "node:child_process"

const projectRoot = resolve(process.cwd())
const failures = []
const warnings = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

function warn(condition, message) {
  if (!condition) warnings.push(message)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

const packageJsonPath = resolve(projectRoot, "package.json")
const easJsonPath = resolve(projectRoot, "eas.json")
const appConfigPath = resolve(projectRoot, "app.config.ts")

check(existsSync(packageJsonPath), "Missing apps/mobile/package.json")
check(existsSync(easJsonPath), "Missing apps/mobile/eas.json")
check(existsSync(appConfigPath), "Missing apps/mobile/app.config.ts")

if (existsSync(packageJsonPath)) {
  const packageJson = readJson(packageJsonPath)
  const dependencies = packageJson.dependencies || {}
  check(Boolean(dependencies["expo-updates"]), "Dependency expo-updates is required for production OTA/runtime compatibility.")
}

if (existsSync(easJsonPath)) {
  const easJson = readJson(easJsonPath)
  const production = easJson?.build?.production || {}
  check(Boolean(production.channel), "eas.json build.production.channel must be configured.")
}

if (existsSync(appConfigPath)) {
  const appConfigText = readFileSync(appConfigPath, "utf8")
  check(
    appConfigText.includes('runtimeVersion:') && appConfigText.includes('policy: "appVersion"'),
    'app.config.ts must define runtimeVersion policy as "appVersion".'
  )
  check(appConfigText.includes("updates:"), "app.config.ts should define updates configuration.")
}

for (const key of [
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
]) {
  warn(Boolean(process.env[key]), `Environment variable ${key} is not set locally.`)
}

try {
  execSync("npx eas whoami", { cwd: projectRoot, stdio: "pipe", timeout: 15000 })
} catch {
  warnings.push("EAS authentication check failed locally (run: npx eas login). CI with EXPO_TOKEN may still pass.")
}

if (warnings.length) {
  console.log("Preflight warnings:")
  for (const message of warnings) console.log(`- ${message}`)
}

if (failures.length) {
  console.error("Preflight failed:")
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log("iOS release preflight passed.")
