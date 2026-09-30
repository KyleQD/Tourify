'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { RecognitionProfile } from '@/lib/workforce/recognition-types'

export function VerifiedRoleRecognition({ userId, isOwnProfile = false }: { userId: string; isOwnProfile?: boolean }) {
  const [profile, setProfile] = useState<RecognitionProfile | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setProfile(null); setError('')
    fetch(`/api/workforce/recognition?user_id=${encodeURIComponent(userId)}`, { signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data })
      .then(setProfile).catch(e => { if (e.name !== 'AbortError') setError('Verified role recognition could not be loaded.') })
    return () => controller.abort()
  }, [userId])
  async function toggleVisibility() {
    if (!profile) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/workforce/recognition', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_public: !profile.is_public }) })
      if (!res.ok) throw new Error('Could not change visibility.')
      setProfile({ ...profile, is_public: !profile.is_public })
    } catch { setError('Could not change visibility.') } finally { setSaving(false) }
  }
  if (!isOwnProfile && profile && !profile.badges.length) return null
  return <section className="space-y-3 rounded-xl border border-emerald-500/20 p-4" aria-label="Verified live-event experience">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Verified live-event experience</h3>
      {isOwnProfile && profile && <Button size="sm" variant="outline" disabled={saving} onClick={toggleVisibility}>{profile.is_public ? 'Hide from profile' : 'Show on profile'}</Button>}
    </div>
    <p className="text-sm text-muted-foreground">Role and family levels reflect employer-verified completed work. Experience badges do not replace required licenses or credentials.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    {!profile && !error && <p role="status">Loading verified experience…</p>}
    {profile && !profile.badges.length && <p className="text-sm text-muted-foreground">Complete a live-event assignment and ask your employer to verify it to earn your first role credit.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{profile?.badges.map(b => <article key={b.badge_key} className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{b.badge_key.startsWith('family:') ? 'Role family' : 'Role endorsement'}</p>
      <h4 className="font-medium">{b.label} · {b.level_label}</h4>
      <p className="text-sm">Level {b.level} · {b.credits} verified completions · {b.employers} employers</p>
      {b.next_level && <p className="mt-2 text-xs text-muted-foreground">Next: {b.next_level.label} at {b.next_level.credits} completions across {b.next_level.employers} employers.</p>}
    </article>)}</div>
    {!!profile?.endorsements.length && <details><summary className="cursor-pointer text-sm">Verified role endorsements ({profile.endorsements.length})</summary>
      <ul className="mt-2 space-y-3">{profile.endorsements.map(e => <li key={e.id} className="text-sm"><strong>{e.role_label}</strong><p>{e.endorsement}</p><p className="text-xs text-muted-foreground">{e.verification} · {new Date(e.verified_at).toLocaleDateString()} · valid until {new Date(e.expires_at).toLocaleDateString()}</p></li>)}</ul>
    </details>}
    {!!profile?.history.length && <details><summary className="cursor-pointer text-sm">Advancement history</summary><ul className="mt-2 space-y-1 text-sm">{profile.history.map((h, i) => <li key={`${h.badge_key}:${h.occurred_at}:${i}`}>{h.badge_key.replace(/^(role|family):/, '').replace(/[-_]/g, ' ')}: level {h.previous_level} → {h.new_level} · {new Date(h.occurred_at).toLocaleDateString()}</li>)}</ul></details>}
  </section>
}
