"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useArtist } from "@/contexts/artist-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { format } from "date-fns"
import { Users, Plus, ArrowLeft, Calendar, CheckCircle, ListTodo, Route } from "lucide-react"
import Link from "next/link"
import {
  fetchArtistCollaboration,
  memberDisplayName,
  type CollaborationTour,
  type CollaborationTeam,
  type CollaborationLogisticsTask,
} from "@/lib/services/artist-collaboration.service"

const LOGISTICS_TYPES = [
  "transportation",
  "equipment",
  "lodging",
  "catering",
  "communication",
  "backline",
  "rental",
] as const

function statusBadge(status: string) {
  if (status === "completed") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
  if (status === "in_progress" || status === "confirmed") return "bg-amber-500/15 text-amber-300 border-amber-500/30"
  if (status === "cancelled") return "bg-slate-600/30 text-slate-400 border-slate-600"
  return "bg-slate-700/50 text-slate-300 border-slate-600"
}

function CollaborationPageInner() {
  const { user } = useArtist()
  const supabase = createClientComponentClient()
  const searchParams = useSearchParams()
  const focus = searchParams.get("focus")

  const [tab, setTab] = useState<string>(() => (focus === "task" ? "tasks" : "tours"))
  const [tours, setTours] = useState<CollaborationTour[]>([])
  const [teams, setTeams] = useState<CollaborationTeam[]>([])
  const [tasks, setTasks] = useState<CollaborationLogisticsTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [taskTourId, setTaskTourId] = useState<string>("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskType, setTaskType] = useState<string>("communication")
  const [taskDue, setTaskDue] = useState("")

  const load = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const data = await fetchArtistCollaboration(supabase, user.id)
      setTours(data.tours)
      setTeams(data.teams)
      setTasks(data.tasks)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load collaboration data")
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (tours[0]?.id && !taskTourId) setTaskTourId(tours[0].id)
  }, [tours, taskTourId])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  useEffect(() => {
    if (focus === "task") setTab("tasks")
  }, [focus])

  const handleCreateTask = async () => {
    if (!user || !taskTourId || !taskTitle.trim()) {
      toast.error("Pick a tour and enter a title")
      return
    }
    try {
      const { error } = await supabase.from("logistics_tasks").insert({
        tour_id: taskTourId,
        type: taskType,
        title: taskTitle.trim(),
        status: "pending",
        priority: "medium",
        created_by: user.id,
        due_date: taskDue || null,
      })
      if (error) throw error
      toast.success("Task created")
      setShowTaskDialog(false)
      setTaskTitle("")
      setTaskDue("")
      await load()
    } catch (e) {
      console.error(e)
      toast.error("Could not create task")
    }
  }

  const memberCount = teams.reduce((n, t) => n + t.members.length, 0)
  const openTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/artist/business">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business
            </Button>
          </Link>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tours & logistics</h1>
              <p className="text-slate-400 text-sm">Teams and tasks from tours you&apos;re on</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-slate-700"
            disabled={!tours.length}
            onClick={() => setShowTaskDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New task
          </Button>
        </div>
      </div>

      {!tours.length && !tasks.length ? (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-slate-300 text-sm">
          <p className="mb-2">
            You&apos;re not linked to any tours yet, and you have no assigned logistics tasks. When a tour adds you as an
            artist, it will show up here.
          </p>
          <p>
            Plan shows from your side in{" "}
            <Link href="/artist/events" className="text-purple-400 hover:underline">
              Events
            </Link>
            . Org tour setup lives in{" "}
            <Link href="/admin/dashboard/tours" className="text-purple-400 hover:underline">
              Dashboard → Tours
            </Link>{" "}
            for team leads.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Tours</p>
              <p className="text-2xl font-bold text-white">{tours.length}</p>
            </div>
            <Route className="h-8 w-8 text-indigo-400" />
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Team seats</p>
              <p className="text-2xl font-bold text-white">{memberCount}</p>
            </div>
            <Users className="h-8 w-8 text-purple-400" />
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Open tasks</p>
              <p className="text-2xl font-bold text-white">{openTasks}</p>
            </div>
            <ListTodo className="h-8 w-8 text-emerald-400" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-slate-800/60 border border-slate-700/50 w-full sm:w-auto">
          <TabsTrigger value="tours">Tours</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="tours" className="space-y-4">
          {tours.length === 0 ? (
            <p className="text-slate-500 text-sm">No tours yet.</p>
          ) : (
            tours.map(tour => (
              <Card key={tour.id} className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-white">{tour.name}</CardTitle>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {tour.status || "—"}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {tour.start_date || "?"} → {tour.end_date || "?"}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          {teams.length === 0 ? (
            <p className="text-slate-500 text-sm">No tour teams for your tours.</p>
          ) : (
            teams.map(team => (
              <Card key={team.id} className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg">{team.name}</CardTitle>
                  <CardDescription className="text-slate-400">
                    {team.team_type || "Team"} · Tour {team.tour_id.slice(0, 8)}…
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.members.length === 0 ? (
                    <p className="text-sm text-slate-500">No members listed.</p>
                  ) : (
                    team.members.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-sm border border-slate-700/40 rounded-lg px-3 py-2"
                      >
                        <span className="text-white">{memberDisplayName(m)}</span>
                        <span className="text-slate-400">{m.role || "Role TBD"}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-sm">No logistics tasks for your tours or assignments.</p>
          ) : (
            tasks.map(task => (
              <Card key={task.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {task.type} · Due {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={statusBadge(task.status)}>
                      {task.status.replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {task.priority}
                    </Badge>
                    {task.assigned_to_user_id === user?.id ? (
                      <Badge className="bg-purple-500/20 text-purple-200">You</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New logistics task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tour</Label>
              <Select value={taskTourId} onValueChange={setTaskTourId}>
                <SelectTrigger className="bg-slate-950 border-slate-700">
                  <SelectValue placeholder="Select tour" />
                </SelectTrigger>
                <SelectContent>
                  {tours.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="bg-slate-950 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGISTICS_TYPES.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="bg-slate-950 border-slate-700"
                placeholder="e.g. Confirm backline delivery"
              />
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                className="bg-slate-950 border-slate-700"
              />
            </div>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateTask}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CollaborationPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-slate-800 rounded-xl w-1/2" />
        </div>
      }
    >
      <CollaborationPageInner />
    </Suspense>
  )
}
