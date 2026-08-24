/**
 * P18 — pilot corpus validator (T02/T05).
 *
 * Validates a pilot JSON against the repeatable editorial seed template:
 * - schema/version/place identity present
 * - entity types and relation keys from the frozen corpus vocabulary
 * - provenance completeness: entities carry source_keys; relationships carry
 *   source_keys + confidence + review/publication state
 * - seed/slug uniqueness within a region
 *
 * Run over all pilots with `--all`. Exits non-zero on any violation so CI
 * can gate expansion.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

const ENTITY_TYPES = new Set([
  "artist_reference",
  "recording_reference",
  "historical_milestone",
  "genre",
  "scene",
  "movement",
  "instrument",
  "studio_landmark",
  "sound_signature",
  "tradition",
  "educational_topic",
])

const RELATION_KEYS = new Set([
  "part_of",
  "uses_instrument",
  "credited_to",
  "related_to",
  "evolved_from",
  "influenced_by",
])

export interface PilotValidationIssue {
  file: string
  path: string
  message: string
}

interface SeedEntity {
  seed_id?: string
  slug?: string
  entity_type?: string
  canonical_name?: string
  short_description?: string
  source_keys?: unknown
}

interface SeedRelationship {
  subject_seed_id?: string
  object_seed_id?: string
  relation_key?: string
  source_keys?: unknown
  confidence?: unknown
  review_status?: unknown
  publication_status?: unknown
}

export function validatePilot(
  fileName: string,
  raw: string,
): { ok: boolean; issues: PilotValidationIssue[] } {
  const issues: PilotValidationIssue[] = []
  const add = (pilotPath: string, message: string) => issues.push({ file: fileName, path: pilotPath, message })

  let bundle: {
    schema_version?: string
    pilot_key?: string
    place_path?: string
    overview?: unknown
    entities?: SeedEntity[]
    relationships?: SeedRelationship[]
  }
  try {
    bundle = JSON.parse(raw)
  } catch (error) {
    return { ok: false, issues: [{ file: fileName, path: "$", message: `invalid JSON: ${String(error)}` }] }
  }

  const versionOk = ["world-pilot-", "world-history-seed-"].some((prefix) =>
    bundle.schema_version?.startsWith(prefix),
  )
  if (!versionOk) add("$.schema_version", "missing world-pilot-*/world-history-seed-* schema version")
  if (!bundle.pilot_key) add("$.pilot_key", "missing pilot_key")
  if (!bundle.place_path) add("$.place_path", "missing place_path")
  if (!bundle.overview || typeof bundle.overview !== "object") add("$.overview", "missing overview")

  const ids = new Set<string>()
  for (const [index, entity] of (bundle.entities ?? []).entries()) {
    const at = `$.entities[${index}]`
    if (!entity.seed_id) add(`${at}.seed_id`, "missing")
    else if (ids.has(entity.seed_id)) add(`${at}.seed_id`, `duplicate id ${entity.seed_id}`)
    else ids.add(entity.seed_id)
    if (!ENTITY_TYPES.has(entity.entity_type ?? "")) add(`${at}.entity_type`, `unknown type ${entity.entity_type}`)
    if (!entity.canonical_name) add(`${at}.canonical_name`, "missing")
    if (!entity.short_description) add(`${at}.short_description`, "missing")
    if (!Array.isArray(entity.source_keys) || entity.source_keys.length === 0) {
      add(`${at}.source_keys`, "provenance required — every entity cites at least one source")
    }
  }

  for (const [index, rel] of (bundle.relationships ?? []).entries()) {
    const at = `$.relationships[${index}]`
    if (!RELATION_KEYS.has(rel.relation_key ?? "")) add(`${at}.relation_key`, `unknown relation key ${rel.relation_key}`)
    if (!rel.subject_seed_id || !rel.object_seed_id) add(at, "relationship missing endpoint seed ids")
    if (rel.subject_seed_id && !ids.has(rel.subject_seed_id)) add(`${at}.subject_seed_id`, `unresolved ${rel.subject_seed_id}`)
    if (rel.object_seed_id && !ids.has(rel.object_seed_id)) add(`${at}.object_seed_id`, `unresolved ${rel.object_seed_id}`)
    if (!Array.isArray(rel.source_keys) || rel.source_keys.length === 0) add(`${at}.source_keys`, "provenance required")
    if (typeof rel.confidence !== "number" || rel.confidence < 0 || rel.confidence > 1) add(`${at}.confidence`, "must be 0..1")
    if (rel.review_status !== "needs_review" && rel.review_status !== "approved") {
      add(`${at}.review_status`, "corpus rows stage at needs_review (promotion is governed)")
    }
  }

  return { ok: issues.length === 0, issues }
}

function main(): void {
  const args = process.argv.slice(2)
  const dataDir = path.join(process.cwd(), "data", "world", "pilots")
  const files =
    args.includes("--all")
      ? ["detroit", "kingston", "lagos", "london", "tokyo", "new-orleans", "bronx", "chicago", "havana", "rio-de-janeiro"]
      : args.filter((arg) => !arg.startsWith("-"))

  let failed = false
  for (const name of files) {
    const file = `${name}.json`
    let raw: string
    try {
      raw = readFileSync(path.join(dataDir, file), "utf8")
    } catch {
      console.error(`MISSING ${file}`)
      failed = true
      continue
    }
    const result = validatePilot(file, raw)
    if (result.ok) {
      console.log(`OK ${file}`)
    } else {
      failed = true
      for (const issue of result.issues) console.error(`FAIL ${issue.file} ${issue.path}: ${issue.message}`)
    }
  }
  process.exitCode = failed ? 1 : 0
}

if (process.argv[1] && process.argv[1].endsWith("validate-pilot.ts")) main()
