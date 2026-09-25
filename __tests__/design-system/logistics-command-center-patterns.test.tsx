// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CalendarDays } from "lucide-react"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  LogisticsAttentionRow,
  LogisticsCommandCenterEmpty,
  LogisticsCommandCenterError,
  LogisticsCommandCenterLoading,
  LogisticsReadinessIndicator,
  LogisticsSourceHealthSummary,
  LogisticsSummaryStat,
} from "@/components/admin/logistics/command-center"

describe("logistics command-center patterns", () => {
  afterEach(() => cleanup())

  it("states readiness with text, a bounded percentage, and the blocker reason", () => {
    render(
      <LogisticsReadinessIndicator
        reason="Two room assignments are missing."
        state="blocked"
        value={140}
      />,
    )

    const readiness = screen.getByLabelText("Readiness: Blocked")
    expect(readiness.textContent).toContain("Blocked")
    expect(readiness.textContent).toContain("100%")
    expect(readiness.textContent).toContain("Two room assignments are missing.")
    expect(screen.getByRole("progressbar", { name: "Blocked readiness" }).getAttribute("aria-valuenow")).toBe("100")
  })

  it("keeps degraded and unavailable sources visible with their warnings", () => {
    render(
      <LogisticsSourceHealthSummary
        sources={[
          { domain: "Travel", status: "ready", generatedAt: "Updated 2 min ago" },
          { domain: "Maps", status: "degraded", warning: "One event could not be checked." },
          { domain: "Lodging", status: "unavailable", warning: "Lodging could not be loaded." },
        ]}
      />,
    )

    expect(screen.getByRole("region", { name: "Data source health" }).textContent).toContain("2 sources need attention")
    expect(screen.getByLabelText("Maps source: Degraded")).toBeTruthy()
    expect(screen.getByLabelText("Lodging source: Unavailable")).toBeTruthy()
    expect(screen.getByText("Lodging could not be loaded.")).toBeTruthy()
  })

  it("does not render an unavailable metric as a healthy zero", () => {
    render(
      <LogisticsSummaryStat
        availability="unavailable"
        icon={CalendarDays}
        label="Upcoming events"
        value={0}
      />,
    )

    const card = screen.getByText("Upcoming events").closest("[data-availability]")
    expect(card?.getAttribute("data-availability")).toBe("unavailable")
    expect(card?.textContent).toContain("Unavailable")
    expect(card?.textContent).not.toContain("0")
  })

  it("presents an actionable attention item with operator context", () => {
    render(
      <LogisticsAttentionRow
        action={{ label: "Assign owner", href: "/admin/dashboard/logistics?issueId=issue-1" }}
        context="West Coast Tour · Portland stop"
        domain="Transport"
        due="Today at 3:00 PM"
        freshness="5 minutes ago"
        reason="The airport pickup has no assigned driver."
        severity="critical"
        title="Pickup needs an owner"
      />,
    )

    const row = screen.getByRole("article", { name: "Pickup needs an owner" })
    expect(row.textContent).toContain("Critical")
    expect(row.textContent).toContain("Transport")
    expect(row.textContent).toContain("Unassigned")
    expect(row.textContent).toContain("Today at 3:00 PM")
    expect(screen.getByRole("link", { name: "Assign owner" }).getAttribute("href")).toBe(
      "/admin/dashboard/logistics?issueId=issue-1",
    )
  })

  it("provides semantic loading, empty, and retryable error states", () => {
    const retry = vi.fn()
    const { rerender } = render(<LogisticsCommandCenterLoading />)

    const loading = screen.getByRole("status", { name: "Loading logistics command center" })
    expect(loading.getAttribute("aria-busy")).toBe("true")

    rerender(
      <LogisticsCommandCenterEmpty
        action={<button type="button">Clear filters</button>}
        description="Try a wider date range."
        title="No matching logistics work"
      />,
    )
    expect(screen.getByRole("region", { name: "No matching logistics work" })).toBeTruthy()

    rerender(<LogisticsCommandCenterError onRetry={retry} />)
    expect(screen.getByRole("alert", { name: "Logistics data is unavailable" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
