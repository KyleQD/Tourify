/**
 * /vk/[slug] — Public Venue Kit Page
 * Server component. Fetches the published VK data and renders VkDocument.
 * Mirrors app/epk/[slug]/page.tsx
 */
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { venueKitService } from "@/lib/services/venue-kit.service"
import VkPublicPageClient from "./vk-public-page-client"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const vkData = await venueKitService.getPublicVKData(slug, supabase as any)

  if (!vkData) {
    return { title: "Venue Kit Not Found | Tourify" }
  }

  return {
    title: vkData.seoTitle || `${vkData.venueName} — Venue Kit`,
    description: vkData.seoDescription || vkData.bio || undefined,
    openGraph: {
      title: vkData.seoTitle || `${vkData.venueName} — Venue Kit`,
      description: vkData.seoDescription || vkData.bio || undefined,
      images: vkData.coverUrl ? [{ url: vkData.coverUrl }] : undefined,
    },
  }
}

export default async function VkPublicPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const vkData = await venueKitService.getPublicVKData(slug, supabase as any)

  if (!vkData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">Venue Kit Not Found</p>
          <p className="mt-2 text-sm text-slate-400">
            This Venue Kit doesn&apos;t exist or hasn&apos;t been published yet.
          </p>
        </div>
      </div>
    )
  }

  return <VkPublicPageClient vkData={vkData} />
}
