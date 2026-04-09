import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ApplicationJobSummaryProps {
  title?: string
  department?: string
  position?: string
  location?: string
  displayMode?: "stacked" | "inline" | "fields"
  className?: string
  prefixLabel?: string
}

export function ApplicationJobSummary({
  title,
  department,
  position,
  location,
  displayMode = "stacked",
  className,
  prefixLabel,
}: ApplicationJobSummaryProps) {
  if (displayMode === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {prefixLabel ? <span className="text-slate-400 text-sm">{prefixLabel}</span> : null}
        {department ? (
          <Badge variant="outline" className="text-xs">
            {department}
          </Badge>
        ) : null}
        {title ? <span className="text-sm text-slate-300">{title}</span> : null}
      </div>
    )
  }

  if (displayMode === "fields") {
    return (
      <div className={cn("space-y-2", className)}>
        {title ? (
          <div className="flex justify-between">
            <span className="text-slate-400">Position:</span>
            <span className="text-white">{title}</span>
          </div>
        ) : null}
        {department ? (
          <div className="flex justify-between">
            <span className="text-slate-400">Department:</span>
            <span className="text-white">{department}</span>
          </div>
        ) : null}
        {location ? (
          <div className="flex justify-between">
            <span className="text-slate-400">Location:</span>
            <span className="text-white">{location}</span>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title ? <h4 className="text-lg font-semibold text-white">{title}</h4> : null}
      {department || position ? (
        <p className="text-slate-400">
          {[department, position].filter(Boolean).join(" • ")}
        </p>
      ) : null}
      {location ? <p className="text-slate-400">{location}</p> : null}
    </div>
  )
}
