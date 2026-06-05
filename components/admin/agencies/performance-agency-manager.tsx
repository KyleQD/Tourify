"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Users, Trash2, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Agency { id: string; name: string; description?: string | null }
interface AgencyArtist { artist_id: string; artist?: { name: string; email: string; avatar_url?: string | null } }
interface ArtistSearchResult { id: string; user_id: string; name: string; email: string; avatar_url: string | null; genres: string[] }

function ArtistSearchPicker({ onSelect }: { onSelect: (artist: ArtistSearchResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArtistSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/admin/artists?search=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setResults(data.artists || [])
      }
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleSelect(artist: ArtistSearchResult) {
    onSelect(artist)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        )}
        <Input
          value={query}
          onChange={handleChange}
          placeholder="Search artists by name..."
          className="pl-9 bg-slate-800 border-slate-700 text-white"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-sm shadow-lg max-h-48 overflow-y-auto">
          {results.map(artist => (
            <button
              key={artist.id}
              type="button"
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-700 transition-colors text-left"
              onClick={() => handleSelect(artist)}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={artist.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{artist.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                <p className="text-slate-400 text-xs truncate">{artist.genres.slice(0, 2).join(', ') || artist.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PerformanceAgencyManager() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [artists, setArtists] = useState<AgencyArtist[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const res = await fetch('/api/agencies/performance', { cache: 'no-store' })
      const data = await res.json()
      if (active) setAgencies(Array.isArray(data?.agencies) ? data.agencies : [])
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedAgencyId) return
    let active = true
    async function load() {
      const res = await fetch(`/api/agencies/performance/${selectedAgencyId}/artists`, { cache: 'no-store' })
      const data = await res.json()
      if (active) setArtists(Array.isArray(data?.artists) ? data.artists : [])
    }
    load()
    return () => { active = false }
  }, [selectedAgencyId])

  async function createAgency() {
    if (!newName) return
    setLoading(true)
    try {
      const res = await fetch('/api/agencies/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create agency')
      setAgencies(prev => [data.agency, ...prev])
      setSelectedAgencyId(data.agency.id)
      setNewName('')
      setNewDescription('')
      toast.success('Agency created')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function addArtist(artist: ArtistSearchResult) {
    if (!selectedAgencyId) return
    // Use user_id as artistId (the agencies table likely links via user_id or artist_profile id)
    const artistId = artist.id
    const res = await fetch(`/api/agencies/performance/${selectedAgencyId}/artists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId })
    })
    if (res.ok) {
      setArtists(prev => [{ artist_id: artistId, artist: { name: artist.name, email: artist.email, avatar_url: artist.avatar_url } }, ...prev])
      toast.success(`${artist.name} added to agency`)
    } else {
      const d = await res.json()
      toast.error(d?.error || 'Failed to add artist')
    }
  }

  async function removeArtist(artistId: string) {
    const res = await fetch(`/api/agencies/performance/${selectedAgencyId}/artists?artistId=${encodeURIComponent(artistId)}`, { method: 'DELETE' })
    if (res.ok) {
      setArtists(prev => prev.filter(a => a.artist_id !== artistId))
      toast.success('Artist removed')
    } else {
      toast.error('Failed to remove artist')
    }
  }

  const selectedAgency = useMemo(() => agencies.find(a => a.id === selectedAgencyId) || null, [agencies, selectedAgencyId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Create Performance Agency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-slate-300">Name</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div>
            <Label className="text-slate-300">Description</Label>
            <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <Button onClick={createAgency} disabled={!newName || loading} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" /> Create
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Agencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300">Select Agency</Label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Choose an agency" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {agencies.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAgency && (
              <div className="flex items-end">
                <Badge className="rounded-full">Selected: {selectedAgency.name}</Badge>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {selectedAgency ? (
            <div className="space-y-3">
              <div>
                <Label className="text-slate-300 mb-1.5 block">Add Artist</Label>
                <ArtistSearchPicker onSelect={addArtist} />
              </div>

              <div className="space-y-2">
                {artists.length === 0 ? (
                  <div className="text-sm text-slate-400 py-3 text-center">No artists linked yet.</div>
                ) : artists.map(a => (
                  <div key={a.artist_id} className="flex items-center justify-between rounded-sm border border-slate-700 bg-slate-800 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={a.artist?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(a.artist?.name || a.artist_id).charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white text-sm font-medium">{a.artist?.name || a.artist_id}</p>
                        {a.artist?.email && <p className="text-slate-400 text-xs">{a.artist.email}</p>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:text-red-400 hover:border-red-400" onClick={() => removeArtist(a.artist_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Select an agency to manage artists.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
