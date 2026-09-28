import { describe, expect, it } from "vitest"

import {
  failedAdminRequest,
  isAdminRequestFailure,
  loadingAdminRequest,
  resolvedAdminRequest,
} from "@/lib/admin/admin-request-state"

describe("admin request state", () => {
  it("keeps empty data distinct from a failed request", () => {
    expect(resolvedAdminRequest([], { empty: true })).toEqual({
      status: "empty",
      data: [],
      message: null,
    })
    expect(failedAdminRequest(503, "Database unavailable")).toEqual({
      status: "unavailable",
      data: null,
      message: "Database unavailable",
    })
  })

  it("classifies denied, stale, loading, and generic failures", () => {
    expect(loadingAdminRequest()).toMatchObject({ status: "loading", data: null })
    expect(failedAdminRequest(403)).toMatchObject({ status: "denied", data: null })
    expect(failedAdminRequest(500)).toMatchObject({ status: "error", data: null })
    expect(resolvedAdminRequest({ count: 2 }, { stale: true })).toMatchObject({
      status: "stale",
      data: { count: 2 },
    })
    expect(isAdminRequestFailure("empty")).toBe(false)
    expect(isAdminRequestFailure("error")).toBe(true)
  })
})
