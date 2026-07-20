import { cn } from "@/lib/utils"

interface ComingSoonBannerProps {
  title?: string
  description?: string
  className?: string
}

export function ComingSoonBanner({
  title = "Not available",
  description = "This feature is not available yet.",
  className,
}: ComingSoonBannerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-amber-200">{title}</p>
      <p className="mt-1 text-amber-100/80">{description}</p>
    </div>
  )
}
