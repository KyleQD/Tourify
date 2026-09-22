"use client"

import { useCallback, useEffect, useState } from "react"

interface Claim {
  id: string
  event_id: string
  claimant_user_id: string
  claimant_account_type: string
  relationship_type: string
  evidence: { note?: string; links?: string[] }
  created_at: string
}

export default function ClaimsClient() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/event-claims", { credentials: "include" })
    if (!res.ok) {
      setError(`Failed to load (${res.status})`)
      return
    }
    const data = await res.json()
    setClaims(data.claims ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const review = async (claimId: string, action: "approve" | "reject") => {
    setBusy(claimId)
    try {
      const res = await fetch("/api/admin/event-claims", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      await load()
    } catch {
      setError("Review failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-semibold">Event ownership claims</h1>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {claims.length === 0 && !error && <p className="text-sm text-slate-400">No pending claims.</p>}
      <ul className="space-y-3">
        {claims.map((claim) => (
          <li key={claim.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm">
            <p>
              <span className="text-slate-400">Event:</span> {claim.event_id}
            </p>
            <p>
              <span className="text-slate-400">Claimant:</span> {claim.claimant_user_id} · {claim.claimant_account_type} ·{" "}
              {claim.relationship_type}
            </p>
            {claim.evidence?.note && <p className="mt-1 text-slate-300">“{claim.evidence.note}”</p>}
            {(claim.evidence?.links ?? []).map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-xs text-purple-300 underline">
                {link}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy === claim.id}
                onClick={() => void review(claim.id, "approve")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs hover:bg-emerald-500 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busy === claim.id}
                onClick={() => void review(claim.id, "reject")}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
