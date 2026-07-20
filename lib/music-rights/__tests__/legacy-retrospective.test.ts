import { DISABLED_MUSIC_RIGHTS_FLAGS } from "../music-rights-flags"
import { flagsOffRestoresPrePhase2Experience, planLegacyRightsBootstrap } from "../legacy-retrospective"

describe("legacy retrospective rights", () => {
  it("preserves release dates and forbids auto-certify / DSP mutation", () => {
    const plan = planLegacyRightsBootstrap({
      trackId: "00000000-0000-0000-0000-000000000001",
      title: "Legacy Track",
      releaseDate: "2019-04-01",
      createdAt: "2026-07-01T00:00:00.000Z",
      importSource: "manual_isrc_link",
    })
    expect(plan.autoCertify).toBe(false)
    expect(plan.mutateDistribution).toBe(false)
    expect(plan.preserveOriginalReleaseDate).toBe("2019-04-01")
    expect(plan.tourifyRecordedAt).toBe("2026-07-01T00:00:00.000Z")
  })

  it("treats all Phase 2 flags off as pre-Phase-2 UX", () => {
    expect(flagsOffRestoresPrePhase2Experience(DISABLED_MUSIC_RIGHTS_FLAGS)).toBe(true)
  })
})
