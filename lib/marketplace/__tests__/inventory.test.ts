import {
  buildInventoryDecrementPatch,
  getInsufficientInventoryItem,
  resolveAvailableInventory,
} from "@/lib/marketplace/inventory"

describe("marketplace inventory helpers", () => {
  it("treats unlimited inventory as always available", () => {
    expect(
      resolveAvailableInventory({
        listingId: "1",
        quantity: 2,
        hasUnlimitedInventory: true,
        listingInventoryCount: 0,
      })
    ).toBeNull()
  })

  it("prefers variant inventory when present", () => {
    expect(
      resolveAvailableInventory({
        listingId: "1",
        variantId: "v1",
        quantity: 1,
        listingInventoryCount: 10,
        variantInventoryCount: 2,
      })
    ).toBe(2)
  })

  it("flags insufficient inventory", () => {
    const insufficient = getInsufficientInventoryItem([
      {
        listingId: "1",
        quantity: 3,
        hasUnlimitedInventory: false,
        listingInventoryCount: 2,
      },
    ])
    expect(insufficient?.listingId).toBe("1")
  })

  it("archives listing when inventory hits zero", () => {
    expect(buildInventoryDecrementPatch({ currentCount: 1, quantity: 1 })).toEqual({
      inventory_count: 0,
      status: "archived",
    })
  })

  it("decrements inventory without archiving when stock remains", () => {
    expect(buildInventoryDecrementPatch({ currentCount: 5, quantity: 2 })).toEqual({
      inventory_count: 3,
    })
  })
})
