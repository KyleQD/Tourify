import { config as loadDotEnv } from "dotenv"

import {
  formatLocalEnvironmentValidationError,
  validateLocalEnvironment,
} from "../../lib/config/environment-contract"

function loadLocalFiles(): void {
  for (const path of [".env.development.local", ".env.local", ".env.development", ".env"]) {
    loadDotEnv({ path, override: false, quiet: true })
  }
}

function main(): void {
  loadLocalFiles()
  const result = validateLocalEnvironment()

  if (!result.valid) {
    console.error(formatLocalEnvironmentValidationError(result))
    process.exitCode = 1
    return
  }

  const notes: string[] = []
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
    notes.push("Sentry is intentionally disabled locally (no DSN configured).")
  }
  if (process.env.RATE_LIMIT_ENFORCE !== "true") {
    notes.push("Distributed rate-limit enforcement is disabled locally; set RATE_LIMIT_ENFORCE=true with Upstash-compatible credentials to run the 429 smoke.")
  }

  console.log("[env-check] Local environment contract passed.")
  for (const note of notes) console.log(`[env-check] ${note}`)
}

main()
