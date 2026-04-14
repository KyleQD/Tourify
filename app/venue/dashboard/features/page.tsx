import { FeatureGrid } from "../../components/navigation/feature-grid"
import { TabbedNavigation } from "../../components/navigation/tabbed-navigation"

export default function FeaturesPage() {
  return (
    <div className="min-w-0 space-y-8 px-1 sm:px-0">
      <div className="mx-auto mb-12 max-w-3xl min-w-0 text-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight break-words">All Features</h1>
        <p className="text-balance text-gray-400">
          Explore all the tools and features available to help you grow your music career
        </p>
      </div>

      <TabbedNavigation />

      <FeatureGrid />
    </div>
  )
}
