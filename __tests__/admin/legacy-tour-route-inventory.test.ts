import { existsSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  assertLegacyTourInventoryComplete,
  LEGACY_TOUR_ROUTE_INVENTORY,
  listLegacyTourWriteRoutes,
} from "@/lib/admin/legacy-tour-route-inventory"

const ROOT = process.cwd()
const TOURS_API = path.join(ROOT, "app/api/tours")

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (name === "route.ts") out.push(full)
  }
  return out
}

function toApiPath(file: string): string {
  const rel = path.relative(path.join(ROOT, "app"), file).replace(/\\/g, "/")
  return `/${rel.replace(/\/route\.ts$/, "")}`
}

describe("TOUR-103 legacy tour route inventory", () => {
  it("classifies every app/api/tours route on disk", () => {
    const diskRoutes = walk(TOURS_API).map(toApiPath)
    const { missing, extra } = assertLegacyTourInventoryComplete(diskRoutes)
    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })

  it("requires owner, replacement, data source, flag, and retirement on every entry", () => {
    for (const entry of LEGACY_TOUR_ROUTE_INVENTORY) {
      expect(entry.owner.trim().length).toBeGreaterThan(0)
      expect(entry.replacement.trim().length).toBeGreaterThan(0)
      expect(entry.dataSource.trim().length).toBeGreaterThan(0)
      expect(entry.flag).toBe("FEATURE_LEGACY_TOUR_API_WRITES")
      expect(entry.retirementMilestone).toBe("TOUR-604")
      expect(entry.methods.length).toBeGreaterThan(0)
    }
  })

  it("documents every write path (no silent undocumented writes)", () => {
    const writes = listLegacyTourWriteRoutes()
    expect(writes.length).toBeGreaterThanOrEqual(10)
    for (const entry of writes) {
      expect(entry.writeClass).toMatch(/legacy_write_compat|delegates_to_canonical|orphan_write/)
    }
  })
})
