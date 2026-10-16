import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { FeaturePage } from "@/components/marketing/feature/feature-page"
import { features, getFeature } from "@/lib/marketing/features"

export function generateStaticParams() {
  return features.map((f) => ({ feature: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
  const { feature: slug } = await params
  const feature = getFeature(slug)
  if (!feature) return {}
  const title = `${feature.title} | Tourify`
  return {
    title,
    description: feature.summary,
    alternates: { canonical: `/features/${feature.slug}` },
    openGraph: { title, description: feature.summary, type: "website" },
  }
}

export default async function FeatureRoute({ params }: { params: Promise<{ feature: string }> }) {
  const { feature: slug } = await params
  const feature = getFeature(slug)
  if (!feature) notFound()
  return <FeaturePage feature={feature} />
}
