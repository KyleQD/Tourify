/**
 * Wave 34 — orphaned shared service pile (lib/services/**).
 *
 * DESIGN-034. This test is the durable guard for a destructive sweep: it fails
 * if a deleted module comes back, if any remaining module is imported by a file
 * that no longer exists (a TS2307 the sweep would have introduced), or if the one
 * recorded canonical repoint is reverted.
 *
 * Evidence of record: docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const SERVICES = join(ROOT, "lib/services")

/** Every zero-importer module DESIGN-034 deleted, with the reason it was safe. */
const DELETED: ReadonlyArray<readonly [string, string]> = [
  ["advanced-analytics.service.ts", "10 archived-only analytics relations, no canonical destination recorded"],
  ["enhanced-staff-analytics.service.ts", "zero importers, no database object named"],
  ["equipment-assets.service.ts", "zero importers, no database object named"],
  ["event-page.service.ts", "zero importers; its bare service-role import is also gone from the SEC-109 count"],
  ["event-participants.service.ts", "zero importers; only named object job_board_postings is live elsewhere"],
  ["locations.service.ts", "zero importers, no database object named"],
  ["onboarding-workflow.service.ts", "zero importers; onboarding_workflows.candidate_id had a dead consumer"],
  ["password-management.service.ts", "zero importers; last on-disk consumer of schema-missing pending_password_resets"],
  ["real-time-staff.service.ts", "zero importers, no database object named"],
  ["rss-feed.service.ts", "zero importers, no database object named"],
  ["security-compliance.service.ts", "zero importers; 4 objects, no canonical destination for any"],
  ["session-management.service.ts", "zero importers; staff_jobs and user_sessions.expires_at had dead consumers"],
  ["staff-job-board.service.ts", "zero importers; largest drift file in the pile (4 objects)"],
  ["staff-management.service.ts", "zero importers; 7 objects whose canonical destinations had a dead consumer here"],
  ["unified-documents.service.ts", "zero importers; 30-line wrapper, only named from a scripts/ checklist"],
]

/** Zero-importer modules deliberately NOT deleted, and why. */
const HELD: ReadonlyArray<readonly [string, string]> = [
  [
    "social-interactions.service.ts",
    "__tests__/social/profile-follow-route.test.ts:151 asserts its source text stays on /api/social/follow",
  ],
  [
    "organization-social-integrations.service.ts",
    "__tests__/admin/content-hub.test.ts:216 asserts its token-envelope select contract",
  ],
  ["venue-scheduling.service.ts", "venue-domain surface with a documented contract at app/venue/components/staff/shift-templates.tsx:37"],
  ["venue-roles-permissions.service.ts", "venue-domain surface; deferred to the venue lane"],
]

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(p)
  }
  return out
}

const REPO_SOURCE_FILES = walk(ROOT).filter(
  (f) =>
    !f.includes("/node_modules/") &&
    !f.includes("/.next/") &&
    !f.includes("/out/") &&
    !f.includes("/.git/") &&
    !f.includes("/docs/") &&
    !f.includes("/.agents/") &&
    !f.endsWith(".d.ts"),
)

/** Module specifiers the whole repository can legally resolve, alias or relative. */
function repoModuleSpecifiers(): string[] {
  const specs: string[] = []
  const re = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g
  for (const file of REPO_SOURCE_FILES) {
    const text = readFileSync(file, "utf8")
    let m: RegExpExecArray | null
    re.lastIndex = 0
    while ((m = re.exec(text))) specs.push(m[1])
  }
  return specs
}

describe("DESIGN-034: lib/services orphaned-pile sweep", () => {
  it("keeps every deleted module deleted", () => {
    for (const [file, reason] of DELETED) {
      expect(existsSync(join(SERVICES, file)), `${file} was restored (${reason})`).toBe(false)
    }
  })

  it("keeps the deliberately held zero-importer modules in place", () => {
    for (const [file, reason] of HELD) {
      expect(existsSync(join(SERVICES, file)), `${file} should still exist (${reason})`).toBe(true)
    }
  })

  it("leaves no repo import pointing at a lib/services module that no longer exists", () => {
    // The failure mode a deletion sweep introduces: a surviving file importing a
    // module this lane removed, which is a TS2307, not a diagnostic reduction.
    // Extensionless specifiers are this repo's normal convention, so resolution
    // must try the same candidates tsc does.
    const broken = new Set<string>()
    for (const spec of repoModuleSpecifiers()) {
      const rel = spec.startsWith("@/") ? spec.slice(2) : null
      if (!rel || !rel.startsWith("lib/services/")) continue
      const base = join(ROOT, rel)
      const resolvable = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"].some((ext) =>
        existsSync(base + ext),
      )
      if (!resolvable) broken.add(`${rel}  <-  ${spec}`)
    }
    expect([...broken]).toEqual([])
  })

  it("keeps the recorded venue_profiles.venue_name repoint in place", () => {
    // database lane canonicalReplacement for the `venue_profiles.name` code-drift
    // column: the chain's display-name column is venue_name.
    const source = readFileSync(join(SERVICES, "staff-onboarding.service.ts"), "utf8")
    expect(source).toContain(".select('venue_name, address')")
    expect(source).toContain("venue_name: venue.venue_name")
    expect(source).not.toContain(".select('name, address')")
    expect(source).not.toContain("venue.name")
  })

  it("still records the sweep in the machine-readable inventory", () => {
    const artifact = JSON.parse(
      readFileSync(
        join(ROOT, "docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json"),
        "utf8",
      ),
    )
    expect(artifact.owner).toBe("design-system")
    expect(artifact.totals.deleted).toBe(DELETED.length)
    expect(artifact.totals.serviceModulesTrackedAtStart).toBe(
      artifact.totals.serviceModulesRemaining + artifact.totals.deleted,
    )
    expect(artifact.totals.withLiveImportersAtStart).toBe(artifact.totals.withLiveImportersAtEnd)
    // Every module must carry exactly one disposition.
    const dispositions = artifact.modules.map((m: { disposition: string }) => m.disposition)
    expect(dispositions.length).toBe(artifact.totals.serviceModulesTrackedAtStart)
    expect(new Set(dispositions).size).toBeGreaterThan(1)
    expect(dispositions.every((d: string) => typeof d === "string" && d.length > 0)).toBe(true)
  })
})
