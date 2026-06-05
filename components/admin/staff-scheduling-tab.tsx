"use client"

import { useState, useCallback, useEffect } from "react"
import { Plus, ChevronLeft, ChevronRight, Trash2, RefreshCw, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Shift {
  id: string
  staff_member_id: string
  staff_member_name?: string
  shift_date: string
  start_time: string
  end_time: string
  zone_assignment?: string
  role_assignment?: string
  notes?: string
  status?: string
}

interface Zone {
  id: string
  name: string
  color?: string
  venue_id?: string
}

interface StaffMember {
  id: string
  full_name?: string
  role?: string
}

const ZONE_COLORS = [
  'bg-purple-500/30 border-purple-500/40 text-purple-300',
  'bg-blue-500/30 border-blue-500/40 text-blue-300',
  'bg-green-500/30 border-green-500/40 text-green-300',
  'bg-orange-500/30 border-orange-500/40 text-orange-300',
  'bg-pink-500/30 border-pink-500/40 text-pink-300',
  'bg-cyan-500/30 border-cyan-500/40 text-cyan-300',
]

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export function StaffSchedulingTab({ venueId }: { venueId?: string }) {
  const today = new Date()
  today.setDate(today.getDate() - today.getDay()) // start of this week (Sunday)
  const [weekStart, setWeekStart] = useState(today)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteShift, setDeleteShift] = useState<Shift | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    staff_member_id: '',
    shift_date: isoDate(today),
    start_time: '09:00',
    end_time: '17:00',
    zone_assignment: '',
    role_assignment: '',
    notes: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const vid = venueId || 'default'
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const [shiftsRes, zonesRes, staffRes] = await Promise.allSettled([
        fetch(`/api/admin/staffing/shifts?venueId=${vid}&date_from=${isoDate(weekStart)}&date_to=${isoDate(weekEnd)}`, { credentials: 'include' }),
        fetch(`/api/admin/staffing/zones?venue_id=${vid}`, { credentials: 'include' }),
        fetch('/api/admin/staff?limit=100', { credentials: 'include' }),
      ])

      if (shiftsRes.status === 'fulfilled' && shiftsRes.value.ok) {
        const d = await shiftsRes.value.json()
        setShifts(d.data || [])
      }
      if (zonesRes.status === 'fulfilled' && zonesRes.value.ok) {
        const d = await zonesRes.value.json()
        setZones(d.data || d.zones || [])
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json()
        setStaffMembers(d.data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [weekStart, venueId])

  useEffect(() => { void fetchData() }, [fetchData])

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d)
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d)
  }

  function checkConflict(staffId: string, date: string, start: string, end: string): boolean {
    return shifts.some(s =>
      s.staff_member_id === staffId &&
      s.shift_date === date &&
      !(s.end_time <= start || s.start_time >= end)
    )
  }

  async function addShift() {
    if (!form.staff_member_id) { toast.error('Select a staff member'); return }
    const hasConflict = checkConflict(form.staff_member_id, form.shift_date, form.start_time, form.end_time)
    if (hasConflict) {
      setConflict(`${staffMembers.find(s => s.id === form.staff_member_id)?.full_name || 'Staff'} already has a shift that overlaps this time.`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/staffing/shifts', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueId || 'default', ...form }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Shift added')
      setShowAddDialog(false)
      setConflict(null)
      void fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add shift')
    } finally {
      setSaving(false) }
  }

  async function removeShift(s: Shift) {
    try {
      await fetch(`/api/admin/staffing/shifts/${s.id}`, { method: 'DELETE', credentials: 'include' })
      toast.success('Shift removed')
      setDeleteShift(null)
      void fetchData()
    } catch { toast.error('Failed to remove shift') }
  }

  async function copyWeek() {
    const nextWeekStart = new Date(weekStart)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)
    const weekShifts = shifts.filter(s => {
      const d = new Date(s.shift_date)
      return d >= weekStart && d <= new Date(weekStart.getTime() + 6 * 86400000)
    })
    if (weekShifts.length === 0) { toast.info('No shifts to copy'); return }

    try {
      await Promise.all(weekShifts.map(s => {
        const newDate = new Date(s.shift_date)
        newDate.setDate(newDate.getDate() + 7)
        return fetch('/api/admin/staffing/shifts', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_id: venueId || 'default',
            staff_member_id: s.staff_member_id,
            shift_date: isoDate(newDate),
            start_time: s.start_time,
            end_time: s.end_time,
            zone_assignment: s.zone_assignment,
            role_assignment: s.role_assignment,
          }),
        })
      }))
      toast.success(`Copied ${weekShifts.length} shift(s) to next week`)
      void fetchData()
    } catch { toast.error('Failed to copy shifts') }
  }

  const weekDates = getWeekDates(weekStart)
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const uniqueStaffIds = [...new Set(shifts.map(s => s.staff_member_id))]

  function getShiftColor(zoneAssignment?: string): string {
    if (!zoneAssignment) return ZONE_COLORS[0]
    const idx = zones.findIndex(z => z.name === zoneAssignment || z.id === zoneAssignment)
    return ZONE_COLORS[idx >= 0 ? idx % ZONE_COLORS.length : 0]
  }

  const staffMap = new Map(staffMembers.map(s => [s.id, s]))

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevWeek} className="border-slate-700 text-slate-300 h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-white text-sm font-medium min-w-40 text-center">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Button variant="outline" size="sm" onClick={nextWeek} className="border-slate-700 text-slate-300 h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyWeek} className="border-slate-700 text-slate-300 h-8 text-xs">
            Copy to Next Week
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Shift
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : (
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-8 bg-slate-800/60 border-b border-slate-700/50">
            <div className="p-3 text-slate-400 text-xs font-medium">Staff</div>
            {weekDates.map((d, i) => {
              const isToday = isoDate(d) === isoDate(new Date())
              return (
                <div key={i} className={`p-3 text-xs font-medium text-center ${isToday ? 'text-purple-400 bg-purple-500/5' : 'text-slate-400'}`}>
                  <div>{DAY_LABELS[i]}</div>
                  <div className={`text-sm font-bold ${isToday ? 'text-purple-300' : 'text-white'}`}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Staff rows */}
          {uniqueStaffIds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No shifts scheduled for this week. Click "Add Shift" to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {uniqueStaffIds.map(staffId => {
                const member = staffMap.get(staffId)
                const memberShifts = shifts.filter(s => s.staff_member_id === staffId)
                return (
                  <div key={staffId} className="grid grid-cols-8 hover:bg-slate-800/20 transition-colors">
                    <div className="p-3 flex items-center">
                      <div>
                        <p className="text-white text-xs font-medium truncate max-w-[100px]">
                          {member?.full_name || shifts.find(s => s.staff_member_id === staffId)?.staff_member_name || staffId.slice(0, 8)}
                        </p>
                        <p className="text-slate-500 text-xs capitalize">{member?.role || ''}</p>
                      </div>
                    </div>
                    {weekDates.map((d, di) => {
                      const dayShifts = memberShifts.filter(s => s.shift_date === isoDate(d))
                      return (
                        <div key={di} className="p-1 min-h-[52px] border-l border-slate-800/30">
                          {dayShifts.map(s => (
                            <div
                              key={s.id}
                              className={`rounded px-1.5 py-0.5 text-xs border mb-0.5 flex items-center justify-between group ${getShiftColor(s.zone_assignment)}`}
                            >
                              <span className="truncate">{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 ml-1 shrink-0"
                                onClick={() => setDeleteShift(s)}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Zone legend */}
      {zones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-slate-500 text-xs self-center">Zones:</span>
          {zones.map((z, i) => (
            <Badge key={z.id} className={`text-xs border ${ZONE_COLORS[i % ZONE_COLORS.length]}`}>
              {z.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Add shift dialog */}
      <Dialog open={showAddDialog} onOpenChange={() => { setShowAddDialog(false); setConflict(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Shift</DialogTitle>
          </DialogHeader>
          {conflict && (
            <div className="flex items-start gap-2 p-3 bg-yellow-950/30 border border-yellow-700/40 rounded-sm text-yellow-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{conflict} Proceeding anyway will create an overlapping shift.</span>
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Staff Member *</Label>
              <Select value={form.staff_member_id} onValueChange={v => setForm(p => ({ ...p, staff_member_id: v }))}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-48 overflow-y-auto">
                  {staffMembers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name || s.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Date *</Label>
                <Input type="date" value={form.shift_date} onChange={e => setForm(p => ({ ...p, shift_date: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Start *</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">End *</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Zone / Area</Label>
                <Select value={form.zone_assignment} onValueChange={v => setForm(p => ({ ...p, zone_assignment: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue placeholder="Any zone" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="">Any zone</SelectItem>
                    {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Role</Label>
                <Input value={form.role_assignment} onChange={e => setForm(p => ({ ...p, role_assignment: e.target.value }))} placeholder="e.g. Security" className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setConflict(null) }} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={addShift} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              {saving ? 'Saving...' : conflict ? 'Add Anyway' : 'Add Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteShift} onOpenChange={() => setDeleteShift(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Shift?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Remove this shift from the schedule?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteShift && removeShift(deleteShift)} className="bg-red-600 hover:bg-red-700 text-white border-0">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
