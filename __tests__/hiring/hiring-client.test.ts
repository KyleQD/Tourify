// @vitest-environment jsdom

import React, { useEffect } from "react"
import { act } from "react-dom/test-utils"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { readHiringJson } from "@/lib/api/hiring-client"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"

type DashboardHookSnapshot<TData> = ReturnType<typeof useHiringDashboardFetch<TData>>

function HiringDashboardFetchHarness<TData>({
  initialData,
  onSnapshot,
  url,
}: {
  initialData: TData
  onSnapshot: (snapshot: DashboardHookSnapshot<TData>) => void
  url: string
}) {
  const snapshot = useHiringDashboardFetch({ url, initialData })

  useEffect(() => {
    onSnapshot(snapshot)
  }, [onSnapshot, snapshot])

  return null
}

async function waitForCondition(assertion: () => void): Promise<void> {
  const startedAt = Date.now()
  let lastError: unknown

  while (Date.now() - startedAt < 1000) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  throw lastError
}

describe("hiring API client", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns raw successful JSON payloads", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ jobs: [{ id: "job-1" }] }), { status: 200 }))

    const result = await readHiringJson<{ jobs: Array<{ id: string }> }>("/api/hiring/job-postings")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.jobs).toEqual([{ id: "job-1" }])
    }
  })

  it("unwraps successful data envelopes", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: { totalJobs: 3 } }), { status: 200 }))

    const result = await readHiringJson<{ totalJobs: number }>("/api/hiring/dashboard")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ totalJobs: 3 })
    }
  })

  it("normalizes non-OK API errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Employer scope is required.", code: "missing_scope" } }), {
        status: 400,
      })
    )

    const result = await readHiringJson("/api/hiring/dashboard")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatchObject({
        message: "Employer scope is required.",
        code: "missing_scope",
        status: 400,
        retryable: false,
      })
    }
  })

  it("normalizes invalid successful JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not json", { status: 200 }))

    const result = await readHiringJson("/api/hiring/dashboard")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatchObject({
        message: "Hiring data returned an invalid response.",
        code: "invalid_json",
        retryable: false,
      })
    }
  })

  it("normalizes transport failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    const result = await readHiringJson("/api/hiring/dashboard")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: "transport_error",
        retryable: true,
      })
      expect(result.error.message).toContain("temporarily unavailable")
    }
  })

  it("normalizes aborted requests without marking them retryable", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))

    const result = await readHiringJson("/api/hiring/dashboard")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatchObject({
        message: "Request cancelled.",
        code: "aborted",
        retryable: false,
      })
    }
  })
})

describe("useHiringDashboardFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("turns failed dashboard fetches into recoverable error state", async () => {
    const initialData = { totalJobs: 0 }
    const snapshots: Array<DashboardHookSnapshot<typeof initialData>> = []
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await act(async () => {
      root.render(
        React.createElement(HiringDashboardFetchHarness, {
          url: "/api/hiring/dashboard",
          initialData,
          onSnapshot: (snapshot: DashboardHookSnapshot<unknown>) => {
            snapshots.push(snapshot as DashboardHookSnapshot<typeof initialData>)
          },
        })
      )
    })

    await waitForCondition(() => {
      expect(snapshots.at(-1)?.isLoading).toBe(false)
    })

    expect(snapshots.at(-1)?.data).toEqual(initialData)
    expect(snapshots.at(-1)?.error).toContain("temporarily unavailable")
  })

  it("aborts in-flight dashboard requests on unmount", async () => {
    fetchMock.mockImplementationOnce((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"))
        })
      })
    })

    await act(async () => {
      root.render(
        React.createElement(HiringDashboardFetchHarness, {
          url: "/api/hiring/dashboard",
          initialData: { totalJobs: 0 },
          onSnapshot: vi.fn(),
        })
      )
    })

    await waitForCondition(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit
    expect(requestInit.signal?.aborted).toBe(false)

    act(() => {
      root.unmount()
    })

    expect(requestInit.signal?.aborted).toBe(true)
  })
})
