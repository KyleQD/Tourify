"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { AddEventModal, AddBookingModal, AddTeamMemberModal, AddTaskModal } from "@/components/dashboard/modals"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Define interfaces for your data
interface Event { id: string; name: string; venue: string; date: Date }
interface Booking { id: string; eventId: string; client: string; event: string; amount: number; date: Date }
interface TeamMember { id: string; eventId: string; name: string; role: string; email: string }
interface Task { id: string; eventId: string; title: string; description: string; dueDate: Date; status: "pending" | "in-progress" | "completed" }

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [isEventModalOpen, setEventModalOpen] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [isBookingModalOpen, setBookingModalOpen] = useState(false)
  const [isTeamModalOpen, setTeamModalOpen] = useState(false)
  const [isTaskModalOpen, setTaskModalOpen] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem("events")
      const savedBookings = localStorage.getItem("bookings")
      const savedTeamMembers = localStorage.getItem("teamMembers")
      const savedTasks = localStorage.getItem("tasks")
      
      if (savedEvents && savedEvents.trim() !== '') {
        setEvents(JSON.parse(savedEvents))
      }
      if (savedBookings && savedBookings.trim() !== '') {
        setBookings(JSON.parse(savedBookings))
      }
      if (savedTeamMembers && savedTeamMembers.trim() !== '') {
        setTeamMembers(JSON.parse(savedTeamMembers))
      }
      if (savedTasks && savedTasks.trim() !== '') {
        setTasks(JSON.parse(savedTasks))
      }
    } catch (error) {
      console.warn("Error loading data from localStorage:", error)
      // Clear potentially corrupted data
      localStorage.removeItem("events")
      localStorage.removeItem("bookings")
      localStorage.removeItem("teamMembers")
      localStorage.removeItem("tasks")
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => { localStorage.setItem("events", JSON.stringify(events)) }, [events])
  useEffect(() => { localStorage.setItem("bookings", JSON.stringify(bookings)) }, [bookings])
  useEffect(() => { localStorage.setItem("teamMembers", JSON.stringify(teamMembers)) }, [teamMembers])
  useEffect(() => { localStorage.setItem("tasks", JSON.stringify(tasks)) }, [tasks])

  function handleAddEvent(event: Event) {
    setEvents(prev => [...prev, event])
    setActiveEventId(event.id)
    setEventModalOpen(false)
  }

  function handleEditEvent(updated: Event) {
    setEvents(events.map(e => e.id === updated.id ? updated : e))
    setEditEventId(null)
  }

  function handleDeleteEvent(id: string) {
    setEvents(events.filter(e => e.id !== id))
    if (activeEventId === id) setActiveEventId(events.length > 1 ? events.find(e => e.id !== id)?.id || null : null)
  }

  // CRUD handlers for bookings
  function handleAddBooking(booking: Booking) {
    setBookings([...bookings, booking])
    setBookingModalOpen(false)
    toast.success("Booking added")
  }
  function handleDeleteBooking(id: string) {
    setBookings(bookings.filter(b => b.id !== id))
    toast.success("Booking deleted")
  }

  // CRUD handlers for team members
  function handleAddTeamMember(member: TeamMember) {
    setTeamMembers([...teamMembers, member])
    setTeamModalOpen(false)
    toast.success("Team member added")
  }
  function handleDeleteTeamMember(id: string) {
    setTeamMembers(teamMembers.filter(m => m.id !== id))
    toast.success("Team member deleted")
  }

  // CRUD handlers for tasks
  function handleAddTask(task: Task) {
    setTasks([...tasks, task])
    setTaskModalOpen(false)
    toast.success("Task added")
  }
  function handleDeleteTask(id: string) {
    setTasks(tasks.filter(t => t.id !== id))
    toast.success("Task deleted")
  }

  // Filter data by active event
  const activeEvent = events.find(e => e.id === activeEventId) || null
  const filteredBookings = bookings.filter(b => b.eventId === activeEventId)
  const filteredTeamMembers = teamMembers.filter(m => m.eventId === activeEventId)
  const filteredTasks = tasks.filter(t => t.eventId === activeEventId)
  const totalRevenue = filteredBookings.reduce((sum, b) => sum + b.amount, 0)

  return (
    <div className="space-y-6">
      {/* Top bar: event switcher and new event button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <select
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-100"
            value={activeEventId || ''}
            onChange={e => setActiveEventId(e.target.value)}
          >
            <option value="" disabled>Select Event</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
          {activeEvent && (
            <>
              <Button size="icon" variant="ghost" onClick={() => setEditEventId(activeEvent.id)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(activeEvent.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </>
          )}
        </div>
        <Button onClick={() => setEventModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          + New Event
        </Button>
        <AddEventModal open={isEventModalOpen} onOpenChange={setEventModalOpen} onAddEvent={handleAddEvent} />
      </div>

      {activeEvent ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/events" className="block">
              <Card className="p-6 cursor-pointer hover:ring-2 hover:ring-purple-500 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Upcoming Events</h3>
                    <p className="text-2xl font-bold">{events.length}</p>
                  </div>
                  <AddEventModal onAddEvent={handleAddEvent} />
                </div>
              </Card>
            </Link>
            <Link href="/dashboard/bookings" className="block">
              <Card className="p-6 cursor-pointer hover:ring-2 hover:ring-purple-500 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Total Bookings</h3>
                    <p className="text-2xl font-bold">{filteredBookings.length}</p>
                  </div>
                  <AddBookingModal onAddBooking={b => setBookings([...bookings, { ...b, eventId: activeEventId! }])} />
                </div>
              </Card>
            </Link>
            <Link href="/dashboard/bookings" className="block">
              <Card className="p-6 cursor-pointer hover:ring-2 hover:ring-purple-500 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Revenue</h3>
                    <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <AddBookingModal onAddBooking={b => setBookings([...bookings, { ...b, eventId: activeEventId! }])} />
                </div>
              </Card>
            </Link>
            <Link href="/dashboard/team-members" className="block">
              <Card className="p-6 cursor-pointer hover:ring-2 hover:ring-purple-500 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Team Members</h3>
                    <p className="text-2xl font-bold">{filteredTeamMembers.length}</p>
                  </div>
                  <AddTeamMemberModal onAddTeamMember={m => setTeamMembers([...teamMembers, { ...m, eventId: activeEventId! }])} />
                </div>
              </Card>
            </Link>
          </div>
          <QuickActionsCard />

          {/* Bookings Management */}
          <div className="bg-[#181b2a] border border-[#23263a] rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Bookings</h2>
              <Button onClick={() => setBookingModalOpen(true)} size="sm">Add Booking</Button>
              <AddBookingModal open={isBookingModalOpen} onOpenChange={setBookingModalOpen} onAddBooking={b => handleAddBooking({ ...b, eventId: activeEventId! })} />
            </div>
            {filteredBookings.length === 0 ? (
              <div className="text-slate-400">No bookings for this event.</div>
            ) : (
              <ul className="divide-y divide-[#23263a]">
                {filteredBookings.map(b => (
                  <li key={b.id} className="flex justify-between items-center py-2">
                    <div>
                      <div className="font-medium">{b.client}</div>
                      <div className="text-xs text-slate-400">{b.event} &middot; ${b.amount} &middot; {formatSafeDate(b.date.toISOString())}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteBooking(b.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Team Members Management */}
          <div className="bg-[#181b2a] border border-[#23263a] rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Team Members</h2>
              <Button onClick={() => setTeamModalOpen(true)} size="sm">Add Member</Button>
              <AddTeamMemberModal open={isTeamModalOpen} onOpenChange={setTeamModalOpen} onAddTeamMember={m => handleAddTeamMember({ ...m, eventId: activeEventId! })} />
            </div>
            {filteredTeamMembers.length === 0 ? (
              <div className="text-slate-400">No team members for this event.</div>
            ) : (
              <ul className="divide-y divide-[#23263a]">
                {filteredTeamMembers.map(m => (
                  <li key={m.id} className="flex justify-between items-center py-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-400">{m.role} &middot; {m.email}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteTeamMember(m.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tasks Management */}
          <div className="bg-[#181b2a] border border-[#23263a] rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tasks</h2>
              <Button onClick={() => setTaskModalOpen(true)} size="sm">Add Task</Button>
              <AddTaskModal open={isTaskModalOpen} onOpenChange={setTaskModalOpen} onAddTask={t => handleAddTask({ ...t, eventId: activeEventId! })} />
            </div>
            {filteredTasks.length === 0 ? (
              <div className="text-slate-400">No tasks for this event.</div>
            ) : (
              <ul className="divide-y divide-[#23263a]">
                {filteredTasks.map(t => (
                  <li key={t.id} className="flex justify-between items-center py-2">
                    <div>
                      <div className="font-medium">{t.title}</div>
                      <div className="text-xs text-slate-400">{t.description} &middot; {formatSafeDate(t.dueDate.toISOString())} &middot; {t.status}</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteTask(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="text-center text-slate-400 py-12 text-lg">No event selected. Create or select an event to get started.</div>
      )}
    </div>
  )
} 