import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const routeFiles = [
  "analytics/route.ts",
  "catalog-imports/route.ts",
  "certification/[caseId]/events/route.ts",
  "certification/[caseId]/evidence/route.ts",
  "certification/[caseId]/route.ts",
  "certification/route.ts",
  "finance/collectibles/route.ts",
  "generate-preview/route.ts",
  "payouts/batches/route.ts",
  "payouts/onboarding/route.ts",
  "payouts/status/route.ts",
  "pin/route.ts",
  "preview-jobs/route.ts",
  "rights/agreements/route.ts",
  "rights/claims/route.ts",
  "rights/contributions/route.ts",
  "rights/evidence/route.ts",
  "rights/invitations/route.ts",
  "rights/parties/route.ts",
  "rights/passports/route.ts",
  "rights/projects/route.ts",
  "rights/protected-derivatives/route.ts",
  "rights/recordings/route.ts",
  "rights/signatures/route.ts",
  "rights/works/route.ts",
  "route.ts",
  "royalties/allocations/route.ts",
  "royalties/imports/[id]/route.ts",
  "royalties/imports/route.ts",
  "royalties/matches/route.ts",
  "royalties/statements/route.ts",
  "upload-url/route.ts",
  "valuation/route.ts",
]

function readRoute(routeFile: string) {
  return readFileSync(resolve(process.cwd(), "app/api/artist/music", routeFile), "utf8")
}

describe("artist music route auth adoption", () => {
  it("uses the artist profile gate across the complete route family", () => {
    for (const routeFile of routeFiles) {
      const source = readRoute(routeFile)

      expect(source, routeFile).toContain("requireArtistMusicUser")
      expect(source, routeFile).toContain("authResult.response")
      expect(source, routeFile).not.toContain("requireApiUser")
      expect(source, routeFile).not.toContain("auth.getUser")
    }
  })

  it("keeps user-scoped resource checks in routes that address stored resources", () => {
    for (const routeFile of routeFiles.filter((file) => !["generate-preview/route.ts", "upload-url/route.ts"].includes(file))) {
      const source = readRoute(routeFile)

      expect(source, routeFile).toMatch(/user\.id|userId/)
      expect(source, routeFile).toMatch(/(?:user_id|owner_user_id|artist_user_id|seller_user_id|assertOwned|trackRow\.user_id)/)
    }
  })
})
