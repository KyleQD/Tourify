"use client"

/**
 * P14-T02 — candidate workspace controls. Client wrapper around the governed
 * server action; renders idle/pending/result states inline so reviewers see
 * exactly why an action failed (permission, version conflict, invalid state)
 * instead of a silent no-op.
 */
import { useState, useTransition } from "react"

import { candidateAction } from "../actions"

interface Props {
  candidateId: string
  version: number | null
  matchStatus: string
  canReview: boolean
}

type Outcome = { ok: boolean; code?: string }

export function CandidateActions({ candidateId, version, matchStatus, canReview }: Props) {
  const [pending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [reason, setReason] = useState("")

  const run = (formData: FormData) => {
    if (!canReview) {
      setOutcome({ ok: false, code: "permission_denied" })
      return
    }
    startTransition(async () => {
      try {
        setOutcome(await candidateAction(formData))
      } catch (error) {
        setOutcome({
          ok: false,
          code: error instanceof Error && error.name === "EditorialMutationError" ? "permission_denied" : "action_failed",
        })
      }
    })
  }

  const submit = (action: string, extra?: Record<string, string>) => {
    const formData = new FormData()
    formData.set("candidateId", candidateId)
    formData.set("version", String(version ?? 1))
    formData.set("action", action)
    formData.set("reason", reason || `${action} via console`)
    for (const [key, value] of Object.entries(extra ?? {})) formData.set(key, value)
    run(formData)
  }

  const buttonClass =
    "rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-slate-200 transition hover:border-violet-300/40 hover:text-white disabled:opacity-50"

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (audited)"
          className="w-36 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500"
        />
        <button type="button" className={buttonClass} disabled={pending} onClick={() => submit("approve")}>
          Approve
        </button>
        <button type="button" className={buttonClass} disabled={pending} onClick={() => submit("reject")}>
          Reject
        </button>
        <button type="button" className={buttonClass} disabled={pending} onClick={() => submit("request_evidence")}>
          Request evidence
        </button>
        {matchStatus !== "matched" && (
          <>
            <button
              type="button"
              className={buttonClass}
              disabled={pending}
              onClick={() => submit("match_existing", { targetMatchId: promptOrEmpty() })}
            >
              Match existing…
            </button>
            <button type="button" className={buttonClass} disabled={pending} onClick={() => submit("merge_duplicate", { targetMatchId: promptOrEmpty() })}>
              Merge duplicate…
            </button>
          </>
        )}
        <button type="button" className={buttonClass} disabled={pending} onClick={() => submit("assign_reviewer", { assigneeId: promptOrEmpty() })}>
          Assign reviewer…
        </button>
        {pending && <span className="text-xs text-cyan-300/80">Applying…</span>}
      </div>
      {outcome && !pending && (
        <p className={`text-xs ${outcome.ok ? "text-emerald-300/85" : "text-rose-300/85"}`}>
          {outcome.ok
            ? `Applied · audit ${outcome.code?.slice(0, 10) ?? ""}`
            : `Failed: ${outcome.code === "version_conflict" ? "someone edited this row first — reload" : outcome.code}`}
        </p>
      )}
    </div>
  )
}

/** Lightweight id capture for match/merge/assign targets. */
function promptOrEmpty(): string {
  const value = window.prompt("Target id (existing record / assignee):") ?? ""
  return value.trim()
}
