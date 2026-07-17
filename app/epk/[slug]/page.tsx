import { createClient } from "@/lib/supabase/server"
import { epkService } from "@/lib/services/epk.service"
import EPKPreview from "@/components/epk/epk-preview"
import { EpkPublicActions } from "@/components/epk/epk-public-actions"

export const dynamic = "force-dynamic"

export default async function PublicEPKPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const epkData = await epkService.getPublicEPKData(slug, supabase)

  if (!epkData) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-white">EPK Not Found</h1>
        <p className="mt-2 text-gray-400">The requested EPK could not be found.</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed right-4 top-4 z-50 flex gap-2 rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        <EpkPublicActions epkData={epkData} />
      </div>
      <EPKPreview data={epkData} template={epkData.template} trackingEnabled />
    </div>
  )
}
