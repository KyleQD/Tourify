"use client"

/**
 * P14-T06 — radio rights/health controls. Rights state is the playback
 * ceiling: retiring a station forces ineligibility regardless of health.
 */
import { useState, useTransition } from "react"

import { radioRightsAction } from "../actions"

interface Props {
  stationId: string
  version: number | null
  canReview: boolean
}

const RIGHTS_OPTIONS = [
  { value: "metadata_only", label: "Metadata only" },
  { value: "playback_eligible", label: "Playback eligible" },
  { value: "territory_restricted", label: "Territory restricted" },
  { value: "retired", label: "Retired" },
] as const

export function RadioRightsControls({ stationId, version, canReview }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [rightsStatus, setRightsStatus] = useState<string>("metadata_only")

  const apply = () => {
    if (!canReview) {
      setResult("permission_denied")
      return
    }
    const formData = new FormData()
    formData.set("stationId", stationId)
    formData.set("version", String(version ?? 1))
    formData.set("rightsStatus", rightsStatus)
    formData.set("reason", `rights → ${rightsStatus} via console`)
    startTransition(async () => {
      try {
        const outcome = await radioRightsAction(formData)
        setResult(outcome.ok ? "applied" : (outcome.code ?? "failed"))
      } catch {
        setResult("permission_denied")
      }
    })
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <select
        value={rightsStatus}
        onChange={(event) => setRightsStatus(event.target.value)}
        className="rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-200"
        aria-label={`Rights status for ${stationId}`}
      >
        {RIGHTS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0a0d24]">
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={apply}
        disabled={pending}
        className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-slate-200 transition hover:border-violet-300/40 hover:text-white disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply rights state"}
      </button>
      {result && (
        <span className={`text-xs ${result === "applied" ? "text-emerald-300/85" : "text-rose-300/85"}`}>
          {result === "version_conflict" ? "conflict — reload" : result}
        </span>
      )}
    </div>
  )
}
