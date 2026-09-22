// @vitest-environment node
//
// DESIGN-031 contract test: the venue and admin domain use-mobile copies are
// now pure compatibility re-exports of the canonical hooks/use-mobile.ts.
// Asserting the exported function's identity is the strongest proof that the
// conversion introduced no behavioral fork: importing the legacy paths and the
// canonical path must yield the exact same function object.

import { describe, expect, it } from "vitest"

import {
  useHapticFeedback,
  useIsMobile as canonicalUseIsMobile,
  useTouchDevice,
} from "@/hooks/use-mobile"
import { useIsMobile as venueUseIsMobile } from "@/hooks/venue/use-mobile"
import { useIsMobile as adminUseIsMobile } from "@/app/admin/dashboard/components/hooks/use-mobile"

describe("use-mobile canonical re-export contract (DESIGN-031)", () => {
  it("exports the canonical hook from all three paths without forking", () => {
    expect(typeof canonicalUseIsMobile).toBe("function")
    expect(venueUseIsMobile).toBe(canonicalUseIsMobile)
    expect(adminUseIsMobile).toBe(canonicalUseIsMobile)
  })

  it("keeps the full canonical export surface available", () => {
    expect(typeof useTouchDevice).toBe("function")
    expect(typeof useHapticFeedback).toBe("function")
  })
})