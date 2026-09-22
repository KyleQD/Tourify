import { config as loadDotEnv } from "dotenv"
import {
  formatEnvironmentValidationError,
  validateProductionEnvironment,
  type EnvironmentPhase,
} from "../../lib/config/environment-contract"

function requestedPhase(args: string[]): EnvironmentPhase {
  const phaseIndex = args.indexOf("--phase")
  const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : undefined
  if (phase === "build" || phase === "runtime") return phase
  throw new Error("Usage: tsx scripts/ci/validate-production-env.ts --phase build|runtime")
}

function loadProductionFiles(): void {
  for (const path of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    loadDotEnv({ path, override: false, quiet: true })
  }
}

function main(): void {
  const phase = requestedPhase(process.argv.slice(2))
  loadProductionFiles()
  const result = validateProductionEnvironment(phase)

  if (!result.valid) {
    console.error(formatEnvironmentValidationError(phase, result))
    process.exitCode = 1
    return
  }

  console.log(`[env-check] Production ${phase} environment contract passed.`)
}

main()
