"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Plus, Package, Trash2 } from 'lucide-react'
import { useCurrentVenue } from '../hooks/useCurrentVenue'

interface AssetRow {
  id: string
  name: string
  category?: string | null
  description?: string | null
  serial_number?: string | null
  is_available: boolean
  created_at: string
}

export default function VenueAssetsPage() {
  const { venue, isLoading: venueLoading } = useCurrentVenue()
  const { toast } = useToast()
  const router = useRouter()
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [loading, setLoading] = useState(false)

  // new asset
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [serialNumber, setSerialNumber] = useState<string>('')

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      ...input,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    if (!venue?.id) return
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/assets?ownerType=Venue&ownerId=${venue.id}`, buildNoStoreInit())
        const data = await res.json()
        if (active) setAssets(Array.isArray(data?.assets) ? data.assets : [])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [venue?.id])

  async function createAsset() {
    if (!venue?.id || !name) return
    setLoading(true)
    try {
      const res = await fetch('/api/assets', buildNoStoreInit({
        method: 'POST',
        body: JSON.stringify({ ownerType: 'Venue', ownerId: venue.id, name, category: category || null, description: description || null, serialNumber: serialNumber || null })
      }))
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create asset')
      setAssets(prev => [data.asset, ...prev])
      setName('')
      setCategory('')
      setDescription('')
      setSerialNumber('')
      toast({ title: 'Asset created' })
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create asset', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Assets</h1>
          <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => router.push('/venue')}>
            Back to Venue
          </Button>
        </div>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Add Asset</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <Label className="text-slate-300">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-slate-300">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="sound">Sound</SelectItem>
                  <SelectItem value="lighting">Lighting</SelectItem>
                  <SelectItem value="stage">Stage</SelectItem>
                  <SelectItem value="seating">Seating</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Serial</Label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="md:col-span-6">
              <Label className="text-slate-300">Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="md:col-span-6">
              <Button onClick={createAsset} disabled={!name || loading} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" /> Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Your Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assets.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-white font-medium">{a.name}</div>
                    <div className="text-sm text-slate-400">{a.category || 'uncategorized'}{a.serial_number ? ` • ${a.serial_number}` : ''}</div>
                  </div>
                </div>
                <Button variant="outline" className="border-slate-600 text-slate-300" disabled>
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </div>
            ))}
            {assets.length === 0 ? <div className="text-sm text-slate-400">No assets yet.</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


