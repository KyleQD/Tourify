// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"

describe("shared state primitives", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders an empty state with labelled content and an action slot", () => {
    render(
      <EmptyState
        title="No tours yet"
        description="Create a tour to get started."
        action={<button type="button">Create tour</button>}
      />,
    )

    const state = screen.getByRole("region", { name: "No tours yet" })
    expect(state.textContent).toContain("Create a tour to get started.")
    expect(screen.getByRole("button", { name: "Create tour" })).toBeTruthy()
    expect(state.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("exposes errors as live alerts and preserves action behavior", () => {
    const onRetry = vi.fn()

    render(
      <ErrorState
        title="Could not load tours"
        description="Please try again."
        action={<button type="button" onClick={onRetry}>Try again</button>}
      />,
    )

    const state = screen.getByRole("alert", { name: "Could not load tours" })
    expect(state.getAttribute("aria-live")).toBe("assertive")
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("keeps skeletons out of the accessibility tree by default", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-full" />)

    expect(screen.getByTestId("skeleton").getAttribute("aria-hidden")).toBe("true")
  })
})
