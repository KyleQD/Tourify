import { FileSearch } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ApplicationReviewEmptyStateProps {
  title?: string
  description?: string
  className?: string
}

export function ApplicationReviewEmptyState({
  title = "No applications found",
  description = "Applications submitted for this hiring account will appear here once real users apply.",
  className,
}: ApplicationReviewEmptyStateProps) {
  return (
    <Card className={cn("border-slate-800 bg-slate-950/60", className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <FileSearch className="mb-4 h-10 w-10 text-slate-500" />
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p>
      </CardContent>
    </Card>
  )
}
