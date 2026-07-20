"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Megaphone, FileText, Calendar, Users, Link2, Plus, Pin,
  Clock, MapPin, AlertTriangle, Info, Loader2, CheckCircle, Trash2,
  ExternalLink, StickyNote, Globe, BookOpen, Phone, Briefcase,
  Music, Shield, Star, Send, Bell, Eye, MessageCircle,
} from "lucide-react"
import { EventChatsPanel } from "@/components/admin/events/event-chats-panel"
import { EventTaskManager } from "@/components/admin/event-task-manager"
import { EventSecureUploads } from "@/components/admin/event-secure-uploads"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { featureUnavailableMessage, isFeatureUnavailableResponse } from "@/lib/api/feature-unavailable"

const PRIORITY_CONFIG = {
  info: { label: "Info", className: "bg-blue-600/20 text-blue-300 border-blue-600/30", icon: Info },
  important: { label: "Important", className: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30", icon: Star },
  urgent: { label: "Urgent", className: "bg-orange-600/20 text-orange-300 border-orange-600/30", icon: AlertTriangle },
  emergency: { label: "Emergency", className: "bg-red-600/20 text-red-300 border-red-600/30", icon: Bell },
}

const RESOURCE_ICONS: Record<string, any> = {
  link: Globe, document: FileText, note: StickyNote, itinerary: BookOpen,
  contact: Phone, file: FileText,
}

const CALENDAR_TYPE_COLORS: Record<string, string> = {
  deadline: "bg-red-500", meeting: "bg-blue-500", rehearsal: "bg-purple-500",
  setup: "bg-amber-500", performance: "bg-green-500", load_in: "bg-teal-500",
  load_out: "bg-teal-600", soundcheck: "bg-indigo-500", doors_open: "bg-emerald-500",
  curfew: "bg-rose-500", custom: "bg-slate-500",
}

export default function EventHQPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const eventId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [event, setEvent] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("staff")
  const [isAdmin, setIsAdmin] = useState(false)
  const [permissions, setPermissions] = useState({
    can_view_resources: false,
    can_post_bulletins: false,
    can_moderate_bulletins: false,
    can_add_resources: false,
    can_edit_calendar: false,
    can_manage_tasks: false,
    can_manage_team: false,
  })
  const [bulletins, setBulletins] = useState<any[]>([])
  const [resources, setResources] = useState<any[]>([])
  const [calendarItems, setCalendarItems] = useState<any[]>([])
  const [team, setTeam] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("bulletin")
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [permTarget, setPermTarget] = useState<any>(null)
  const [permValues, setPermValues] = useState({
    can_view_resources: false,
    can_post_bulletins: false,
    can_moderate_bulletins: false,
    can_add_resources: false,
    can_edit_calendar: false,
    can_manage_tasks: false,
    can_manage_team: false,
  })

  const [showBulletinDialog, setShowBulletinDialog] = useState(false)
  const [showResourceDialog, setShowResourceDialog] = useState(false)
  const [showCalendarDialog, setShowCalendarDialog] = useState(false)

  const [bulletinTitle, setBulletinTitle] = useState("")
  const [bulletinContent, setBulletinContent] = useState("")
  const [bulletinPriority, setBulletinPriority] = useState("info")
  const [bulletinPinned, setBulletinPinned] = useState(false)

  const [resourceTitle, setResourceTitle] = useState("")
  const [resourceType, setResourceType] = useState("link")
  const [resourceUrl, setResourceUrl] = useState("")
  const [resourceContent, setResourceContent] = useState("")
  const [resourceCategory, setResourceCategory] = useState("")

  const [calTitle, setCalTitle] = useState("")
  const [calType, setCalType] = useState("meeting")
  const [calStart, setCalStart] = useState("")
  const [calEnd, setCalEnd] = useState("")
  const [calLocation, setCalLocation] = useState("")
  const [calDesc, setCalDesc] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showStaffingDialog, setShowStaffingDialog] = useState(false)
  const [staffingTitle, setStaffingTitle] = useState("")
  const [staffingDescription, setStaffingDescription] = useState("")

  const loadHQ = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hq`, { credentials: "include" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setEvent(data.event)
      setUserRole(data.userRole)
      setIsAdmin(data.isAdmin)
      setPermissions(data.permissions || {
        can_view_resources: true,
        can_post_bulletins: data.isAdmin,
        can_moderate_bulletins: data.isAdmin,
        can_add_resources: data.isAdmin,
        can_edit_calendar: data.isAdmin,
        can_manage_tasks: data.isAdmin,
        can_manage_team: data.isAdmin,
      })
      setBulletins(data.bulletins || [])
      setResources(data.resources || [])
      setCalendarItems(data.calendar || [])
      setTeam(data.team || [])
      setTasks(data.tasks || [])
    } catch (error) {
      console.error("Failed to load Event HQ:", error)
      toast({ title: "Failed to load Event HQ", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [eventId, toast])

  useEffect(() => {
    void loadHQ()
  }, [loadHQ])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "bulletin" || tab === "resources" || tab === "calendar" || tab === "team" || tab === "tasks" || tab === "documents" || tab === "chats")
      setActiveTab(tab)
  }, [searchParams])

  async function handlePostBulletin() {
    if (!bulletinTitle.trim() || !bulletinContent.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}/communications`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: bulletinTitle, content: bulletinContent, priority: bulletinPriority, pinned: bulletinPinned, visible_to: ["all"] }),
      })
      const data = await res.json()
      if (isFeatureUnavailableResponse(res.status, data))
        throw new Error(featureUnavailableMessage(data, "Bulletins are temporarily unavailable."))
      if (!data.success) throw new Error(data.error || "Failed to post bulletin")
      setBulletins(prev => [data.bulletin, ...prev])
      setBulletinTitle(""); setBulletinContent(""); setBulletinPriority("info"); setBulletinPinned(false)
      setShowBulletinDialog(false)
      toast({ title: "Bulletin posted" })
    } catch (error) {
      toast({ title: "Failed to post", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    } finally { setIsSubmitting(false) }
  }

  async function handleAddResource() {
    if (!resourceTitle.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hq/resources`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: resourceTitle, type: resourceType, url: resourceUrl || undefined, content: resourceContent || undefined, category: resourceCategory || undefined }),
      })
      const data = await res.json()
      if (isFeatureUnavailableResponse(res.status, data))
        throw new Error(featureUnavailableMessage(data, "Resources are temporarily unavailable."))
      if (!data.success) throw new Error(data.error || "Failed to add resource")
      setResources(prev => [data.resource, ...prev])
      setResourceTitle(""); setResourceType("link"); setResourceUrl(""); setResourceContent(""); setResourceCategory("")
      setShowResourceDialog(false)
      toast({ title: "Resource added" })
    } catch (error) {
      toast({ title: "Failed to add resource", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    } finally { setIsSubmitting(false) }
  }

  async function handleAddCalendarItem() {
    if (!calTitle.trim() || !calStart) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/hq/calendar`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title: calTitle, type: calType, start_time: calStart, end_time: calEnd || undefined, location: calLocation || undefined, description: calDesc || undefined }),
      })
      const data = await res.json()
      if (isFeatureUnavailableResponse(res.status, data))
        throw new Error(featureUnavailableMessage(data, "Calendar is temporarily unavailable."))
      if (!data.success) throw new Error(data.error || "Failed to add calendar item")
      setCalendarItems(prev => [...prev, data.item].sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()))
      setCalTitle(""); setCalType("meeting"); setCalStart(""); setCalEnd(""); setCalLocation(""); setCalDesc("")
      setShowCalendarDialog(false)
      toast({ title: "Calendar item added" })
    } catch (error) {
      toast({ title: "Failed to add item", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
    } finally { setIsSubmitting(false) }
  }

  async function handleDeleteBulletin(id: string) {
    try {
      await fetch(`/api/admin/events/${eventId}/communications`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id, action: "delete" }),
      })
      setBulletins(prev => prev.filter(b => b.id !== id))
      toast({ title: "Bulletin deleted" })
    } catch { toast({ title: "Delete failed", variant: "destructive" }) }
  }

  async function handlePinBulletin(id: string, pinned: boolean) {
    try {
      await fetch(`/api/admin/events/${eventId}/communications`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id, action: pinned ? "unpin" : "pin" }),
      })
      setBulletins(prev => prev.map(b => b.id === id ? { ...b, pinned: !pinned } : b))
    } catch { toast({ title: "Update failed", variant: "destructive" }) }
  }

  async function handleModerateBulletin(id: string, moderationStatus: 'approved' | 'rejected') {
    try {
      await fetch(`/api/admin/events/${eventId}/communications`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id, action: "moderate", moderation_status: moderationStatus }),
      })
      setBulletins(prev => prev.map(b => b.id === id ? { ...b, moderation_status: moderationStatus } : b))
      toast({ title: moderationStatus === 'approved' ? "Bulletin approved" : "Bulletin rejected" })
    } catch { toast({ title: "Moderation failed", variant: "destructive" }) }
  }

  async function handleDeleteResource(id: string) {
    try {
      await fetch(`/api/events/${eventId}/hq/resources?id=${id}`, { method: "DELETE", credentials: "include" })
      setResources(prev => prev.filter(r => r.id !== id))
      toast({ title: "Resource removed" })
    } catch { toast({ title: "Delete failed", variant: "destructive" }) }
  }

  async function handleDeleteCalendarItem(id: string) {
    try {
      await fetch(`/api/events/${eventId}/hq/calendar?id=${id}`, { method: "DELETE", credentials: "include" })
      setCalendarItems(prev => prev.filter(c => c.id !== id))
      toast({ title: "Calendar item removed" })
    } catch { toast({ title: "Delete failed", variant: "destructive" }) }
  }

  async function handleCreateEventStaffingJob() {
    if (!staffingTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/events/${eventId}/job-postings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: staffingTitle.trim(),
          description: staffingDescription.trim() || null,
          department: "Event operations",
          position: staffingTitle.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to publish")
      toast({ title: "Staffing post published", description: "Workers can apply from the jobs board." })
      setShowStaffingDialog(false)
      setStaffingTitle("")
      setStaffingDescription("")
    } catch (e) {
      toast({
        title: "Could not create posting",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-white mb-2">Event not found</h2>
        <p className="text-slate-400 mb-4">You may not have access to this event.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const pinnedBulletins = bulletins.filter(b => b.pinned)
  const regularBulletins = bulletins.filter(b => !b.pinned)
  const upcomingCalendar = calendarItems.filter(item => new Date(item.start_time) >= new Date())
  const pastCalendar = calendarItems.filter(item => new Date(item.start_time) < new Date())

  return (
    <div className="space-y-6 text-white pb-20">
      {/* Header */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/dashboard/events/${eventId}`)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />Back to event hub
          </Button>
          <Button variant="outline" size="sm" asChild className="border-cyan-600/50 text-cyan-200 hover:bg-cyan-950/40">
            <Link href={`/admin/dashboard/events/${eventId}/command-center`}>Command center</Link>
          </Button>
          {event.venue_id ? (
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600/50 text-amber-100 hover:bg-amber-950/40"
              onClick={() => setShowStaffingDialog(true)}
            >
              <Briefcase className="h-4 w-4 mr-1" />
              Staffing request
            </Button>
          ) : null}
          <Badge variant="outline" className="capitalize border-purple-600/50 text-purple-300">{userRole}</Badge>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-slate-400 mt-1">Event HQ — Everything your team needs in one place</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
              {event.start_at && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatSafeDate(event.start_at)}</span>}
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{team.length} team members</span>
              <Badge className={event.status === "published" ? "bg-green-600" : "bg-slate-600"} variant="secondary">{event.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Bulletins */}
      {pinnedBulletins.length > 0 && (
        <div className="space-y-3">
          {pinnedBulletins.map(bulletin => {
            const priority = PRIORITY_CONFIG[bulletin.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.info
            const PriorityIcon = priority.icon
            return (
              <Card key={bulletin.id} className="border-purple-600/40 bg-purple-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <Pin className="h-4 w-4 text-purple-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{bulletin.title}</h4>
                      <Badge variant="outline" className={cn("text-xs", priority.className)}><PriorityIcon className="h-3 w-3 mr-1" />{priority.label}</Badge>
                    </div>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{bulletin.content}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 flex flex-wrap gap-0.5 h-auto p-1">
          <TabsTrigger value="bulletin" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><Megaphone className="h-4 w-4 mr-1" />Bulletin</TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><FileText className="h-4 w-4 mr-1" />Resources</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><Calendar className="h-4 w-4 mr-1" />Calendar</TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><Users className="h-4 w-4 mr-1" />Team</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><CheckCircle className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><FileText className="h-4 w-4 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="chats" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400 rounded-sm text-sm"><MessageCircle className="h-4 w-4 mr-1" />Chats</TabsTrigger>
        </TabsList>

        {/* BULLETIN BOARD TAB */}
        <TabsContent value="bulletin" className="mt-6 space-y-4">
          {permissions.can_post_bulletins && (
            <div className="flex justify-end">
              <Button onClick={() => setShowBulletinDialog(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-1" />Post Update</Button>
            </div>
          )}
          {regularBulletins.length === 0 && pinnedBulletins.length === 0 ? (
            <div className="text-center py-12"><Megaphone className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No bulletins posted yet.</p></div>
          ) : (
            <div className="space-y-3">
              {regularBulletins.map(bulletin => {
                const priority = PRIORITY_CONFIG[bulletin.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.info
                const PriorityIcon = priority.icon
                return (
                  <Card key={bulletin.id} className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">{bulletin.title}</h4>
                            <Badge variant="outline" className={cn("text-xs", priority.className)}><PriorityIcon className="h-3 w-3 mr-1" />{priority.label}</Badge>
                          </div>
                          <p className="text-slate-300 text-sm whitespace-pre-wrap">{bulletin.content}</p>
                          <p className="text-slate-500 text-xs mt-2">{formatSafeDate(bulletin.created_at)}</p>
                        </div>
                        {(permissions.can_post_bulletins || permissions.can_moderate_bulletins) && (
                          <div className="flex gap-1">
                            {permissions.can_moderate_bulletins && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-green-400" onClick={() => handleModerateBulletin(bulletin.id, 'approved')}>
                                  Approve
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-amber-400" onClick={() => handleModerateBulletin(bulletin.id, 'rejected')}>
                                  Reject
                                </Button>
                              </>
                            )}
                            {permissions.can_post_bulletins && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" onClick={() => handlePinBulletin(bulletin.id, bulletin.pinned)}>
                                  <Pin className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => handleDeleteBulletin(bulletin.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* RESOURCES TAB */}
        <TabsContent value="resources" className="mt-6 space-y-4">
          {!permissions.can_view_resources && !isAdmin ? (
            <div className="text-center py-12"><Shield className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">You do not have access to resources for this event.</p></div>
          ) : (
            <>
              {permissions.can_add_resources && (
                <div className="flex justify-end">
                  <Button onClick={() => setShowResourceDialog(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-1" />Add Resource</Button>
                </div>
              )}
              {resources.length === 0 ? (
                <div className="text-center py-12"><FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No resources shared yet.</p></div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {resources.map((resource: any) => {
                    const TypeIcon = RESOURCE_ICONS[resource.type] || FileText
                    return (
                      <Card key={resource.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                              <TypeIcon className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">{resource.title}</h4>
                              {resource.category && <Badge variant="outline" className="text-xs mt-1 border-slate-600">{resource.category}</Badge>}
                              {resource.url && (
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 mt-1 flex items-center gap-1 truncate">
                                  <ExternalLink className="h-3 w-3 shrink-0" />{resource.url}
                                </a>
                              )}
                              {resource.content && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{resource.content}</p>}
                            </div>
                            {permissions.can_add_resources && (
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 shrink-0" onClick={() => handleDeleteResource(resource.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="mt-6 space-y-4">
          {permissions.can_edit_calendar && (
            <div className="flex justify-end">
              <Button onClick={() => setShowCalendarDialog(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-1" />Add to Calendar</Button>
            </div>
          )}
          {calendarItems.length === 0 ? (
            <div className="text-center py-12"><Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No calendar items yet.</p></div>
          ) : (
            <div className="space-y-6">
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
                          {permissions.can_edit_calendar && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => handleDeleteCalendarItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
                          <div className="flex-1 min-w-0">
                            <h4 className="text-slate-300 font-medium">{item.title}</h4>
                            <p className="text-xs text-slate-500">{new Date(item.start_time).toLocaleString()}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member: any) => {
              const memberRole = member.role || "staff"
              const isManagerRole = memberRole === "admin" || memberRole === "manager"
              const memberPerms = member.metadata?.hq_permissions
              const hasGrantedPerms = memberPerms && Object.values(memberPerms).some(Boolean)
              return (
                <Card key={member.id} className="bg-slate-900 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback className="bg-purple-600/20 text-purple-300">{(member.profiles?.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{member.profiles?.full_name || member.profiles?.username || "Team member"}</p>
                        <p className="text-slate-400 text-sm truncate">{member.profiles?.email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize border-slate-600 text-slate-300 shrink-0">{memberRole}</Badge>
                    </div>
                    {isAdmin && !isManagerRole && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {hasGrantedPerms && <Shield className="h-3.5 w-3.5 text-green-400" />}
                          <span className="text-xs text-slate-500">{hasGrantedPerms ? "Has extra permissions" : "View-only access"}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-400 hover:text-purple-300"
                          onClick={() => {
                            setPermTarget(member)
                            setPermValues({
                              can_view_resources: memberPerms?.can_view_resources ?? true,
                              can_post_bulletins: memberPerms?.can_post_bulletins ?? false,
                              can_moderate_bulletins: memberPerms?.can_moderate_bulletins ?? false,
                              can_add_resources: memberPerms?.can_add_resources ?? false,
                              can_edit_calendar: memberPerms?.can_edit_calendar ?? false,
                              can_manage_tasks: memberPerms?.can_manage_tasks ?? false,
                              can_manage_team: memberPerms?.can_manage_team ?? false,
                            })
                            setShowPermissionsDialog(true)
                          }}>
                          <Shield className="h-3 w-3 mr-1" />Permissions
                        </Button>
                      </div>
                    )}
                    {isManagerRole && (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <span className="text-xs text-green-400 flex items-center gap-1"><Shield className="h-3 w-3" />Full admin access</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
            {team.length === 0 && (
              <div className="col-span-full text-center py-12"><Users className="h-10 w-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No team members added yet.</p></div>
            )}
          </div>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="mt-6 space-y-4">
          <EventTaskManager eventId={eventId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-4">
          <EventSecureUploads eventId={eventId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="chats" className="mt-6 space-y-4">
          <EventChatsPanel eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Post Bulletin Dialog */}
      <Dialog open={showBulletinDialog} onOpenChange={setShowBulletinDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Megaphone className="h-5 w-5 text-purple-400" />Post Bulletin Update</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-slate-300">Title</Label><Input value={bulletinTitle} onChange={e => setBulletinTitle(e.target.value)} placeholder="Update title..." className="bg-slate-800 border-slate-700" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Content</Label><Textarea value={bulletinContent} onChange={e => setBulletinContent(e.target.value)} placeholder="Write your update..." rows={4} className="bg-slate-800 border-slate-700 resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Priority</Label>
                <Select value={bulletinPriority} onValueChange={setBulletinPriority}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1"><Switch checked={bulletinPinned} onCheckedChange={setBulletinPinned} /><Label className="text-slate-300 text-sm">Pin to top</Label></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowBulletinDialog(false)}>Cancel</Button>
              <Button onClick={handlePostBulletin} disabled={isSubmitting || !bulletinTitle.trim() || !bulletinContent.trim()} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><FileText className="h-5 w-5 text-purple-400" />Add Resource</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-slate-300">Title</Label><Input value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} placeholder="e.g., Stage Plot, Vendor Contacts..." className="bg-slate-800 border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem><SelectItem value="document">Document</SelectItem>
                    <SelectItem value="note">Note</SelectItem><SelectItem value="itinerary">Itinerary</SelectItem>
                    <SelectItem value="contact">Contact Info</SelectItem><SelectItem value="file">File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-slate-300">Category (optional)</Label><Input value={resourceCategory} onChange={e => setResourceCategory(e.target.value)} placeholder="e.g., Logistics" className="bg-slate-800 border-slate-700" /></div>
            </div>
            {(resourceType === "link" || resourceType === "document" || resourceType === "file") && (
              <div className="space-y-2"><Label className="text-slate-300">URL</Label><Input value={resourceUrl} onChange={e => setResourceUrl(e.target.value)} placeholder="https://..." className="bg-slate-800 border-slate-700" /></div>
            )}
            {(resourceType === "note" || resourceType === "itinerary" || resourceType === "contact") && (
              <div className="space-y-2"><Label className="text-slate-300">Content</Label><Textarea value={resourceContent} onChange={e => setResourceContent(e.target.value)} placeholder="Write content..." rows={4} className="bg-slate-800 border-slate-700 resize-none" /></div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowResourceDialog(false)}>Cancel</Button>
              <Button onClick={handleAddResource} disabled={isSubmitting || !resourceTitle.trim()} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Calendar Item Dialog */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white flex items-center gap-2"><Calendar className="h-5 w-5 text-purple-400" />Add Calendar Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-slate-300">Title</Label><Input value={calTitle} onChange={e => setCalTitle(e.target.value)} placeholder="e.g., Soundcheck, Load In..." className="bg-slate-800 border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Type</Label>
                <Select value={calType} onValueChange={setCalType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CALENDAR_TYPE_COLORS).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-slate-300">Location</Label><Input value={calLocation} onChange={e => setCalLocation(e.target.value)} placeholder="Stage A, Green Room..." className="bg-slate-800 border-slate-700" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-slate-300">Start</Label><Input type="datetime-local" value={calStart} onChange={e => setCalStart(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
              <div className="space-y-2"><Label className="text-slate-300">End (optional)</Label><Input type="datetime-local" value={calEnd} onChange={e => setCalEnd(e.target.value)} className="bg-slate-800 border-slate-700" /></div>
            </div>
            <div className="space-y-2"><Label className="text-slate-300">Notes (optional)</Label><Textarea value={calDesc} onChange={e => setCalDesc(e.target.value)} placeholder="Additional details..." rows={2} className="bg-slate-800 border-slate-700 resize-none" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowCalendarDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCalendarItem} disabled={isSubmitting || !calTitle.trim() || !calStart} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showStaffingDialog} onOpenChange={setShowStaffingDialog}>
        <DialogContent className="max-w-lg border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Briefcase className="h-5 w-5 text-amber-400" />
              Publish staffing request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Creates a published role on <span className="text-slate-200">job_posting_templates</span> linked to this event
              for your venue.
            </p>
            <div className="space-y-2">
              <Label className="text-slate-300">Role title</Label>
              <Input
                value={staffingTitle}
                onChange={(e) => setStaffingTitle(e.target.value)}
                placeholder="e.g. Stage hands — load in"
                className="border-slate-700 bg-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Description (optional)</Label>
              <Textarea
                value={staffingDescription}
                onChange={(e) => setStaffingDescription(e.target.value)}
                rows={4}
                className="resize-none border-slate-700 bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowStaffingDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                disabled={isSubmitting || !staffingTitle.trim()}
                onClick={() => void handleCreateEventStaffingJob()}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Publish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-400" />
              Manage Permissions — {permTarget?.profiles?.full_name || "Team Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Grant specific Event HQ permissions to this team member. By default, only admins and managers can create or edit content.
            </p>
            {[
              { key: "can_post_bulletins", label: "Post bulletin updates", desc: "Create, pin, and delete bulletin posts" },
              { key: "can_add_resources", label: "Add & remove resources", desc: "Share links, documents, itineraries, notes" },
              { key: "can_edit_calendar", label: "Edit shared calendar", desc: "Add and remove calendar items" },
              { key: "can_manage_tasks", label: "Manage tasks", desc: "Create, assign, and update logistics tasks" },
              { key: "can_manage_team", label: "Manage team", desc: "Add and remove event participants" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <Switch
                  checked={(permValues as any)[key]}
                  onCheckedChange={(checked) => setPermValues(prev => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowPermissionsDialog(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}
                onClick={async () => {
                  if (!permTarget) return
                  setIsSubmitting(true)
                  try {
                    const res = await fetch(`/api/events/${eventId}/hq/permissions`, {
                      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
                      body: JSON.stringify({ participant_id: permTarget.id, permissions: permValues }),
                    })
                    const data = await res.json()
                    if (!data.success) throw new Error(data.error)
                    toast({ title: "Permissions updated", description: `Permissions saved for ${permTarget.profiles?.full_name || "team member"}.` })
                    setTeam(prev => prev.map(m => m.id === permTarget.id ? { ...m, metadata: { ...(m.metadata || {}), hq_permissions: permValues } } : m))
                    setShowPermissionsDialog(false)
                  } catch (error) {
                    toast({ title: "Failed to update", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" })
                  } finally { setIsSubmitting(false) }
                }}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
