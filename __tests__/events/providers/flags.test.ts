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
  "BANDSINTOWN_MODE",
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

  it("keeps launch-disabled provider flags closed despite legacy approval", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "TRUE"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(false)
    process.env.EVENT_PROVIDER_TICKETMASTER = "on"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(false)
    process.env.EVENT_PROVIDER_TICKETMASTER = "yes"
    expect(isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")).toBe(false)
  })

  it("keeps Bandsintown disabled despite flags or an explicit mode", () => {
    process.env.EVENT_PROVIDER_BANDSINTOWN = "true"
    expect(getBandsintownMode()).toBe("disabled")
    process.env.EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE = "true"
    process.env.BANDSINTOWN_MODE = "partner"
    expect(getBandsintownMode()).toBe("disabled")
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

  it("does not treat a legacy Ticketmaster flag as launch approval", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "true"
    expect(validateProviderConfig()).toEqual([])
  })

  it("passes when key present", () => {
    process.env.EVENT_PROVIDER_TICKETMASTER = "true"
    process.env.TICKETMASTER_API_KEY = "test-key"
    expect(validateProviderConfig()).toEqual([])
  })

  it("does not treat a legacy Bandsintown flag as launch approval", () => {
    process.env.EVENT_PROVIDER_BANDSINTOWN = "true"
    expect(validateProviderConfig()).toEqual([])
  })
})
