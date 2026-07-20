import { describe, expect, it } from "vitest"

import { certificationIsPubliclyActive, validateCertificationTransition } from "../music-certification"

describe("certification transitions", function () {
  it("allows review approval", function () {
    expect(validateCertificationTransition({ from: "in_review", to: "approved" }).allowed).toBe(true)
  })

  it("prevents direct draft approval", function () {
    expect(validateCertificationTransition({ from: "draft", to: "approved" }).allowed).toBe(false)
  })

  it("only treats approved certificates as publicly active", function () {
    expect(certificationIsPubliclyActive("approved")).toBe(true)
    expect(certificationIsPubliclyActive("suspended")).toBe(false)
    expect(certificationIsPubliclyActive("revoked")).toBe(false)
  })
})
