import { cn } from "@/lib/utils"

export function SampleBadge({ className, label = "Sample data" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-300",
        className,
      )}
    >
      {label}
    </span>
  )
}
