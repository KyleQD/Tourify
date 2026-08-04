import { describe, expect, it } from "vitest"
import { contrastRatio, readableForeground } from "@/lib/post-appearance/contrast"
import {
  createPostAppearanceSnapshotV2,
  resolvePostAppearanceSnapshot,
} from "@/lib/post-appearance/resolve"
import { getDefaultPostAppearance } from "@/lib/post-appearance/template-registry"
import { sanitizeForPost } from "@/lib/appearance/sanitize"

describe("post appearance V2 contrast contract", () => {
  it("corrects the white-background/white-text regression", () => {
    const sanitized = sanitizeForPost(
      {
        cardBackgroundHex: "#ffffff",
        textColorCustomHex: "#ffffff",
      },
      "editorial-cover",
    )
    expect(sanitized.textColorCustomHex).toBe("#111111")
    expect(contrastRatio(sanitized.textColorCustomHex!, "#ffffff")).toBeGreaterThanOrEqual(4.5)
  })

  it("keeps an already readable requested foreground", () => {
    const result = readableForeground("#1c1917", "#fffdf8")
    expect(result.corrected).toBe(false)
    expect(result.color).toBe("#1c1917")
  })

  it("creates and resolves a V2 semantic snapshot", () => {
    const snapshot = createPostAppearanceSnapshotV2(
      "audio-console",
      getDefaultPostAppearance("audio-console"),
    )
    expect(snapshot.schemaVersion).toBe(2)
    expect(snapshot.tokens.layoutId).toBe("audio-console")
    expect(resolvePostAppearanceSnapshot(snapshot).legacyTokens).toBeDefined()
  })
})
