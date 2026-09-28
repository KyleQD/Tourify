"use client"

import { normalizeVenueTypeLabels, VENUE_TYPE_TAXONOMY } from "@/lib/venue/settings-shapes"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface VenueTypeMultiSelectProps {
  value: string[]
  onChange: (next: string[]) => void
}

/**
 * VEN-248 — true multi-select for venue_types backed by the canonical
 * taxonomy. Unknown legacy labels stay selectable/removable so no stored
 * value is ever orphaned by the editor.
 */
export function VenueTypeMultiSelect({ value, onChange }: VenueTypeMultiSelectProps) {
  const selected = normalizeVenueTypeLabels(value)
  const extra = selected.filter((v) => !(VENUE_TYPE_TAXONOMY as readonly string[]).includes(v))
  const options = [...VENUE_TYPE_TAXONOMY, ...extra]

  const toggle = (type: string) => {
    onChange(
      selected.includes(type)
        ? selected.filter((t) => t !== type)
        : [...selected, type],
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((type) => (
          <Button
            key={type}
            type="button"
            variant={selected.includes(type) ? "default" : "outline"}
            size="sm"
            aria-pressed={selected.includes(type)}
            onClick={() => toggle(type)}
          >
            {type}
          </Button>
        ))}
      </div>
      {selected.length === 0 && (
        <Label className="text-sm text-red-500">Select at least one venue type</Label>
      )}
    </div>
  )
}
