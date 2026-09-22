import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolves a migration file path for contract tests.
 *
 * Migrations move between the active chain and the reconciliation archive as
 * the migration-reconciliation program progresses; tests that assert on
 * migration SQL should resolve through this helper instead of hardcoding
 * `supabase/migrations/<file>` so they keep working across moves.
 *
 * Search order:
 *   1. supabase/migrations/              (active chain)
 *   2. supabase/migration-archive/<gen>/ (quarantined local-only history)
 */
export function readMigrationSql(fileName: string): string {
  const root = process.cwd()
  const activePath = join(root, 'supabase/migrations', fileName)
  if (existsSync(activePath)) return activePath

  const archiveRoot = join(root, 'supabase/migration-archive')
  if (existsSync(archiveRoot)) {
    // Bounded scan: archive generations are flat directories.
    for (const generation of readdirSync(archiveRoot, { withFileTypes: true })) {
      if (!generation.isDirectory()) continue
      const candidate = join(archiveRoot, generation.name, fileName)
      if (existsSync(candidate)) return candidate
    }
  }

  throw new Error(
    `Migration not found in active chain or archive: ${fileName}. ` +
    'If this migration was intentionally deleted, update or retire its contract test.',
  )
}
