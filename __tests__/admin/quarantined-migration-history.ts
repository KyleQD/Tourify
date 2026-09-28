import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Reads an explicitly quarantined, local-only migration without allowing a
 * static contract test to imply that the SQL is active or applied.
 */
export function readQuarantinedMigration(filename: string) {
  const activePath = join(process.cwd(), "supabase/migrations", filename)
  if (existsSync(activePath)) {
    throw new Error(`Quarantined migration was restored to active history: ${filename}`)
  }

  const archivePath = join(
    process.cwd(),
    "supabase/migration-archive/pre-reconciliation-local-only-2026-08-20",
    filename,
  )
  const manifest = readFileSync(
    join(
      process.cwd(),
      "supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/MANIFEST.csv",
    ),
    "utf8",
  )
  const manifestRow = manifest
    .split("\n")
    .find((row) => row.includes(filename.replace(/\.sql$/, "")))
  if (!manifestRow?.includes("local_only_unapplied")) {
    throw new Error(`Migration is not recorded as local_only_unapplied: ${filename}`)
  }

  return readFileSync(archivePath, "utf8")
}

/**
 * Reads a migration that was promoted unchanged from the reviewed local-only
 * archive into active history. The byte-for-byte check prevents a promotion
 * from silently changing the contract that was reviewed in quarantine.
 */
export function readPromotedMigration(filename: string) {
  const activePath = join(process.cwd(), "supabase/migrations", filename)
  if (!existsSync(activePath)) {
    throw new Error(`Promoted migration is absent from active history: ${filename}`)
  }

  const archivePath = join(
    process.cwd(),
    "supabase/migration-archive/pre-reconciliation-local-only-2026-08-20",
    filename,
  )
  const activeSql = readFileSync(activePath, "utf8")
  const archivedSql = readFileSync(archivePath, "utf8")
  if (activeSql !== archivedSql) {
    throw new Error(`Promoted migration differs from its reviewed archive source: ${filename}`)
  }

  return activeSql
}
