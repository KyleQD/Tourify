import { describe, expect, it, vi } from "vitest"

import { soundGuideResolver } from "@/lib/playback/resolvers/world-media"

const assetId = "33333333-3333-4333-8333-333333333333"
const userId = "44444444-4444-4444-8444-444444444444"

vi.mock("@/lib/playback/flags", () => ({
  resolveWorldPlaybackFlags: vi.fn(async () => ({
    world_music_enabled: true,
    world_music_radio_enabled: true,
  })),
}))

function ctx(asset: Record<string, unknown> | null, sources: unknown[]) {
  return {
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: asset, error: null }) }) }),
      }),
    },
    trustedSupabase: {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: sources, error: null }) }),
      }),
    },
    userId,
  }
}

describe("world-media resolver (test matrix items 10-11)", () => {
  const published = {
    id: assetId,
    slug: "motown-clav",
    title: "The Sound of the Clavinet",
    creator_name: "Fixture",
    attribution_text: "Courtesy of Fixture Archives.",
    provider: null,
    media_kind: "sound_guide",
    rights_status: "cc_licensed",
    review_status: "verified",
    publication_status: "published",
    duration_ms: 42000,
  }

  it("cannot resolve unpublished assets (item 10)", async () => {
    await expect(
      soundGuideResolver.resolve(
        { kind: "sound_guide", mediaAssetId: assetId },
        ctx({ ...published, publication_status: "draft" }, [])
      )
    ).rejects.toThrow()
  })

  it("cannot resolve assets whose rights do not permit playback", async () => {
    await expect(
      soundGuideResolver.resolve(
        { kind: "sound_guide", mediaAssetId: assetId },
        ctx({ ...published, rights_status: "link_only" }, [])
      )
    ).rejects.toThrow()
  })

  it("resolves a published approved asset with attribution via storage proxy (item 11)", async () => {
    const resolution = await soundGuideResolver.resolve(
      { kind: "sound_guide", mediaAssetId: assetId },
      ctx(published, [
        {
          id: assetId,
          source_type: "storage",
          storage_bucket: "world-media",
          storage_path: "guides/clav.mp3",
          health_status: "healthy",
          availability_status: "available",
          territory_rules: {},
        },
      ])
    )
    expect(resolution.identity.attribution).toBe("Courtesy of Fixture Archives.")
    expect(resolution.sourceType).toBe("provider_proxy")
    expect(resolution.capabilities.nowPlaying).toBe("static")
    // Private source record fields never leak.
    expect(JSON.stringify(resolution)).not.toContain("storage_path")
    expect(JSON.stringify(resolution)).not.toContain("territory_rules")
  })
})
