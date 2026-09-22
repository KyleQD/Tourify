import { afterEach, describe, expect, it } from "vitest"

import { getQaCredentials, loadQaEnv } from "@/scripts/qa/load-qa-env"

const originalBaseUrl = process.env.QA_BASE_URL

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.QA_BASE_URL
  else process.env.QA_BASE_URL = originalBaseUrl
})

describe("QA environment loading", () => {
  it("preserves an explicit invocation override", () => {
    process.env.QA_BASE_URL = "http://localhost:3010"

    loadQaEnv()

    expect(getQaCredentials().baseUrl).toBe("http://localhost:3010")
  })
})
