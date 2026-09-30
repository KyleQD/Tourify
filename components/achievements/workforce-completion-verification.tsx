'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ManagerRecognition } from '@/lib/workforce/recognition-types'

export function WorkforceCompletionVerification({ entityType, entityId }: { entityType: 'venue' | 'organization' | 'artist'; entityId: string }) {
  const [queue, setQueue] = useState<ManagerRecognition | null>(null)
  const [selected, setSelected] = useState('')
  const [endorsement, setEndorsement] = useState('')
  const [evidence, setEvidence] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(`/api/admin/workforce/recognition?entity_type=${entityType}&entity_id=${encodeURIComponent(entityId)}`, { signal })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error)
    setQueue(body)
  }, [entityType, entityId])
  useEffect(() => {
    const controller = new AbortController()
    setQueue(null); setSelected(''); setNotice('')
    load(controller.signal).catch(e => { if (e.name !== 'AbortError') setNotice(e.message) })
    return () => controller.abort()
  }, [load])
  async function submit(body: object) {
    setBusy(true); setNotice('')
    try {
      const res = await fetch('/api/admin/workforce/recognition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSelected(''); setEndorsement(''); setEvidence(''); setReason('')
      await load(); setNotice('Verification records and progression updated.')
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to update verification.') } finally { setBusy(false) }
  }
  const pending = queue?.assignments.filter(a => !queue.credits.some(c => c.assignment_id === a.id)) ?? []
  return <section className="space-y-3 rounded-xl border border-emerald-500/20 p-4" aria-label="Verify workforce completion">
    <h3 className="font-semibold">Verify live-event work</h3>
    <p className="text-sm text-muted-foreground">Verify successful execution after event settlement or tour completion. Confirm duties, required credentials, attendance, and handoff from your operational records. Hiring or onboarding alone earns no credit.</p>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <label className="block text-sm">Assignment
      <select className="mt-1 w-full rounded border bg-background p-2" value={selected} onChange={e => setSelected(e.target.value)} disabled={busy}>
        <option value="">Select an assignment</option>
        {pending.map(a => <option key={a.id} value={a.id}>{a.role_title} · worker {a.user_id.slice(0, 8)} · {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : 'Work window missing'}{!a.role_key ? ' · catalog role missing' : ''}</option>)}
      </select>
    </label>
    {selected && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit({ action: 'verify', assignment_id: selected, endorsement, evidence }) }}>
      <label className="block text-sm">Role endorsement (shown if worker opts in)<Textarea value={endorsement} onChange={e => setEndorsement(e.target.value)} minLength={10} maxLength={2000} required disabled={busy} /></label>
      <label className="block text-sm">Private completion evidence and operational references<Textarea value={evidence} onChange={e => setEvidence(e.target.value)} minLength={10} maxLength={2000} required disabled={busy} placeholder="Attendance/check-out, fulfilled duties, credential checks, handoff, and closeout references. Avoid sensitive medical or identity information." /></label>
      <Button disabled={busy || endorsement.trim().length < 10 || evidence.trim().length < 10}>Verify successful completion</Button>
    </form>}
    {queue && !pending.length && <p className="text-sm text-muted-foreground">No uncredited active/completed assignments in this employer’s latest 200 records.</p>}
    {!!queue?.credits.length && <details><summary className="cursor-pointer text-sm">Verification and revocation records</summary>
      <label className="mt-3 block text-sm">Reason for revocation<Textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} disabled={busy} /></label>
      <ul className="mt-3 space-y-3">{queue.credits.map(c => <li key={c.id} className="rounded border p-3 text-sm">
        <strong>{c.role_key.replace(/[-_]/g, ' ')}</strong> · worker {c.user_id.slice(0, 8)}
        <p>Verified by {c.verified_by} on {new Date(c.verified_at).toLocaleDateString()}</p><p>{c.evidence}</p>
        {c.revoked_at ? <p>Revoked: {c.revocation_reason}</p> : <Button className="mt-2" size="sm" variant="destructive" disabled={busy || reason.trim().length < 10} onClick={() => void submit({ action: 'revoke', credit_id: c.id, reason })}>Revoke credit and recalculate levels</Button>}
      </li>)}</ul>
    </details>}
  </section>
}
