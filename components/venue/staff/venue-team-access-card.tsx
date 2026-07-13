"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Shield, Trash2, UserPlus } from "lucide-react"

interface TeamMemberRow {
  id: string
  user_id?: string | null
  venue_id?: string | null
  role?: string | null
  status?: string | null
  name?: string | null
  email?: string | null
  created_at?: string
  profiles?: { full_name?: string | null; email?: string | null } | null
}

interface VenueTeamAccessCardProps {
  venueId: string
}

export function VenueTeamAccessCard({ venueId }: VenueTeamAccessCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!venueId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/venue/team?venue_id=${encodeURIComponent(venueId)}`, {
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load team")
      setMembers((json.members || []) as TeamMemberRow[])
    } catch (e) {
      toast({
        title: "Team list unavailable",
        description: e instanceof Error ? e.message : "Check permissions.",
        variant: "destructive",
      })
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [toast, venueId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd() {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/venue/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          name: name.trim(),
          email: email.trim(),
          role: role || "member",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Add failed")
      toast({ title: "Team member added" })
      setName("")
      setEmail("")
      setRole("member")
      await load()
    } catch (e) {
      toast({
        title: "Could not add member",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this venue team member?")) return
    setRemovingId(id)
    try {
      const res = await fetch(`/api/venue/team?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Remove failed")
      toast({ title: "Removed" })
      await load()
    } catch (e) {
      toast({
        title: "Could not remove",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  const displayName = (m: TeamMemberRow) =>
    m.profiles?.full_name || m.name || m.profiles?.email || m.email || "Member"

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <Shield className="h-5 w-5 text-violet-400" />
            Venue team access
          </CardTitle>
          <CardDescription className="text-gray-400">
            Rows in <code className="text-xs text-gray-500">venue_team_members</code> — dashboard roles separate from staff profiles.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="border-gray-600" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-gray-300">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="border-gray-700 bg-gray-800 text-white" placeholder="Full name" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-gray-300">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white"
              placeholder="invite@venue.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => void handleAdd()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">No team members for this venue yet.</p>
        ) : (
          <ul className="divide-y divide-gray-800 rounded-lg border border-gray-800">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{displayName(m)}</p>
                  <p className="text-xs text-gray-500">{m.email || m.profiles?.email || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gray-600 capitalize text-gray-300">
                    {m.role || "member"}
                  </Badge>
                  <Badge variant="secondary" className="bg-gray-800 capitalize">
                    {m.status || "active"}
                  </Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => void handleRemove(m.id)}
                    disabled={removingId === m.id}
                    aria-label="Remove member"
                  >
                    {removingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
