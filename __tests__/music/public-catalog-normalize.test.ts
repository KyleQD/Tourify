import { describe, expect, it } from "vitest"
import {
  isReleaseKind, isValidMusicId, toPublicMusicItem,
} from "@/lib/music/public-catalog-normalize"

describe("safe public music detail metadata", () => {
  const id = "a86c4721-a9f4-4f24-bc5f-2ac5b3e865e3"

  it("accepts valid track UUIDs and rejects invalid route input", () => {
    expect(isValidMusicId(id)).toBe(true)
    expect(isValidMusicId("../../../admin")).toBe(false)
    expect(isValidMusicId("bad")).toBe(false)
  })

  it("does not serialize storage credentials, private raw music URLs, or financial metadata", () => {
    const row = {
      id, user_id: "artist-owner", title: "My Album", type: "album",
      is_public: true, is_visible: true, moderation_status: "approved",
      rights_confirmed: true, genre: "Rock",
      file_url: "https://internal.example/private-master.wav?token=SECRET",
      storage_path: "hidden/audio/secret.wav",
      secret_token: "SECRET", seller_bank_account: "hidden",
      description: "  Public description ",
      release_date: "2022-03-12",
      created_at: "2026-10-18",
      tags: ["rock", 99, "music"],
    }
    const publicItem = toPublicMusicItem(row, { name: "Test Artist", handle: "test-artist" })
    const serialized = JSON.stringify(publicItem)
    expect(publicItem.kind).toBe("album")
    expect(publicItem.releaseDate).toBe("2022-03-12")
    expect(publicItem.hasStream).toBe(true)
    expect(publicItem.artistHandle).toBe("test-artist")
    expect(publicItem.tags).toEqual(["rock", "music"])
    expect(serialized).not.toContain("SECRET")
    expect(serialized).not.toContain("storage_path")
    expect(serialized).not.toContain("bank_account")
    expect(serialized).not.toContain("private-master.wav")
  })

  it("never substitutes upload timestamp for unknown release date", () => {
    const item = toPublicMusicItem({
      id, user_id: "artist-owner", title: "Untitled EP", type: "ep",
      created_at: "2026-10-18", file_url: null, tags: [],
    })
    expect(item.releaseDate).toBeNull()
    expect(item.publishedAt).toBe("2026-10-18")
    expect(item.hasStream).toBe(false)
    expect(isReleaseKind(item.kind)).toBe(true)
  })

  it("doesn't misclassify unverified song metadata as a multi-track release", () => {
    expect(toPublicMusicItem({ id, title: "Single", type: "single" }).kind).toBe("single")
    expect(toPublicMusicItem({ id, title: "Unknown", type: "unexpected" }).kind).toBe("track")
    expect(isReleaseKind("single")).toBe(false)
    expect(isReleaseKind("track")).toBe(false)
    expect(isReleaseKind("mixtape")).toBe(true)
  })

  it("caps artist descriptions and metadata tags", () => {
    const item = toPublicMusicItem({
      id, description: "x".repeat(3000), genre: "g".repeat(500),
      tags: [...Array.from({ length: 30 }, (_, n) => "tag" + n), false],
    })
    expect(item.description?.length).toBe(1600)
    expect(item.genre?.length).toBe(80)
    expect(item.tags).toHaveLength(15)
  })
})
