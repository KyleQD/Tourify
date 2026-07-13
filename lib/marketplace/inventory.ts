export interface InventoryStockItem {
  listingId: string
  variantId?: string | null
  quantity: number
  hasUnlimitedInventory?: boolean | null
  listingInventoryCount?: number | null
  variantInventoryCount?: number | null
}

export function resolveAvailableInventory(item: InventoryStockItem): number | null {
  if (item.hasUnlimitedInventory) return null
  if (item.variantId != null && item.variantInventoryCount != null) return item.variantInventoryCount
  if (item.listingInventoryCount != null) return item.listingInventoryCount
  return null
}

export function getInsufficientInventoryItem(items: InventoryStockItem[]): InventoryStockItem | null {
  for (const item of items) {
    const available = resolveAvailableInventory(item)
    if (available === null) continue
    if (available < item.quantity) return item
  }
  return null
}

export function buildInventoryDecrementPatch({
  currentCount,
  quantity,
}: {
  currentCount: number | null | undefined
  quantity: number
}): { inventory_count: number; status?: "archived" } | null {
  if (currentCount == null) return null
  const next = Math.max(0, currentCount - quantity)
  if (next === 0) return { inventory_count: 0, status: "archived" }
  return { inventory_count: next }
}
