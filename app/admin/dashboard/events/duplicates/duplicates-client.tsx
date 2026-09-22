"use client"

import { useCallback, useEffect, useState } from "react"

interface Candidate {
  id: string
  left_event_id: string
  right_event_id: string
  confidence_score: number
  match_reasons: string[]
  created_at: string
}

export default function DuplicatesClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/event-merges", { credentials: "include" })
    if (!res.ok) {
      setError(`Failed to load (${res.status})`)
      return
    }
    const data = await res.json()
    setCandidates(data.candidates ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (candidateId: string, action: "merge" | "reject" | "never_merge", winnerEventId?: string) => {
    setBusy(candidateId)
    try {
      const res = await fetch("/api/admin/event-merges", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId, action, winnerEventId }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      await load()
    } catch {
      setError("Action failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-semibold">Event duplicates review</h1>
      <p className="text-sm text-slate-400">
        Fuzzy matches are never auto-merged. Choose the surviving event explicitly.
      </p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {candidates.length === 0 && !error && <p className="text-sm text-slate-400">No pending candidates.</p>}
      <ul className="space-y-3">
        {candidates.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p>
                  <span className="text-slate-400">Left:</span> {c.left_event_id}
                </p>
                <p>
                  <span className="text-slate-400">Right:</span> {c.right_event_id}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Confidence {(Number(c.confidence_score) * 100).toFixed(0)}% · {(c.match_reasons ?? []).join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy === c.id}
                  onClick={() => void act(c.id, "merge", c.left_event_id)}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-xs hover:bg-purple-500 disabled:opacity-50"
                >
                  Merge (keep left)
                </button>
                <button
                  disabled={busy === c.id}
                  onClick={() => void act(c.id, "merge", c.right_event_id)}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-xs hover:bg-purple-500 disabled:opacity-50"
                >
                  Merge (keep right)
                </button>
                <button
                  disabled={busy === c.id}
                  onClick={() => void act(c.id, "reject")}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  disabled={busy === c.id}
                  onClick={() => void act(c.id, "never_merge")}
                  className="rounded-md border border-amber-700 px-3 py-1.5 text-xs text-amber-300 hover:border-amber-500 disabled:opacity-50"
                >
                  Never merge
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
