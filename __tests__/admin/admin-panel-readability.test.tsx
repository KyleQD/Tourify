import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { VirtualScroll } from "@/app/admin/dashboard/components/virtual-scroll"
import { AdminDataTable } from "@/components/admin/ui/admin-data-table"

describe("Admin panel readability", () => {
  it("positions visible virtual rows at distinct layout offsets", () => {
    const html = renderToStaticMarkup(
      <VirtualScroll
        items={["One", "Two", "Three", "Four"]}
        height={180}
        itemHeight={60}
        overscan={0}
        renderItem={(item) => <span>{item}</span>}
      />,
    )

    expect(html).toContain("top:0;height:60px")
    expect(html).toContain("top:60px;height:60px")
    expect(html).toContain("top:120px;height:60px")
    expect(html).not.toContain("transform:translateY")
  })

  it("keeps names and details reachable in both table and mobile card layouts", () => {
    const name = "A very long tour name that needs more than one line to remain readable"
    const html = renderToStaticMarkup(
      <AdminDataTable
        items={[{ id: "tour-1", name, status: "planning" }]}
        caption="All tours"
        columns={[
          { key: "name", header: "Tour Name", render: (item) => item.name },
          { key: "status", header: "Status", render: (item) => item.status },
        ]}
        getRowKey={(item) => item.id}
        getRowHref={(item) => `/admin/dashboard/tours/${item.id}`}
        getRowLabel={(item) => item.name}
      />,
    )

    expect(html).toContain("<table")
    expect(html).toContain("<th scope=\"col\"")
    expect(html).toContain("aria-label=\"All tours\"")
    expect(html).toContain("title=\"A very long tour name")
    expect(html).toContain("href=\"/admin/dashboard/tours/tour-1\"")
    expect(html).toContain("line-clamp-2")
  })
})
