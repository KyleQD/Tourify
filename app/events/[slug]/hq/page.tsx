"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft, Megaphone, FileText, Calendar, Users, Plus, Pin,
  Clock, MapPin, AlertTriangle, Info, Loader2, CheckCircle, Trash2,
  ExternalLink, StickyNote, Globe, BookOpen, Phone, Star, Send, Bell, Eye,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

const PRIORITY_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  info: { label: "Info", className: "bg-blue-600/20 text-blue-300 border-blue-600/30", icon: Info },
  important: { label: "Important", className: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30", icon: Star },
  urgent: { label: "Urgent", className: "bg-orange-600/20 text-orange-300 border-orange-600/30", icon: AlertTriangle },
  emergency: { label: "Emergency", className: "bg-red-600/20 text-red-300 border-red-600/30", icon: Bell },
}

const RESOURCE_ICONS: Record<string, any> = {
  link: Globe, document: FileText, note: StickyNote, itinerary: BookOpen, contact: Phone, file: FileText,
}

const CALENDAR_TYPE_COLORS: Record<string, string> = {
  deadline: "bg-red-500", meeting: "bg-blue-500", rehearsal: "bg-purple-500",
  setup: "bg-amber-500", performance: "bg-green-500", load_in: "bg-teal-500",
  load_out: "bg-teal-600", soundcheck: "bg-indigo-500", doors_open: "bg-emerald-500",
  curfew: "bg-rose-500", custom: "bg-slate-500",
}

export default function PublicEventHQPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const eventId = params.slug as string

  const [isLoading, setIsLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("staff")
  const [permissions, setPermissions] = useState({ can_post_bulletins: false, can_add_resources: false, can_edit_calendar: false, can_manage_tasks: false, can_manage_team: false })
  const [bulletins, setBulletins] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [calendarItems, setCalendarItems] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("bulletin")

  useEffect(() => { loadHQ() }, [eventId])

  async function loadHQ() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hq`, { credentials: "include" })
      if (res.status === 403) {
        toast({ title: "Access denied", description: "You are not a member of this event.", variant: "destructive" })
        router.push("/dashboard")
        return
      }
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setEvent(data.event)
      setUserRole(data.userRole)
      setPermissions(data.permissions || { can_post_bulletins: false, can_add_resources: false, can_edit_calendar: false, can_manage_tasks: false, can_manage_team: false })
      setBulletins(data.bulletins || [])
      setResources(data.resources || [])
      setCalendarItems(data.calendar || [])
      setTeam(data.team || [])
      setTasks(data.tasks || [])
    } catch (error) {
      console.error("Failed to load Event HQ:", error)
      toast({ title: "Failed to load Event HQ", variant: "destructive" })
    } finally { setIsLoading(false) }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-purple-400" /></div>
  }

  if (!event) {
    return (
      <div className="text-center py-16 text-white">
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <p className="text-slate-400 mb-4">You may not have access to this event, or it doesn't exist.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </div>
    )
  }

  const pinnedBulletins = bulletins.filter(b => b.pinned)
  const regularBulletins = bulletins.filter(b => !b.pinned)
  const upcomingCalendar = calendarItems.filter(item => new Date(item.start_time) >= new Date())
  const pastCalendar = calendarItems.filter(item => new Date(item.start_time) < new Date())

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 text-white pb-20">
      {/* Header */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Badge variant="outline" className="capitalize border-purple-600/50 text-purple-300">{userRole}</Badge>
        </div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-slate-400 mt-1">Event HQ</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
          {event.start_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatSafeDate(event.start_at)}</span>}
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{team.length} team</span>
        </div>
      </div>

      {/* Pinned */}
      {pinnedBulletins.map(b => {
        const pri = PRIORITY_CONFIG[b.priority] || PRIORITY_CONFIG.info
        const Icon = pri.icon
        return (
          <Card key={b.id} className="border-purple-600/40 bg-purple-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Pin className="h-4 w-4 text-purple-400 mt-1 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-semibold">{b.title}</h4>
                  <Badge variant="outline" className={cn("text-xs", pri.className)}><Icon className="h-3 w-3 mr-1" />{pri.label}</Badge>
                </div>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{b.content}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 grid w-full grid-cols-5">
          <TabsTrigger value="bulletin"><Megaphone className="h-4 w-4 mr-1" />Bulletin</TabsTrigger>
          <TabsTrigger value="resources"><FileText className="h-4 w-4 mr-1" />Resources</TabsTrigger>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" />Team</TabsTrigger>
          <TabsTrigger value="tasks"><CheckCircle className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
        </TabsList>

        {/* Bulletin */}
        <TabsContent value="bulletin" className="mt-6 space-y-3">
          {regularBulletins.length === 0 && pinnedBulletins.length === 0 ? (
            <div className="text-center py-12"><Megaphone className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No bulletins posted yet.</p></div>
          ) : regularBulletins.map(b => {
            const pri = PRIORITY_CONFIG[b.priority] || PRIORITY_CONFIG.info
            const Icon = pri.icon
            return (
              <Card key={b.id} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">{b.title}</h4>
                    <Badge variant="outline" className={cn("text-xs", pri.className)}><Icon className="h-3 w-3 mr-1" />{pri.label}</Badge>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{b.content}</p>
                  <p className="text-slate-500 text-xs mt-2">{formatSafeDate(b.created_at)}</p>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Resources */}
        <TabsContent value="resources" className="mt-6">
          {resources.length === 0 ? (
            <div className="text-center py-12"><FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No resources shared yet.</p></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {resources.map((r: any) => {
                const TypeIcon = RESOURCE_ICONS[r.type] || FileText
                return (
                  <Card key={r.id} className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0"><TypeIcon className="h-4 w-4 text-purple-400" /></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{r.title}</h4>
                        {r.category && <Badge variant="outline" className="text-xs mt-1 border-slate-600">{r.category}</Badge>}
                        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 mt-1 flex items-center gap-1 truncate"><ExternalLink className="h-3 w-3 shrink-0" />{r.url}</a>}
                        {r.content && <p className="text-slate-400 text-sm mt-1 line-clamp-3">{r.content}</p>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-6 space-y-4">
          {calendarItems.length === 0 ? (
            <div className="text-center py-12"><Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No calendar items yet.</p></div>
          ) : (
            <>
              {upcomingCalendar.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingCalendar.map((item: any) => (
                      <Card key={item.id} className="bg-slate-900 border-slate-700">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={cn("w-1 h-12 rounded-full shrink-0", CALENDAR_TYPE_COLORS[item.type] || "bg-slate-500")} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-medium">{item.title}</h4>
                              <Badge variant="outline" className="text-xs border-slate-600 capitalize">{item.type.replace(/_/g, " ")}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.start_time).toLocaleString()}</span>
                              {item.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {pastCalendar.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Past</h3>
                  <div className="space-y-2 opacity-60">
                    {pastCalendar.map((item: any) => (
                      <Card key={item.id} className="bg-slate-900/50 border-slate-800">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={cn("w-1 h-10 rounded-full shrink-0", CALENDAR_TYPE_COLORS[item.type] || "bg-slate-500")} />
                          <div><h4 className="text-slate-300 font-medium">{item.title}</h4><p className="text-xs text-slate-500">{new Date(item.start_time).toLocaleString()}</p></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m: any) => (
              <Card key={m.id} className="bg-slate-900 border-slate-700">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.profiles?.avatar_url} />
                    <AvatarFallback className="bg-purple-600/20 text-purple-300">{(m.profiles?.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{m.profiles?.full_name || m.profiles?.username || "Team member"}</p>
                    <p className="text-slate-400 text-sm truncate">{m.profiles?.email}</p>
                  </div>
                  <Badge variant="outline" className="capitalize border-slate-600 text-slate-300 shrink-0">{m.role || "staff"}</Badge>
                </CardContent>
              </Card>
            ))}
            {team.length === 0 && <div className="col-span-full text-center py-12"><Users className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No team members.</p></div>}
          </div>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks" className="mt-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12"><CheckCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No tasks yet.</p></div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <Card key={t.id} className="bg-slate-900 border-slate-700">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0", t.status === "completed" ? "bg-green-600 border-green-600" : "border-slate-500")}>
                      {t.status === "completed" && <CheckCircle className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1"><p className={cn("text-sm font-medium", t.status === "completed" ? "text-slate-500 line-through" : "text-white")}>{t.title || t.name}</p>{t.due_date && <p className="text-xs text-slate-500">Due: {formatSafeDate(t.due_date)}</p>}</div>
                    <Badge variant="outline" className="text-xs border-slate-600 capitalize">{t.status || "pending"}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
