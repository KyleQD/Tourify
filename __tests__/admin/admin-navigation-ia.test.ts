import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  ADMIN_NAVIGATION,
  filterNavigationTreeForSearch,
  flattenNavigation,
} from "@/lib/admin/navigation/admin-navigation-model"

const expectedPrimaryLabels = [
  "Home",
  "Operations",
  "Workforce",
  "Commerce",
  "Network",
  "Organization & System",
]

describe("Admin first-level navigation IA", () => {
  it("uses the six task-oriented, non-duplicative primary labels", () => {
    const labels = ADMIN_NAVIGATION.map((group) => group.label)

    expect(labels).toEqual(expectedPrimaryLabels)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("keeps every canonical sidebar destination unique and backed by a page", () => {
    const destinations = flattenNavigation(ADMIN_NAVIGATION)
    const hrefs = destinations.map((item) => item.href)
    const sidebar = readFileSync(
      join(process.cwd(), "app/admin/dashboard/components/optimized-sidebar.tsx"),
      "utf8",
    )

    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const href of hrefs) {
      const pagePath = join(process.cwd(), "app", ...href.split("/").filter(Boolean), "page.tsx")
      expect(existsSync(pagePath), `${href} should resolve to ${pagePath}`).toBe(true)
      expect(sidebar, `${href} should remain reachable from the rendered sidebar`).toContain(href)
    }
  })

  it("puts common operator tasks one first-level choice away", () => {
    const destinationsByGroup = Object.fromEntries(
      ADMIN_NAVIGATION.map((group) => [
        group.label,
        group.items.map((item) => item.href),
      ]),
    )

    expect(destinationsByGroup.Operations).toContain("/admin/dashboard/events")
    expect(destinationsByGroup.Workforce).toContain("/admin/dashboard/staff")
    expect(destinationsByGroup.Commerce).toContain("/admin/dashboard/ticketing")
    expect(destinationsByGroup.Network).toContain("/admin/dashboard/communications")
  })

  it("reveals direct matching destinations for keyboard-accessible search results", () => {
    const results = filterNavigationTreeForSearch(
      [
        {
          label: "Workforce",
          href: "__workforce__",
          children: [
            { label: "Staff Operations", href: "/admin/dashboard/staff" },
            { label: "Payroll", href: "/admin/dashboard/payroll" },
          ],
        },
        {
          label: "Commerce",
          href: "__commerce__",
          children: [{ label: "Finances", href: "/admin/dashboard/finances" }],
        },
      ],
      "payroll",
    )

    expect(results).toHaveLength(1)
    expect(results[0]?.label).toBe("Workforce")
    expect(results[0]?.children?.map((item) => item.href)).toEqual([
      "/admin/dashboard/payroll",
    ])

    const sidebar = readFileSync(
      join(process.cwd(), "app/admin/dashboard/components/optimized-sidebar.tsx"),
      "utf8",
    )
    expect(sidebar).toContain("filterNavigationTreeForSearch(scopedNavItems, searchQuery)")
    expect(sidebar).toContain("const isExpanded = isSearching || expandedItems.includes(item.href)")
  })
})
