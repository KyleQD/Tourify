"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NeoDateInput } from '@/components/ui/neo-date-input'

interface CertItem {
  id: string
  name: string
  authority?: string
  issue_date?: string
  expiry_date?: string
  credential_id?: string
  credential_url?: string
  is_public: boolean
}

export function CertificationsSettings() {
  const [items, setItems] = useState<CertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<CertItem>>({ name: '', is_public: true })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/certifications')
      const j = await res.json()
      setItems(j.items || [])
    } catch (e) { toast.error('Failed to load certifications') }
    finally { setLoading(false) }
  }

  async function createItem() {
    if (!form.name) return toast.error('Certification name required')
    try {
      setCreating(true)
      const res = await fetch('/api/settings/certifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to create')
      const j = await res.json()
      setItems(prev => [j.item, ...prev])
      setForm({ name: '', is_public: true })
    } catch (e:any) { toast.error(e.message) }
    finally { setCreating(false) }
  }

  async function updateItem(id: string, patch: Partial<CertItem>) {
    const res = await fetch('/api/settings/certifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    if (!res.ok) return toast.error('Save failed')
    const j = await res.json()
    setItems(prev => prev.map(i => i.id === id ? j.item : i))
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/settings/certifications?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Delete failed')
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white">Certifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Name</Label>
              <Input value={form.name || ''} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Authority</Label>
              <Input value={form.authority || ''} onChange={e => setForm(prev => ({ ...prev, authority: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Issue Date</Label>
              <NeoDateInput value={form.issue_date || ''} onChange={e => setForm(prev => ({ ...prev, issue_date: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Expiry Date</Label>
              <NeoDateInput value={form.expiry_date || ''} onChange={e => setForm(prev => ({ ...prev, expiry_date: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Credential ID</Label>
              <Input value={form.credential_id || ''} onChange={e => setForm(prev => ({ ...prev, credential_id: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Credential URL</Label>
              <Input value={form.credential_url || ''} onChange={e => setForm(prev => ({ ...prev, credential_url: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Visibility</Label>
              <Select defaultValue={form.is_public ? 'public' : 'private'} onValueChange={v => setForm(prev => ({ ...prev, is_public: v === 'public' }))}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={createItem} disabled={creating} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-2" /> Add Certification
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold">{item.name}</div>
                  <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 rounded-xl" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white">Authority</Label>
                    <Input defaultValue={item.authority || ''} onBlur={e => updateItem(item.id, { authority: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Issue</Label>
                    <NeoDateInput defaultValue={item.issue_date || ''} onBlur={e => updateItem(item.id, { issue_date: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Expiry</Label>
                    <NeoDateInput defaultValue={item.expiry_date || ''} onBlur={e => updateItem(item.id, { expiry_date: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Credential ID</Label>
                    <Input defaultValue={item.credential_id || ''} onBlur={e => updateItem(item.id, { credential_id: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Credential URL</Label>
                    <Input defaultValue={item.credential_url || ''} onBlur={e => updateItem(item.id, { credential_url: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Visibility</Label>
                    <Select defaultValue={item.is_public ? 'public' : 'private'} onValueChange={v => updateItem(item.id, { is_public: v === 'public' })}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


