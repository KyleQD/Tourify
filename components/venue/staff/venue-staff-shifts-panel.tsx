"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calendar, ChevronLeft, ChevronRight, RefreshCw, Ban } from "lucide-react"
import { addDaysIso, shiftRangeFromAnchor, type StaffShiftRangeMode } from "@/lib/venue/staff-shift-date-range"

interface StaffShiftRow {
  id: string
  shift_date: string
  start_time: string
  end_time: string
  status: string
  role_assignment?: string | null
  notes?: string | null
  staff_member_id?: string | null
}

interface StaffMemberRow {
  id: string
  name?: string | null
  role?: string | null
}

interface VenueStaffShiftsPanelProps {
  venueId: string
  /** When set, shift list is scoped to this event (matches staff_shifts.event_id). */
  eventId?: string
}

export function VenueStaffShiftsPanel({ venueId, eventId }: VenueStaffShiftsPanelProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState<StaffShiftRow[]>([])
  const [staff, setStaff] = useState<StaffMemberRow[]>([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [staffMemberId, setStaffMemberId] = useState("")
  const [role, setRole] = useState("")
  const [saving, setSaving] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [rangeMode, setRangeMode] = useState<StaffShiftRangeMode>("day")

  const { dateTo, navStepDays } = useMemo(() => shiftRangeFromAnchor(rangeMode, date), [date, rangeMode])

  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a, b) => {
      const byDate = (a.shift_date || "").localeCompare(b.shift_date || "")
      if (byDate !== 0) return byDate
      return (a.start_time || "").localeCompare(b.start_time || "")
    })
  }, [shifts])

  const load = useCallback(async () => {
    if (!venueId) return
    setLoading(true)
    try {
      const eventQs = eventId ? `&eventId=${encodeURIComponent(eventId)}` : ""
      const [shRes, emRes] = await Promise.all([
        fetch(
          `/api/admin/staffing/shifts?venueId=${encodeURIComponent(venueId)}&date_from=${date}&date_to=${dateTo}${eventQs}`,
          {
            credentials: "include",
          }
        ),
        fetch(`/api/staffing/employees?venue_id=${encodeURIComponent(venueId)}&limit=100`, { credentials: "include" }),
      ])
      const shJson = await shRes.json()
      const emJson = await emRes.json()
      if (!shRes.ok) throw new Error(shJson.error || "Failed to load shifts")
      setShifts((shJson.data || []) as StaffShiftRow[])
      setStaff((emJson.data || []) as StaffMemberRow[])
    } catch (e) {
      toast({
        title: "Shifts unavailable",
        description: e instanceof Error ? e.message : "Check venue permissions.",
        variant: "destructive",
      })
      setShifts([])
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [date, dateTo, eventId, toast, venueId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate() {
    if (!staffMemberId) {
      toast({ title: "Pick a staff member", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/staffing/shifts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          event_id: eventId,
          staff_member_id: staffMemberId,
          shift_date: date,
          start_time: startTime,
          end_time: endTime,
          role_assignment: role || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Create failed")
      toast({ title: "Shift created" })
      setRole("")
      await load()
    } catch (e) {
      toast({
        title: "Could not create shift",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelShift(shiftId: string) {
    setCancellingId(shiftId)
    try {
      const res = await fetch(`/api/admin/staffing/shifts/${shiftId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Update failed")
      toast({ title: "Shift cancelled" })
      await load()
    } catch (e) {
      toast({
        title: "Could not cancel shift",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-white">
              <Calendar className="h-5 w-5 text-cyan-400" />
              Shifts (staff_shifts)
              {eventId ? (
                <Badge variant="secondary" className="border border-violet-500/40 bg-violet-950/50 text-xs font-normal text-violet-200">
                  Event scoped
                </Badge>
              ) : null}
            </CardTitle>
            <p className="text-xs text-slate-500">
              Optional URL: <code className="text-slate-600">?event_id=…</code> on Staff → Scheduler
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={rangeMode}
              onValueChange={(v) => {
                if (v === "day" || v === "week") setRangeMode(v)
              }}
              variant="outline"
              size="sm"
              className="border border-slate-600 rounded-md p-0.5"
            >
              <ToggleGroupItem value="day" className="px-3 text-xs data-[state=on]:bg-slate-700 data-[state=on]:text-white">
                Day
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="px-3 text-xs data-[state=on]:bg-slate-700 data-[state=on]:text-white">
                Week
              </ToggleGroupItem>
            </ToggleGroup>
            <Button type="button" variant="outline" size="sm" className="border-slate-600" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-300">{rangeMode === "week" ? "Week starts" : "Date"}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-slate-600 shrink-0"
                onClick={() => setDate((d) => addDaysIso(d, -navStepDays))}
                aria-label={rangeMode === "week" ? "Previous week" : "Previous day"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-slate-600 bg-slate-700/50 text-white flex-1 min-w-[10rem]" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-slate-600 shrink-0"
                onClick={() => setDate((d) => addDaysIso(d, navStepDays))}
                aria-label={rangeMode === "week" ? "Next week" : "Next day"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="sm" className="shrink-0 border border-slate-600 bg-slate-800" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>
                Today
              </Button>
            </div>
            {rangeMode === "week" ? <p className="text-xs text-slate-500">Range: {date} → {dateTo}</p> : null}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Start</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border-slate-600 bg-slate-700/50 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">End</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border-slate-600 bg-slate-700/50 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Staff member</Label>
            <Select value={staffMemberId} onValueChange={setStaffMemberId}>
              <SelectTrigger className="border-slate-600 bg-slate-700/50 text-white">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent className="border-slate-600 bg-slate-800">
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-300">Role / notes (optional)</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. FOH, Door" className="border-slate-600 bg-slate-700/50 text-white" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void handleCreate()} disabled={saving || !staffMemberId} className="w-full bg-gradient-to-r from-cyan-500 to-purple-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add shift
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader>
          <CardTitle className="text-white text-base">
            {rangeMode === "week" ? `Scheduled ${date} → ${dateTo}` : `Scheduled for ${date}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sortedShifts.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No shifts in this range.</p>
          ) : (
            <ul className="space-y-3">
              {sortedShifts.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm">
                  <div>
                    <p className="text-white font-medium">
                      {rangeMode === "week" || s.shift_date !== date ? (
                        <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs font-normal text-cyan-300">{s.shift_date}</span>
                      ) : null}
                      {s.start_time} – {s.end_time}
                    </p>
                    <p className="text-slate-400 text-xs">{s.role_assignment || s.notes || "Shift"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize border-slate-600 text-slate-300">
                      {s.status}
                    </Badge>
                    {s.status !== "cancelled" && s.status !== "completed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-rose-300 hover:text-rose-200"
                        onClick={() => void handleCancelShift(s.id)}
                        disabled={cancellingId === s.id}
                      >
                        {cancellingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />}
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
