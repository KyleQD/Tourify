import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const PURCHASES_PAGE = join(process.cwd(), "app/marketplace/purchases/page.tsx")
const SELLER_DASHBOARD = join(process.cwd(), "components/marketplace/seller-store-dashboard.tsx")

function readSource(path: string) {
  return readFileSync(path, "utf8")
}

describe("marketplace cancel and refund UI contracts", () => {
  it("wires buyer pending purchases to the marketplace cancel route", () => {
    const source = readSource(PURCHASES_PAGE)
    expect(source).toContain("canCancelOrder")
    expect(source).toContain("/api/marketplace/orders/${order.id}/cancel")
    expect(source).toContain("Cancel order")
    expect(source).toContain("status: \"cancelled\"")
  })

  it("wires seller paid orders to the idempotent refund route", () => {
    const source = readSource(SELLER_DASHBOARD)
    expect(source).toContain("canRefundSellerOrder")
    expect(source).toContain("/api/marketplace/orders/${order.id}/refund")
    expect(source).toContain("const idempotencyKey = getRefundRequestKey(order.id)")
    expect(source).toContain("idempotencyKey,")
    expect(source).toContain("Refund order")
  })
})
