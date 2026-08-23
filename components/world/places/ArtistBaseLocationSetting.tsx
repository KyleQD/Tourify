/**
 * P6 — Artist base-location settings flow (P6-T02).
 * Composes CanonicalPlacePicker + public visibility control into a single
 * settings surface that emits a governed GeographyFactInput. The parent form
 * persists it through the server-side projector path.
 */
"use client"

import { useState } from "react"

import {
  CanonicalPlacePicker,
  type SelectedPlace,
} from "@/components/world/places/CanonicalPlacePicker"
import type { PlaceVisibility } from "@/lib/world/places/visibility"

export interface ArtistBaseLocationValue {
  place: SelectedPlace | null
  isPublic: boolean
}

export interface ArtistBaseLocationSettingProps {
  value: ArtistBaseLocationValue
  onChange: (value: ArtistBaseLocationValue) => void
  onUnresolvedSubmit?: (queryText: string) => Promise<void> | void
}

export function ArtistBaseLocationSetting({
  value,
  onChange,
  onUnresolvedSubmit,
}: ArtistBaseLocationSettingProps) {
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-3" data-testid="artist-base-location-setting">
      <CanonicalPlacePicker
        label="Based in"
        value={value.place}
        onChange={(place) => onChange({ ...value, place })}
        onUnresolvedSubmit={onUnresolvedSubmit}
        source="user_entry"
        showVisibilityControl
        visibility={value.isPublic ? "public" : "private"}
        onVisibilityChange={(visibility) =>
          onChange({ ...value, isPublic: visibility === "public" })
        }
      />
      <p className="text-xs text-slate-500">
        Your base location is identity, not touring history. Where you perform is tracked separately as
        time-bounded activity.
      </p>
      <button
        type="button"
        disabled={saving || !value.place}
        onClick={() => {
          setSaving(true)
          try {
            onChange(value)
          } finally {
            setSaving(false)
          }
        }}
        className={cn(
          "rounded-full border px-4 py-1.5 text-sm transition",
          value.place
            ? "border-violet-400/40 text-violet-100 hover:border-cyan-300/40"
            : "cursor-not-allowed border-white/10 text-slate-600",
        )}
      >
        {saving ? "Saving…" : "Save base location"}
      </button>
    </div>
  )
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}
