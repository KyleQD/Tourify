"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import {
  EntityAccountPicker,
  type EntityAccountSelection,
} from "@/components/admin/operations-builder/entity-account-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface ParticipantRow {
  event_id: string
  participant_type: string
  participant_id: string
  role?: string | null
  status?: string | null
  metadata?: Record<string, unknown> | null
}

function mapArtist(row: any): EntityAccountSelection {
  return {
    id: String(row.id || row.profile_id || ""),
    label: row.name || row.display_name || row.artist_name || "Artist",
    meta: row.location || row.tier || row.account_tier || undefined,
  }
}

function mapCrew(row: any): EntityAccountSelection {
  return {
    id: String(row.id || row.staff_member_id || row.user_id || ""),
    label: row.name || row.full_name || row.display_name || "Crew",
    meta: row.specialty || row.role || row.department || undefined,
  }
}

export function EventParticipantsTab({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<ParticipantRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [participantType, setParticipantType] = useState<"Artist" | "Individual">("Artist")
  const [role, setRole] = useState("headliner")
  const [pending, setPending] = useState<EntityAccountSelection[]>([])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/participants`, { cache: "no-store" })
      const data = await res.json()
      setRows(Array.isArray(data?.participants) ? data.participants : [])
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  async function addParticipant(selection: EntityAccountSelection) {
    const res = await fetch(`/api/events/${eventId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantType,
        participantId: selection.id,
        role: role || null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error || "Failed to add participant")
      return
    }
    if (data?.participant) setRows((prev) => [data.participant, ...prev])
    setPending([])
    toast.success(`Added ${selection.label}`)
  }

  async function removeParticipant(type: string, id: string) {
    const res = await fetch(
      `/api/events/${eventId}/participants?participantType=${encodeURIComponent(type)}&participantId=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
    if (res.ok) setRows((prev) => prev.filter((row) => !(row.participant_type === type && row.participant_id === id)))
  }

  const searchUrl =
    participantType === "Artist" ? "/api/tours/planner/artists" : "/api/tours/planner/crew"

  return (
    <Card className="bg-slate-900/50 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white">Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label className="text-slate-300">Type</Label>
            <Select
              value={participantType}
              onValueChange={(value) => setParticipantType(value as "Artist" | "Individual")}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="Artist">Artist</SelectItem>
                <SelectItem value="Individual">Staff / crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="headliner">Headliner</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="crew">Crew</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <EntityAccountPicker
          label={participantType === "Artist" ? "Search artists" : "Search crew / roster"}
          placeholder="Type a name…"
          searchUrl={searchUrl}
          mapResult={participantType === "Artist" ? mapArtist : mapCrew}
          selected={pending}
          multi={false}
          onSelect={(selection) => {
            setPending([selection])
            void addParticipant(selection)
          }}
          onRemove={() => setPending([])}
        />

        <Separator className="bg-slate-700" />

        <div className="space-y-3">
          {rows.map((row) => {
            const label =
              typeof row.metadata?.label === "string" ? row.metadata.label : row.participant_id.slice(0, 8)
            return (
              <div
                key={`${row.participant_type}:${row.participant_id}`}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-400" />
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium">
                      {label}
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {row.participant_type}
                      </Badge>
                      {row.status ? (
                        <Badge variant="secondary" className="bg-slate-700 text-slate-200 capitalize">
                          {row.status}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-400">
                      {row.role || "No role"} · {row.participant_id.slice(0, 8)}…
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  disabled={isLoading}
                  onClick={() => removeParticipant(row.participant_type, row.participant_id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </div>
            )
          })}
          {rows.length === 0 ? <div className="text-sm text-slate-400">No participants added yet.</div> : null}
        </div>
      </CardContent>
    </Card>
  )
}
