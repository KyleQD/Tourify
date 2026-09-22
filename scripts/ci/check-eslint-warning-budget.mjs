import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
const BASELINE_PATH = path.join(ROOT, "config/quality/eslint-warning-baseline.json")
const EXCEPTIONS_PATH = path.join(ROOT, "config/quality/eslint-warning-exceptions.json")
const GOVERNED_PATHS = [
  "app/admin",
  "app/api/admin",
  "components/admin",
  "lib/admin",
  "lib/testing/admin-feature-factory.ts",
  "lib/testing/admin-feature-scenarios.ts",
  "lib/testing/rls-persona-matrix.ts",
  "__tests__/admin",
  "__tests__/ci",
  "scripts/ci",
]

function warningKey(filePath, ruleId) {
  return `${filePath}::${ruleId || "eslint/internal"}`
}

export function normalizeEslintResults(results, root = ROOT) {
  const warnings = {}
  const errors = []
  for (const result of results) {
    const file = path.relative(root, result.filePath).split(path.sep).join("/")
    for (const message of result.messages || []) {
      if (message.severity === 2) {
        errors.push({ file, ruleId: message.ruleId || "eslint/internal", message: message.message })
        continue
      }
      if (message.severity !== 1) continue
      const key = warningKey(file, message.ruleId)
      warnings[key] = (warnings[key] || 0) + 1
    }
  }
  return {
    warnings: Object.fromEntries(Object.entries(warnings).sort(([a], [b]) => a.localeCompare(b))),
    errors,
  }
}

export function validateExceptions(exceptions, today = new Date().toISOString().slice(0, 10)) {
  const issues = []
  for (const [index, exception] of exceptions.entries()) {
    const label = `exceptions[${index}]`
    for (const field of ["path", "ruleId", "owner", "rationale", "issue", "expiresOn"]) {
      if (!String(exception[field] || "").trim()) issues.push(`${label}.${field} is required`)
    }
    if (!Number.isInteger(exception.allowedCount) || exception.allowedCount < 1) {
      issues.push(`${label}.allowedCount must be a positive integer`)
    }
    if (exception.expiresOn && exception.expiresOn < today) {
      issues.push(`${label} expired on ${exception.expiresOn}`)
    }
  }
  return issues
}

export function compareWarningBudget({ current, baseline, exceptions = [] }) {
  const exceptionAllowance = new Map()
  for (const exception of exceptions) {
    const key = warningKey(exception.path, exception.ruleId)
    exceptionAllowance.set(key, (exceptionAllowance.get(key) || 0) + exception.allowedCount)
  }

  const growth = []
  for (const [key, count] of Object.entries(current)) {
    const allowed = (baseline[key] || 0) + (exceptionAllowance.get(key) || 0)
    if (count > allowed) growth.push({ key, baseline: baseline[key] || 0, current: count, allowed })
  }
  return growth.sort((a, b) => a.key.localeCompare(b.key))
}

function runEslint() {
  const eslintBin = path.join(ROOT, "node_modules/eslint/bin/eslint.js")
  const result = spawnSync(
    process.execPath,
    [eslintBin, ...GOVERNED_PATHS, "--format", "json", "--no-warn-ignored"],
    {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 200 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
    },
  )
  if (result.error) throw result.error
  if (!result.stdout?.trim()) {
    throw new Error(result.stderr?.trim() || `ESLint exited ${result.status} without JSON output.`)
  }
  return JSON.parse(result.stdout)
}

function warningCount(entries) {
  return Object.values(entries).reduce((sum, count) => sum + count, 0)
}

function adminWarningCount(entries) {
  return Object.entries(entries)
    .filter(([key]) => /^(app\/admin|app\/api\/admin|components\/admin|lib\/admin|__tests__\/admin)\//.test(key))
    .reduce((sum, [, count]) => sum + count, 0)
}

function main() {
  const writeBaseline = process.argv.includes("--write-baseline")
  const normalized = normalizeEslintResults(runEslint())
  if (normalized.errors.length > 0) {
    console.error(`[eslint-budget] ${normalized.errors.length} ESLint error(s) must be fixed; errors are never baselined.`)
    for (const error of normalized.errors.slice(0, 30)) {
      console.error(`- ${error.file} [${error.ruleId}] ${error.message}`)
    }
    process.exitCode = 1
    return
  }

  if (writeBaseline) {
    const document = {
      schemaVersion: 1,
      scope: "admin-and-ci",
      governedPaths: GOVERNED_PATHS,
      warnings: normalized.warnings,
    }
    writeFileSync(BASELINE_PATH, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o644 })
    console.log(
      `[eslint-budget] Wrote ${warningCount(normalized.warnings)} warnings (${adminWarningCount(normalized.warnings)} Admin) to ${path.relative(ROOT, BASELINE_PATH)}.`,
    )
    return
  }

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  const exceptionDocument = JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8"))
  const exceptionIssues = validateExceptions(exceptionDocument.exceptions || [])
  if (exceptionIssues.length > 0) {
    console.error("[eslint-budget] Invalid or expired warning exceptions:")
    for (const issue of exceptionIssues) console.error(`- ${issue}`)
    process.exitCode = 1
    return
  }

  const growth = compareWarningBudget({
    current: normalized.warnings,
    baseline: baseline.warnings || {},
    exceptions: exceptionDocument.exceptions || [],
  })
  if (growth.length > 0) {
    console.error(`[eslint-budget] Warning budget grew in ${growth.length} path/rule tuple(s):`)
    for (const item of growth.slice(0, 50)) {
      console.error(`- ${item.key}: baseline ${item.baseline}, current ${item.current}, allowed ${item.allowed}`)
    }
    process.exitCode = 1
    return
  }

  console.log(
    `[eslint-budget] No warning growth: ${warningCount(normalized.warnings)} current (${adminWarningCount(normalized.warnings)} Admin), ${warningCount(baseline.warnings || {})} baseline.`,
  )
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main()
