import { Label } from "@/components/ui/label"

interface ApplicationResponsesListProps {
  responses: Record<string, unknown> | null | undefined
  compact?: boolean
}

function formatResponseLabel(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function ApplicationResponsesList({ responses, compact = false }: ApplicationResponsesListProps) {
  const entries = Object.entries(responses || {})

  if (entries.length === 0)
    return <p className="text-sm text-slate-400">No form responses submitted.</p>

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label className="text-white font-medium">{formatResponseLabel(key)}</Label>
          <div className={compact ? "rounded bg-slate-700 p-3" : "rounded-lg bg-slate-600 p-3"}>
            <p className="text-slate-300">{String(value)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
