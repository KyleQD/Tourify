import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MarketplaceDownloadClient } from "./download-client"

export const dynamic = "force-dynamic"

export default async function MarketplaceDeliveryPage({
  params,
}: {
  params: Promise<{ orderItemId: string }>
}) {
  const { orderItemId } = await params

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-3">
          <Button asChild variant="outline" className="border-slate-700 text-white">
            <Link href="/marketplace/purchases">Back to purchases</Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Digital download</h1>
            <p className="mt-1 text-sm text-slate-300">
              Generate a secure download link for this purchase.
            </p>
          </div>
        </header>

        <MarketplaceDownloadClient orderItemId={orderItemId} />
      </div>
    </main>
  )
}
