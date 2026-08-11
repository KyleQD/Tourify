import { afterEach, describe, expect, it } from "vitest"

import {
  getBandsintownMode,
  isEventFeatureEnabled,
  validateProviderConfig,
} from "@/lib/events/providers/flags"

const MANAGED = [
  "EVENT_DISCOVERY_V2",
  "EVENT_PROVIDER_TICKETMASTER",
  "EVENT_PROVIDER_BANDSINTOWN",
  "EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE",
  "TICKETMASTER_API_KEY",
  "BANDSINTOWN_APP_ID",
] as const

afterEach(() => {
  for (const key of MANAGED) delete process.env[key]
})

describe("event feature flags", () => {
  it("defaults every flag to off", () => {
    expect(isEventFeatureEnabled("EVENT_DISCOVERY_V2")).toBe(false)
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(false)
    expect(getBandsintownMode()).toBe("disabled")
  })

  it("accepts 1/true/on (case-insensitive)", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "TRUE"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(true)
    process.env.EVENT_PROVIDER_TICKETMASTER = "on"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(true)
    process.env.EVENT_PROVIDER_TICKETMASTER = "yes"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(false)
  })

  it("partner mode requires both bandsintown flags", () => {
    process.env.EVENT_PROVIDER_BANDSINTOWN = "true"
    expect(getBandsintownMode()).toBe("artist_owned_key")
    process.env.EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE = "true"
    expect(getBandsintownMode()).toBe("partner")
  })

  it("bandsintown stays disabled when base flag is off even if partner flag set", () => {
    process.env.EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE = "true"
    expect(getBandsintownMode()).toBe("disabled")
  })
})

describe("validateProviderConfig", () => {
  it("reports nothing when all providers disabled", () => {
    expect(validateProviderConfig()).toEqual([])
  })

  it("flags missing Ticketmaster key when enabled", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "true"
    const issues = validateProviderConfig()
    expect(issues).toHaveLength(1)
    expect(issues[0].variable).toBe("TICKETMASTER_API_KEY")
  })

  it("passes when key present", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "true"
    process.env.TICKETMASTER_API_KEY = "test-key"
    expect(validateProviderConfig()).toEqual([])
  })

  it("flags missing Bandsintown app id when enabled", () => {
    process.env.EVENT_PROVIDER_BANDSINTOWN = "true"
    const issues = validateProviderConfig()
    expect(issues.map((i) => i.variable)).toContain("BANDSINTOWN_APP_ID")
  })
})
