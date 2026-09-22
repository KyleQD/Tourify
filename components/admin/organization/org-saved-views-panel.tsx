'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Globe, RefreshCw, Plus, Trash2, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TourSavedView {
  id: string
  name: string
  scope: 'personal' | 'organization'
  created_by?: string | null
  created_at?: string | null
  filters?: Record<string, unknown> | null
}

type PanelState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgSavedViewsPanel() {
  const [state, setState] = useState<PanelState>('idle')
  const [views, setViews] = useState<TourSavedView[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/tours/saved-views', { credentials: 'include' })
      if (res.status === 503) {
        setState('unavailable')
        return
      }
      if (!res.ok) throw new Error(`Failed to load saved views (${res.status})`)
      const json = await res.json()
      setViews(json.views ?? [])
      setState('ready')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load saved views'
      if (msg.includes('42P01') || msg.includes('unavailable')) {
        setState('unavailable')
      } else {
        setError(msg)
        setState('error')
      }
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/tours/saved-views', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), scope: 'organization' }),
      })
      if (!res.ok) throw new Error('Failed to create view')
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create view')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/tours/saved-views/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete view')
      setConfirmDeleteId(null)
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete view')
    } finally {
      setDeleting(false)
    }
  }

  const orgViews = views.filter((v) => v.scope === 'organization')
  const personalViews = views.filter((v) => v.scope === 'personal')

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-300">Saved Portfolio Views</CardTitle>
          {state === 'ready' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 text-xs"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New org view
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {state === 'loading' && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading saved views…
          </div>
        )}

        {state === 'unavailable' && (
          <div className="border border-dashed border-slate-700/50 rounded p-3">
            <p className="text-sm text-slate-400">Saved views are not available.</p>
          </div>
        )}

        {state === 'error' && (
          <div>
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
            <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {state === 'ready' && (
          <>
            {/* Create form */}
            {showCreate && (
              <div className="border border-slate-700/50 rounded p-3 space-y-2 bg-slate-800/40">
                <p className="text-xs text-slate-400 font-medium">New Organization View</p>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="View name"
                  className="h-8 bg-slate-800 border-slate-700 text-slate-200 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!newName.trim() || creating}
                    onClick={handleCreate}
                    className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    {creating ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreate(false)}
                    className="h-7 text-slate-400 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
              </div>
            )}

            {/* Org views */}
            {orgViews.length === 0 && personalViews.length === 0 ? (
              <p className="text-sm text-slate-400">
                No saved views yet. Create an org-shared view to make it visible to all members.
              </p>
            ) : (
              <div className="space-y-1">
                {orgViews.map((view) => (
                  <div key={view.id} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-b-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/admin/dashboard/tours?view=${view.id}`}
                        className="text-sm text-slate-200 hover:text-white truncate flex items-center gap-1"
                      >
                        {view.name} <ExternalLink className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      </Link>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs shrink-0">
                        org
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {confirmDeleteId === view.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleting}
                            onClick={() => handleDelete(view.id)}
                            className="h-6 text-red-400 hover:text-red-300 text-xs px-2"
                          >
                            {deleting ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : 'Confirm delete'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-6 text-slate-400 text-xs px-2"
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(view.id)}
                          className="h-6 w-6 p-0 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {personalViews.map((view) => (
                  <div key={view.id} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-b-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/admin/dashboard/tours?view=${view.id}`}
                        className="text-sm text-slate-400 hover:text-slate-200 truncate flex items-center gap-1"
                      >
                        {view.name} <ExternalLink className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                      </Link>
                      <Badge className="bg-slate-600/30 text-slate-400 border-slate-600/30 text-xs shrink-0">
                        personal
                      </Badge>
                    </div>
                    {/* Personal views read-only in this panel */}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
