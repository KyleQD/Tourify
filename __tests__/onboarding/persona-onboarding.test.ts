import { describe, expect, it } from "vitest"

import {
  fallbackPersonaTemplate,
  initializePersonaResponses,
  personaAccountPayload,
  validatePersonaResponses,
} from "@/lib/onboarding/persona-onboarding"

describe("persona onboarding contract", () => {
  it("hydrates saved responses without losing newly introduced fields", () => {
    const template = fallbackPersonaTemplate("artist")
    const responses = initializePersonaResponses(template, {
      artist_name: "The Resumes",
    })

    expect(responses.artist_name).toBe("The Resumes")
    expect(responses.genres).toEqual([])
    expect(responses.bio).toBe("")
  })

  it("maps visible artist responses to the account creation payload", () => {
    expect(
      personaAccountPayload("artist", {
        artist_name: "The Resumes",
        bio: "On tour",
        genres: ["Rock"],
      }),
    ).toMatchObject({
      artist_name: "The Resumes",
      bio: "On tour",
      genres: ["Rock"],
    })
  })

  it("validates required visible fields", () => {
    const template = fallbackPersonaTemplate("venue")
    expect(validatePersonaResponses(template, {})).toEqual({
      venue_name: "Venue name is required",
    })
  })
})
