"use client"

/**
 * P14-T05 — claim relation editor controls: temporal scope, confidence,
 * reason. Every edit is version-guarded and audited; publication state is
 * untouched (claims never auto-publish from here).
 */
import { useState, useTransition } from "react"

import { claimEditAction } from "../actions"

interface Props {
  claimId: string
  version: number | null
  canReview: boolean
}

export function ClaimEditor({ claimId, version, canReview }: Props) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [confidence, setConfidence] = useState("")

  const save = () => {
    if (!canReview) {
      setResult("permission_denied")
      return
    }
    const formData = new FormData()
    formData.set("claimId", claimId)
    formData.set("version", String(version ?? 1))
    if (validFrom) formData.set("validFrom", validFrom)
    if (validUntil) formData.set("validUntil", validUntil)
    if (confidence) formData.set("confidence", confidence)
    formData.set("reason", `claim metadata edit via console (${validFrom || "?"}–${validUntil || "open"}, conf ${confidence || "unchanged"})`)
    startTransition(async () => {
      try {
        const outcome = await claimEditAction(formData)
        setResult(outcome.ok ? "applied" : (outcome.code ?? "failed"))
      } catch {
        setResult("permission_denied")
      }
    })
  }

  const inputClass = "w-28 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <input value={validFrom} onChange={(e) => setValidFrom(e.target.value)} placeholder="from (YYYY)" className={inputClass} aria-label="Valid from" />
      <input value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="until (open)" className={inputClass} aria-label="Valid until" />
      <input
        value={confidence}
        onChange={(e) => setConfidence(e.target.value)}
        placeholder="conf 0–1"
        inputMode="decimal"
        className={`${inputClass} w-20`}
        aria-label="Confidence"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-slate-200 transition hover:border-violet-300/40 hover:text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {result && (
        <span className={`text-xs ${result === "applied" ? "text-emerald-300/85" : "text-rose-300/85"}`}>
          {result === "version_conflict" ? "conflict — reload" : result}
        </span>
      )}
    </div>
  )
}
