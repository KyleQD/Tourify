import { pathnameRequiresArtistAccount } from "@/lib/artist/protected-routes"

describe("pathnameRequiresArtistAccount", () => {
  it("treats /artist/store as a protected seller dashboard route", () => {
    expect(pathnameRequiresArtistAccount("/artist/store")).toBe(true)
  })

  it("keeps public artist profiles public", () => {
    expect(pathnameRequiresArtistAccount("/artist/cool-band")).toBe(false)
  })

  it("protects merchandise redirect path", () => {
    expect(pathnameRequiresArtistAccount("/artist/merchandise")).toBe(true)
  })

  it("protects press library and nested release routes", () => {
    expect(pathnameRequiresArtistAccount("/artist/press")).toBe(true)
    expect(pathnameRequiresArtistAccount("/artist/press/releases/abc")).toBe(true)
  })

  it("protects overview, messages, jobs, network, and collaborations", () => {
    expect(pathnameRequiresArtistAccount("/artist/overview")).toBe(true)
    expect(pathnameRequiresArtistAccount("/artist/messages")).toBe(true)
    expect(pathnameRequiresArtistAccount("/artist/jobs")).toBe(true)
    expect(pathnameRequiresArtistAccount("/artist/network")).toBe(true)
    expect(pathnameRequiresArtistAccount("/artist/collaborations")).toBe(true)
  })
})
