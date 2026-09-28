import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

interface FeatureUnavailableProps {
  title: string
  description: string
  fallbackHref?: string
  fallbackLabel?: string
}

export function FeatureUnavailable({
  title,
  description,
  fallbackHref = "/dashboard",
  fallbackLabel = "Back to dashboard",
}: FeatureUnavailableProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <EmptyState
        className="w-full max-w-xl"
        title={title}
        description={description}
        action={
          <Button asChild>
            <Link href={fallbackHref}>{fallbackLabel}</Link>
          </Button>
        }
      />
    </div>
  )
}
