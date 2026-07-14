import { Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  formatOnboardingResponseLabel,
  formatOnboardingResponseValue,
  type OnboardingResponseDisplay,
} from "@/lib/hiring/onboarding-response-display"

interface ApplicationResponsesListProps {
  responses: Record<string, unknown> | null | undefined
  compact?: boolean
  applicationId?: string
}

function buildDocumentUrl(display: Extract<OnboardingResponseDisplay, { kind: "file" }>, applicationId?: string) {
  if (!display.path) return display.url

  const params = new URLSearchParams({ path: display.path })
  if (applicationId) params.set("application_id", applicationId)
  return `/api/hiring/applications/document?${params.toString()}`
}

function renderDisplayValue(display: OnboardingResponseDisplay, applicationId?: string) {
  if (display.kind === "empty") {
    return <p className="text-slate-500">—</p>
  }

  if (display.kind === "file") {
    return (
      <a
        href={buildDocumentUrl(display, applicationId)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span className="break-words">{display.name}</span>
      </a>
    )
  }

  if (display.kind === "badges") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {display.values.map((entry, index) => (
          <Badge key={`${entry}-${index}`} variant="secondary" className="max-w-full bg-slate-700 text-slate-100">
            <span className="break-words">{entry}</span>
          </Badge>
        ))}
      </div>
    )
  }

  if (display.kind === "lines") {
    return (
      <div className="space-y-1.5 text-sm">
        {display.lines.map((line) => (
          <div key={line.label} className="grid gap-1 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <span className="text-slate-500">{line.label}</span>
            <span className="break-words text-slate-300">{line.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return <p className="break-words text-slate-300">{display.text}</p>
}

export function ApplicationResponsesList({ responses, compact = false, applicationId }: ApplicationResponsesListProps) {
  const entries = Object.entries(responses || {})

  if (entries.length === 0) return <p className="text-sm text-slate-400">No form responses submitted.</p>

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label className="font-medium text-white">{formatOnboardingResponseLabel(key)}</Label>
          <div className={compact ? "min-w-0 rounded bg-slate-700 p-3" : "min-w-0 rounded-lg bg-slate-800/60 p-3"}>
            {renderDisplayValue(formatOnboardingResponseValue(value), applicationId)}
          </div>
        </div>
      ))}
    </div>
  )
}
