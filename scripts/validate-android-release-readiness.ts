import fs from "node:fs"
import path from "node:path"

interface CheckResult {
  label: string
  ok: boolean
  detail: string
}

function resolveFromRepo(relativePath: string) {
  return path.resolve(process.cwd(), relativePath)
}

function hasFile(relativePath: string) {
  return fs.existsSync(resolveFromRepo(relativePath))
}

function readJsonFile<T>(relativePath: string): T | null {
  const fullPath = resolveFromRepo(relativePath)
  if (!fs.existsSync(fullPath)) return null
  const raw = fs.readFileSync(fullPath, "utf8")
  return JSON.parse(raw) as T
}

function checkWorkflows(): CheckResult[] {
  const required = [
    ".github/workflows/android-ota-production.yml",
    ".github/workflows/android-native-release.yml",
  ]

  return required.map(filePath => ({
    label: `workflow:${filePath}`,
    ok: hasFile(filePath),
    detail: hasFile(filePath) ? "present" : "missing",
  }))
}

function checkDocs(): CheckResult[] {
  const required = [
    "apps/mobile/docs/android-setup.md",
    "apps/mobile/docs/android-release-policy.md",
    "apps/mobile/docs/release-checklist.md",
  ]

  return required.map(filePath => ({
    label: `docs:${filePath}`,
    ok: hasFile(filePath),
    detail: hasFile(filePath) ? "present" : "missing",
  }))
}

function checkMobilePackageScripts(): CheckResult[] {
  interface PackageJsonShape {
    scripts?: Record<string, string>
  }

  const packageJson = readJsonFile<PackageJsonShape>("apps/mobile/package.json")
  if (!packageJson?.scripts)
    return [
      {
        label: "mobile-scripts",
        ok: false,
        detail: "apps/mobile/package.json scripts not found",
      },
    ]

  const requiredScripts = [
    "ota:production:android",
    "android:build:production",
    "android:submit:production",
  ]

  return requiredScripts.map(scriptName => ({
    label: `mobile-script:${scriptName}`,
    ok: Boolean(packageJson.scripts?.[scriptName]),
    detail: packageJson.scripts?.[scriptName] || "missing",
  }))
}

function checkAssetLinksRoute(): CheckResult {
  const routePath = "app/.well-known/assetlinks.json/route.ts"
  return {
    label: `route:${routePath}`,
    ok: hasFile(routePath),
    detail: hasFile(routePath) ? "present" : "missing",
  }
}

function checkOptionalEnvHints(): CheckResult[] {
  const optional = [
    "ANDROID_APP_SHA256_CERT_FINGERPRINTS",
    "EXPO_TOKEN",
    "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
  ]

  return optional.map(envKey => {
    const hasValue = Boolean(process.env[envKey])
    return {
      label: `env:${envKey}`,
      ok: hasValue,
      detail: hasValue ? "set in current shell" : "not set (ok for local dry-run)",
    }
  })
}

function format(result: CheckResult) {
  const icon = result.ok ? "PASS" : "FAIL"
  return `${icon} ${result.label} - ${result.detail}`
}

function main() {
  const hardChecks = [
    ...checkWorkflows(),
    ...checkDocs(),
    ...checkMobilePackageScripts(),
    checkAssetLinksRoute(),
  ]
  const optionalChecks = checkOptionalEnvHints()

  console.log("Android release readiness (offline)")
  console.log("")
  for (const result of hardChecks) console.log(format(result))
  console.log("")
  console.log("Credential hints")
  for (const result of optionalChecks) console.log(format(result))

  const hasFailure = hardChecks.some(result => !result.ok)
  if (hasFailure) {
    console.error("")
    console.error("One or more required offline readiness checks failed.")
    process.exit(1)
  }

  console.log("")
  console.log("Offline Android release readiness checks passed.")
}

main()
