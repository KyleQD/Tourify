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
