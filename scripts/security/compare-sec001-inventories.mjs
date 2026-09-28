#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

const COLLECTIONS = [
  "relations",
  "policies",
  "routines",
  "triggers",
  "grants",
  "migration_versions",
]

function usage() {
  return [
    "Usage:",
    "  node scripts/security/compare-sec001-inventories.mjs \\",
    "    <repository.json> <hosted.json> [--output <report.md>]",
    "",
    "Both JSON files must be produced by SEC-001-security-inventory.sql.",
    "Raw hosted exports and reports must stay in access-controlled storage.",
  ].join("\n")
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stable(item)]),
    )
  }
  return value
}

function fingerprint(value) {
  return JSON.stringify(stable(value))
}

function objectLabel(collection, item) {
  switch (collection) {
    case "relations":
      return `${item.schema}.${item.name}`
    case "policies":
      return `${item.schema}.${item.relation}.${item.name}`
    case "routines":
      return `${item.schema}.${item.name}(${item.identity_arguments ?? ""})`
    case "triggers":
      return `${item.schema}.${item.relation}.${item.name}`
    case "grants":
      return `${item.object_kind}:${item.schema}.${item.object}:${item.grantee}:${item.privilege}`
    case "migration_versions":
      return `${item.version}:${item.name ?? ""}`
    default:
      return fingerprint(item)
  }
}

function validate(document, source) {
  if (!document || document.format_version !== 1) {
    throw new Error(`${source} is not a SEC-001 format_version 1 inventory`)
  }
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(document[collection])) {
      throw new Error(`${source} is missing array ${collection}`)
    }
  }
}

function compareCollection(collection, expected, actual) {
  const expectedByLabel = new Map(expected.map((item) => [objectLabel(collection, item), item]))
  const actualByLabel = new Map(actual.map((item) => [objectLabel(collection, item), item]))
  const labels = [...new Set([...expectedByLabel.keys(), ...actualByLabel.keys()])].sort()
  const missing = []
  const unexpected = []
  const changed = []

  for (const label of labels) {
    const left = expectedByLabel.get(label)
    const right = actualByLabel.get(label)
    if (!right) missing.push(label)
    else if (!left) unexpected.push(label)
    else if (fingerprint(left) !== fingerprint(right)) changed.push(label)
  }

  return { missing, unexpected, changed }
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|")
}

function renderDetails(title, values) {
  if (values.length === 0) return []
  const shown = values.slice(0, 200)
  const lines = [`#### ${title}`, "", ...shown.map((value) => `- \`${escapeCell(value)}\``)]
  if (values.length > shown.length) {
    lines.push("", `- … ${values.length - shown.length} additional items omitted from this report`)
  }
  return [...lines, ""]
}

function buildReport(repository, hosted, results) {
  const driftCount = Object.values(results).reduce(
    (total, result) => total + result.missing.length + result.unexpected.length + result.changed.length,
    0,
  )
  const lines = [
    "# SEC-001 database security drift report",
    "",
    `**Result:** ${driftCount === 0 ? "PASS — no drift" : `FAIL — ${driftCount} drift item(s)`}`,
    `**Repository export generated:** ${repository.generated_at ?? "unknown"}`,
    `**Hosted export generated:** ${hosted.generated_at ?? "unknown"}`,
    "",
    "The report contains database object identities and drift classifications only. Keep it and both raw exports in access-controlled review storage; do not commit hosted exports.",
    "",
    "| Collection | Repository | Hosted | Missing hosted | Unexpected hosted | Changed |",
    "|---|---:|---:|---:|---:|---:|",
  ]

  for (const collection of COLLECTIONS) {
    const result = results[collection]
    lines.push(
      `| ${collection} | ${repository[collection].length} | ${hosted[collection].length} | ${result.missing.length} | ${result.unexpected.length} | ${result.changed.length} |`,
    )
  }

  lines.push("")
  for (const collection of COLLECTIONS) {
    const result = results[collection]
    const total = result.missing.length + result.unexpected.length + result.changed.length
    if (total === 0) continue
    lines.push(`### ${collection}`, "")
    lines.push(...renderDetails("Missing from hosted", result.missing))
    lines.push(...renderDetails("Unexpected in hosted", result.unexpected))
    lines.push(...renderDetails("Definition differs", result.changed))
  }

  return `${lines.join("\n")}\n`
}

export function compareInventories(repository, hosted) {
  validate(repository, "repository inventory")
  validate(hosted, "hosted inventory")
  return Object.fromEntries(
    COLLECTIONS.map((collection) => [
      collection,
      compareCollection(collection, repository[collection], hosted[collection]),
    ]),
  )
}

function parseArguments(argv) {
  const positional = []
  let output = null
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output") {
      output = argv[index + 1]
      index += 1
    } else {
      positional.push(argv[index])
    }
  }
  if (positional.length !== 2 || (argv.includes("--output") && !output)) {
    throw new Error(usage())
  }
  return { repositoryPath: positional[0], hostedPath: positional[1], output }
}

function main() {
  const { repositoryPath, hostedPath, output } = parseArguments(process.argv.slice(2))
  const repository = JSON.parse(readFileSync(path.resolve(repositoryPath), "utf8"))
  const hosted = JSON.parse(readFileSync(path.resolve(hostedPath), "utf8"))
  const results = compareInventories(repository, hosted)
  const report = buildReport(repository, hosted, results)
  if (output) writeFileSync(path.resolve(output), report, { encoding: "utf8", mode: 0o600 })
  else process.stdout.write(report)

  const driftCount = Object.values(results).reduce(
    (total, result) => total + result.missing.length + result.unexpected.length + result.changed.length,
    0,
  )
  process.exitCode = driftCount === 0 ? 0 : 1
}

if (import.meta.url === `file://${process.argv[1]}`) main()
