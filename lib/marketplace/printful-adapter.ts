export interface PrintfulCatalogSyncItem {
  externalProductId: string
  title: string
  variantCount: number
  thumbnailUrl: string | null
}

export interface PrintfulCatalogSyncResult {
  provider: "printful"
  status: "connected" | "skipped"
  syncedCount: number
  items: PrintfulCatalogSyncItem[]
}

/**
 * Provider adapter contract.
 * This is intentionally light until Printful OAuth + webhooks are wired.
 */
export async function syncPrintfulCatalog({
  accessToken,
}: {
  accessToken?: string | null
}): Promise<PrintfulCatalogSyncResult> {
  if (!accessToken) {
    return {
      provider: "printful",
      status: "skipped",
      syncedCount: 0,
      items: [],
    }
  }

  return {
    provider: "printful",
    status: "connected",
    syncedCount: 0,
    items: [],
  }
}
