"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { AdminPageHeader } from "../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Flag, Plus, Trash2, Loader2, RefreshCw, AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rollout_percentage: number
  target_org_ids: string[] | null
  created_at: string
  updated_at: string
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Create form
  const [newKey, setNewKey] = useState("")
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/features', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setFlags(data.flags || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load feature flags')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createFlag() {
    if (!newKey.trim() || !newName.trim()) {
      toast.error('Key and name are required')
      return
    }
    try {
      const res = await fetch('/api/admin/features', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey.trim(), name: newName.trim(), description: newDescription || undefined }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(JSON.stringify(d.error) || 'Failed to create flag')
      }
      const data = await res.json()
      setFlags(prev => [data.flag, ...prev])
      setNewKey(""); setNewName(""); setNewDescription("")
      setIsCreating(false)
      toast.success('Feature flag created')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function updateFlag(key: string, updates: Partial<FeatureFlag>) {
    setIsSaving(key)
    try {
      const res = await fetch(`/api/admin/features/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setFlags(prev => prev.map(f => f.key === key ? data.flag : f))
      toast.success('Flag updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(null)
    }
  }

  async function deleteFlag(key: string) {
    if (!confirm(`Delete feature flag "${key}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/features/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      setFlags(prev => prev.filter(f => f.key !== key))
      toast.success('Flag deleted')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature Flags"
        subtitle="Control feature availability and rollout percentages"
        icon={Flag}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={load} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Flag
            </Button>
          </div>
        }
      />

      {/* Info banner */}
      <Card className="bg-amber-500/10 border-amber-500/30 rounded-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">
            Flags are stored in the database. Set <code className="bg-amber-500/20 px-1 rounded">NEXT_PUBLIC_FEATURE_[KEY]=true</code> as an env var to override at deploy time. DB flags take precedence at runtime.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : flags.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Flag className="h-10 w-10 text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm">No feature flags yet. Create one to get started.</p>
            <Button size="sm" className="mt-4 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create First Flag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => (
            <Card key={flag.key} className={`bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm transition-all ${flag.enabled ? 'border-purple-500/30' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-medium text-sm">{flag.name}</h3>
                      <code className="text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-mono">{flag.key}</code>
                      <Badge className={`text-xs ${flag.enabled ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {isSaving === flag.key && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                    </div>
                    {flag.description && (
                      <p className="text-xs text-slate-400 mt-1">{flag.description}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      Updated {formatDistanceToNow(new Date(flag.updated_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={enabled => updateFlag(flag.key, { enabled })}
                      disabled={isSaving === flag.key}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                      onClick={() => deleteFlag(flag.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Rollout slider */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Rollout: {flag.rollout_percentage}%</Label>
                    {flag.rollout_percentage === 0 ? (
                      <span className="text-xs text-slate-500">Not rolling out</span>
                    ) : flag.rollout_percentage === 100 ? (
                      <span className="text-xs text-green-400">Full rollout</span>
                    ) : (
                      <span className="text-xs text-yellow-400">{flag.rollout_percentage}% of users</span>
                    )}
                  </div>
                  <Slider
                    value={[flag.rollout_percentage]}
                    min={0}
                    max={100}
                    step={5}
                    disabled={isSaving === flag.key}
                    onValueCommit={([val]) => updateFlag(flag.key, { rollout_percentage: val })}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Flag Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-purple-400" />
              New Feature Flag
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Key <span className="text-slate-500">(lowercase, a-z, 0-9, _, -)</span></Label>
              <Input
                value={newKey}
                onChange={e => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="e.g. advanced_analytics"
                className="bg-slate-800/50 border-slate-700/50 text-white font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Display Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Advanced Analytics"
                className="bg-slate-800/50 border-slate-700/50 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Description</Label>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="What does this flag control?"
                className="bg-slate-800/50 border-slate-700/50 text-white min-h-[60px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createFlag} disabled={!newKey || !newName} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                Create Flag
              </Button>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
