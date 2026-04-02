"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NeoDateInput } from '@/components/ui/neo-date-input'

interface ExperienceItem {
  id: string
  title: string
  organization?: string
  start_date?: string
  end_date?: string
  is_current?: boolean
  description?: string
  is_visible: boolean
}

export function ExperienceSettings() {
  const [items, setItems] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<ExperienceItem>>({ title: '', is_visible: true })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/settings/experience')
      const j = await res.json()
      setItems(j.items || [])
    } catch (e) { toast.error('Failed to load experiences') }
    finally { setLoading(false) }
  }

  async function createItem() {
    if (!form.title) return toast.error('Title required')
    try {
      setCreating(true)
      const res = await fetch('/api/settings/experience', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to create')
      const j = await res.json()
      setItems(prev => [j.item, ...prev])
      setForm({ title: '', is_visible: true })
    } catch (e:any) { toast.error(e.message) }
    finally { setCreating(false) }
  }

  async function updateItem(id: string, patch: Partial<ExperienceItem>) {
    const res = await fetch('/api/settings/experience', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    if (!res.ok) return toast.error('Save failed')
    const j = await res.json()
    setItems(prev => prev.map(i => i.id === id ? j.item : i))
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/settings/experience?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Delete failed')
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-white">Experience</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Title</Label>
              <Input value={form.title || ''} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Organization</Label>
              <Input value={form.organization || ''} onChange={e => setForm(prev => ({ ...prev, organization: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">Start Date</Label>
              <NeoDateInput value={form.start_date || ''} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div>
              <Label className="text-white">End Date</Label>
              <NeoDateInput value={form.end_date || ''} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} className="bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-white">Description</Label>
              <Textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} className="min-h-[80px] bg-white/5 border-white/20 text-white rounded-xl" />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button onClick={createItem} disabled={creating} className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-2" /> Add Experience
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-white font-semibold">{item.title}</div>
                  <Button variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 rounded-xl" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Organization</Label>
                    <Input defaultValue={item.organization || ''} onBlur={e => updateItem(item.id, { organization: e.target.value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">Visibility</Label>
                    <Select defaultValue={item.is_visible ? 'visible' : 'hidden'} onValueChange={v => updateItem(item.id, { is_visible: v === 'visible' })}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visible">Visible</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white">Start</Label>
                    <NeoDateInput defaultValue={item.start_date || ''} onBlur={e => updateItem(item.id, { start_date: (e.target as HTMLInputElement).value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-white">End</Label>
                    <NeoDateInput defaultValue={item.end_date || ''} onBlur={e => updateItem(item.id, { end_date: (e.target as HTMLInputElement).value })} className="bg-white/5 border-white/20 text-white rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-white">Description</Label>
                    <Textarea defaultValue={item.description || ''} onBlur={e => updateItem(item.id, { description: e.target.value })} className="min-h-[80px] bg-white/5 border-white/20 text-white rounded-xl" />
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


