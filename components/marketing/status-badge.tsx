import { cn } from "@/lib/utils"
import { featureStatusMeta, type FeatureStatus } from "@/lib/marketing/feature-status"

export function StatusBadge({ status, className }: { status: FeatureStatus; className?: string }) {
  const meta = featureStatusMeta[status]
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5",
        meta.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  )
}
