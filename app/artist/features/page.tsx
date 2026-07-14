"use client"

import React from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { VariantProps } from "class-variance-authority"
import {
  Upload,
  Library,
  LineChart,
  Share2,
  FileText,
  Video,
  Image as ImageIcon,
  FileSpreadsheet,
  Calendar,
  ShoppingBag,
  Briefcase,
  Zap,
  DollarSign,
  CreditCard,
  BadgeCheck,
  LucideIcon
} from "lucide-react"

interface FeatureCard {
  title: string
  description: string
  icon: LucideIcon
  href: string
  isPro?: boolean
}

interface FeatureCardProps {
  feature: FeatureCard
  key?: string
}

const musicFeatures: FeatureCard[] = [
  {
    title: "Music Upload",
    description: "Upload and manage your tracks",
    icon: Upload,
    href: "/artist/music?upload=1"
  },
  {
    title: "Music Library",
    description: "Browse and organize your music",
    icon: Library,
    href: "/artist/music"
  },
  {
    title: "Music Analytics",
    description: "Track performance and insights",
    icon: LineChart,
    href: "/artist/business/analytics"
  },
  {
    title: "Distribution",
    description: "Distribute to major platforms",
    icon: Share2,
    href: "/artist/content",
    isPro: true
  },
  {
    title: "EPK",
    description: "Electronic Press Kit",
    icon: FileSpreadsheet,
    href: "/artist/epk",
    isPro: true
  },
  {
    title: "Events",
    description: "Manage your events",
    icon: Calendar,
    href: "/artist/events"
  },
]

const contentFeatures: FeatureCard[] = [
  {
    title: "Videos",
    description: "Upload and manage videos",
    icon: Video,
    href: "/artist/content"
  },
  {
    title: "Photos",
    description: "Manage and select your photo gallery",
    icon: ImageIcon,
    href: "/artist/content"
  },
  {
    title: "Blog",
    description: "Create and manage blog posts",
    icon: FileText,
    href: "/artist/features/blog"
  },
]

const businessFeatures: FeatureCard[] = [
  {
    title: "Merchandise",
    description: "Sell your merchandise",
    icon: ShoppingBag,
    href: "/artist/store?tab=listings&type=merch"
  },
  {
    title: "Jobs",
    description: "Find and post music industry jobs",
    icon: Briefcase,
    href: "/artist/features/jobs"
  },
  {
    title: "Promotions",
    description: "Create promotional campaigns",
    icon: Zap,
    href: "/artist/features/promotions"
  },
  {
    title: "Payments",
    description: "Manage your payments",
    icon: DollarSign,
    href: "/artist/store?tab=payments",
    isPro: true
  },
  {
    title: "Subscriptions",
    description: "Manage your subscriptions",
    icon: CreditCard,
    href: "/artist/features/subscriptions"
  },
  {
    title: "Licensing",
    description: "License your music",
    icon: BadgeCheck,
    href: "/artist/features/licensing",
    isPro: true
  },
]

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon
  return (
    <Link href={feature.href}>
      <Card
        className="flex flex-col justify-center h-20 w-full bg-[#181b23] border border-gray-800 rounded-2xl shadow-sm hover:shadow-lg hover:border-purple-500/70 transition-all duration-200 cursor-pointer group px-3 py-2"
        role="article"
        aria-labelledby={`feature-title-${feature.title}`}
      >
        <div className="flex items-start gap-3 flex-grow">
          <div className="p-2 rounded-xl bg-[#23232a] text-purple-500 group-hover:text-white group-hover:bg-purple-600/80 transition-colors duration-200 flex-shrink-0">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2">
              <h2
                id={`feature-title-${feature.title}`}
                className="text-lg font-semibold text-white truncate"
              >
                {feature.title}
              </h2>
              {feature.isPro && (
                <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold ml-2">
                  <Badge variant="secondary" aria-label="Pro feature">Pro</Badge>
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm truncate">{feature.description}</p>
          </div>
        </div>
      </Card>
    </Link>
  )
}

function LoadingFeatureCard() {
  return (
    <Card className="p-6 bg-[#13151c] border-gray-800 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-[#1a1d26] w-10 h-10" />
        <div className="flex-1">
          <div className="h-6 bg-[#1a1d26] rounded w-1/2 mb-2" />
          <div className="h-4 bg-[#1a1d26] rounded w-3/4" />
        </div>
      </div>
    </Card>
  )
}

function FeatureGroup({ title, features }: { title: string; features: FeatureCard[] }) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Artist Features</h1>
      </div>
      <FeatureGroup title="Music" features={musicFeatures} />
      <FeatureGroup title="Content" features={contentFeatures} />
      <FeatureGroup title="Business" features={businessFeatures} />
    </div>
  )
}
