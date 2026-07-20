export interface CollectionReceipt { grossMinor: bigint; providerFeesMinor: bigint; withholdingMinor: bigint; currency: string; }
export interface CollectionReconciliation { netMinor: bigint; balanced: boolean; }
export function reconcileCollection(receipt: CollectionReceipt, receivedMinor: bigint): CollectionReconciliation {
  const netMinor = receipt.grossMinor - receipt.providerFeesMinor - receipt.withholdingMinor;
  return { netMinor, balanced: netMinor === receivedMinor };
}
