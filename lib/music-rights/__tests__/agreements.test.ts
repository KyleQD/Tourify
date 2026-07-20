import {
  buildClaimSnapshot,
  buildPartySnapshot,
  createConsentText,
  hashAgreementPayload,
  renderAgreementMarkdown,
} from "../agreements"
import { classifyCatalogMatch, preserveOriginalReleaseDate, scoreCatalogMatch } from "../catalog-import"

describe("agreements helpers", () => {
  it("builds deterministic claim and party snapshot hashes", () => {
    const claims = [
      {
        claimId: "b",
        subjectType: "musical_work",
        subjectId: "work-1",
        claimantPartyId: "party-1",
        claimType: "ownership",
        rightsCategory: "composition",
        share: { numerator: "1", denominator: "2", unknown: false },
        territoryCodes: ["WORLDWIDE"],
        perpetual: true,
        status: "proposed",
      },
      {
        claimId: "a",
        subjectType: "musical_work",
        subjectId: "work-1",
        claimantPartyId: "party-2",
        claimType: "ownership",
        rightsCategory: "composition",
        share: { numerator: "1", denominator: "2", unknown: false },
        territoryCodes: ["WORLDWIDE"],
        perpetual: true,
        status: "proposed",
      },
    ]
    const first = buildClaimSnapshot(claims)
    const second = buildClaimSnapshot([...claims].reverse())
    expect(first.hash).toBe(second.hash)
    expect(first.snapshot[0].claimId).toBe("a")

    const parties = buildPartySnapshot([
      { partyId: "p2", displayName: "B", signerRole: "claimant" },
      { partyId: "p1", displayName: "A", signerRole: "claimant" },
    ])
    expect(parties.snapshot[0].partyId).toBe("p1")
    expect(hashAgreementPayload(parties.snapshot)).toBe(parties.hash)
  })

  it("renders agreement markdown with stable hash", () => {
    const rendered = renderAgreementMarkdown({
      templateMarkdown: "# {{project_title}}\n\n{{claim_table}}\n\n{{party_list}}",
      projectTitle: "Demo Track",
      claims: [{
        claimId: "c1",
        subjectType: "musical_work",
        subjectId: "work-1",
        claimantPartyId: "party-1",
        claimType: "ownership",
        rightsCategory: "composition",
        share: { numerator: "1", denominator: "1", unknown: false },
        territoryCodes: ["US"],
        perpetual: true,
        status: "proposed",
      }],
      parties: [{ partyId: "party-1", displayName: "Writer", signerRole: "claimant" }],
    })
    expect(rendered.renderedMarkdown).toContain("Demo Track")
    expect(rendered.renderedMarkdown).toContain("Writer")
    expect(rendered.renderedHash).toHaveLength(64)
    expect(createConsentText("v1")).toContain("electronic records")
  })
})

describe("catalog import matching", () => {
  it("classifies exact ISRC matches as confirmed", () => {
    const result = classifyCatalogMatch({
      normalized: {
        title: "Song Title",
        artistName: "Artist",
        isrc: "USRC17607839",
        durationSeconds: 210,
        releaseDate: "2024-01-01",
      },
      candidates: [{
        trackId: "track-1",
        title: "Song Title",
        artistName: "Artist",
        isrc: "USRC17607839",
        durationSeconds: 210,
        releaseDate: "2024-01-01",
      }],
    })
    expect(result.status).toBe("confirmed")
    expect(result.candidateTrackId).toBe("track-1")
  })

  it("preserves existing release dates over imports", () => {
    expect(preserveOriginalReleaseDate({
      existingReleaseDate: "2020-05-01",
      importedReleaseDate: "2024-01-01",
    })).toBe("2020-05-01")
  })

  it("scores explainable signals", () => {
    const scored = scoreCatalogMatch({
      normalized: { title: "A", isrc: "AAA", durationSeconds: 100 },
      candidate: { trackId: "t", title: "A", isrc: "AAA", durationSeconds: 101 },
    })
    expect(scored.signals.some((signal) => signal.code === "exact_isrc" && signal.matched)).toBe(true)
    expect(scored.confidence).toBeGreaterThan(0.5)
  })
})
