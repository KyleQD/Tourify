import {
  buildSellerAnalyticsSummary,
  parseAnalyticsRangeDays,
} from "@/lib/marketplace/seller-analytics"
import {
  isFeaturedListing,
  normalizeStorefrontSections,
  MAX_FEATURED_LISTINGS,
} from "@/lib/marketplace/storefront-curation"

describe("seller analytics", () => {
  it("parses range days with 30d default", () => {
    expect(parseAnalyticsRangeDays("7d")).toBe(7)
    expect(parseAnalyticsRangeDays("90d")).toBe(90)
    expect(parseAnalyticsRangeDays(null)).toBe(30)
  })

  it("aggregates paid order revenue and top listings", () => {
    const summary = buildSellerAnalyticsSummary({
      rangeDays: 30,
      payouts: [{ net_amount: 40, payout_status: "pending" }],
      orders: [
        {
          id: "o1",
          payment_status: "paid",
          total_amount: 50,
          created_at: new Date().toISOString(),
          marketplace_order_items: [
            { listing_id: "l1", title: "Tee", quantity: 2, line_total: 40 },
            { listing_id: "l2", title: "Hat", quantity: 1, line_total: 10 },
          ],
        },
        {
          id: "o2",
          payment_status: "pending",
          total_amount: 99,
          created_at: new Date().toISOString(),
          marketplace_order_items: [{ listing_id: "l1", title: "Tee", quantity: 1, line_total: 20 }],
        },
      ],
    })

    expect(summary.grossRevenue).toBe(50)
    expect(summary.paidOrders).toBe(1)
    expect(summary.unitsSold).toBe(3)
    expect(summary.pendingPayouts).toBe(40)
    expect(summary.topListings[0]?.listingId).toBe("l1")
  })
})

describe("storefront curation", () => {
  it("keeps featured first and defaults when empty", () => {
    expect(normalizeStorefrontSections([])).toContain("featured")
    expect(normalizeStorefrontSections(["merch", "music"])[0]).toBe("featured")
  })

  it("detects featured listings", () => {
    expect(isFeaturedListing({ featured_rank: 1 })).toBe(true)
    expect(isFeaturedListing({ featured_rank: null })).toBe(false)
  })

  it("exposes featured cap", () => {
    expect(MAX_FEATURED_LISTINGS).toBe(12)
  })
})
