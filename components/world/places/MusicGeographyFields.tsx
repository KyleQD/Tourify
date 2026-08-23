"use client"

/**
 * P7-T01 — music geography metadata fields for upload/release editors.
 * Four optional canonical place pickers (recorded/written/produced/
 * released_from). Values are EXPLICIT selections only; nothing is inferred
 * from the artist. Inherited-from-release values are shown with an override
 * affordance (P7-T04).
 */
import { Globe2 } from "lucide-react"

import {
  CanonicalPlacePicker,
  type SelectedPlace,
} from "@/components/world/places/CanonicalPlacePicker"
import type { MusicGeoRelationKey } from "@/lib/world/projections/music"

export interface MusicGeoFieldValue extends SelectedPlace {
  inheritedFromRelease?: boolean
}

export interface MusicGeographyFieldsProps {
  values: Partial<Record<MusicGeoRelationKey, MusicGeoFieldValue>>
  onChange: (key: MusicGeoRelationKey, value: MusicGeoFieldValue | null) => void
}

const FIELDS: Array<{ key: MusicGeoRelationKey; label: string }> = [
  { key: "recorded_in", label: "Recorded in" },
  { key: "written_in", label: "Written in" },
  { key: "produced_in", label: "Produced in" },
  { key: "released_from", label: "Released from" },
]

export function MusicGeographyFields({ values, onChange }: MusicGeographyFieldsProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Globe2 className="h-4 w-4 text-cyan-300/80" />
        Where was this made? (optional)
      </legend>
      {FIELDS.map(({ key, label }) => (
        <div key={key}>
          <CanonicalPlacePicker
            label={label}
            value={values[key] ?? null}
            onChange={(place) => onChange(key, place)}
          />
          {values[key]?.inheritedFromRelease && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Inherited from the release — pick a place to override.
            </p>
          )}
        </div>
      ))}
    </fieldset>
  )
}
