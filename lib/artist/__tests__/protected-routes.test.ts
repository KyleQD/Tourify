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
})
