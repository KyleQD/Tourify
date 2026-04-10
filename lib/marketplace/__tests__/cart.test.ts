import { groupCartLinesBySeller, hasSingleSellerCart } from "../cart"

describe("marketplace cart grouping", () => {
  it("groups lines by seller for multi-artist readiness", () => {
    const groups = groupCartLinesBySeller([
      { listingId: "l1", sellerUserId: "seller-a", quantity: 1 },
      { listingId: "l2", sellerUserId: "seller-b", quantity: 1 },
      { listingId: "l3", sellerUserId: "seller-a", quantity: 2 },
    ])

    expect(groups).toHaveLength(2)
    const sellerA = groups.find(group => group.sellerUserId === "seller-a")
    const sellerB = groups.find(group => group.sellerUserId === "seller-b")

    expect(sellerA?.lines.map(line => line.listingId)).toEqual(["l1", "l3"])
    expect(sellerB?.lines.map(line => line.listingId)).toEqual(["l2"])
  })

  it("detects single-seller and multi-seller carts", () => {
    expect(
      hasSingleSellerCart([
        { listingId: "l1", sellerUserId: "seller-a", quantity: 1 },
        { listingId: "l2", sellerUserId: "seller-a", quantity: 2 },
      ])
    ).toBe(true)

    expect(
      hasSingleSellerCart([
        { listingId: "l1", sellerUserId: "seller-a", quantity: 1 },
        { listingId: "l2", sellerUserId: "seller-b", quantity: 1 },
      ])
    ).toBe(false)
  })
})
