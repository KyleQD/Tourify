"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  Truck, 
  Music, 
  Building, 
  Target, 
  Settings, 
  Plus, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  Star, 
  Award, 
  Crown, 
  Zap, 
  Globe, 
  Plane, 
  Car, 
  Hotel, 
  Coffee, 
  Utensils, 
  Headphones, 
  Mic, 
  Volume2, 
  Camera, 
  Video, 
  Wifi, 
  Shield, 
  Heart, 
  Share, 
  Bookmark, 
  MessageSquare, 
  Bell, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  PlayCircle, 
  PauseCircle, 
  StopCircle, 
  RotateCcw, 
  FileText, 
  Map, 
  Route, 
  Navigation, 
  Compass, 
  Flag, 
  Receipt,
  Trash2,
  Copy,
  ExternalLink,
  MoreHorizontal
} from "lucide-react"
import { toast } from "sonner"
import { TourEventManager } from "@/components/admin/tour-event-manager"
import { TourTeamManager } from "@/components/admin/tour-team-manager"
import { TourVendorManager } from "@/components/admin/tour-vendor-manager"
import { TourJobPosting } from "@/components/admin/tour-job-posting"
import { TourJobsList } from "@/components/admin/tour-jobs-list"
import { formatSafeDate, normalizeAdminEvent } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import { SurfaceInput } from "@/components/surface/surface-primitives"
import { AdminSurfaceCard } from "../../components/admin-surface-card"
import { AdminSurfaceSelectTrigger, AdminSurfaceTabsList, AdminSurfaceTabsTrigger } from "../../components/admin-surface-controls"
import { AdminPageActionsRow } from "../../components/admin-page-actions-row"

interface Tour {
  id: string
  name: string
  description?: string
  artist_id: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  start_date: string
  end_date: string
  total_shows: number
  completed_shows: number
  expected_revenue: number
  actual_revenue: number
  expenses: number
  budget: number
  crew_size: number
  transportation: string
  accommodation: string
  equipment_requirements: string
  special_requirements?: string
  created_at: string
  updated_at: string
}

interface Event {
  id: string
  name: string
  description?: string
  tour_id: string
  venue_name: string
  venue_address?: string
  event_date: string
  event_time?: string
  doors_open?: string
  duration_minutes?: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  capacity: number
  tickets_sold: number
  ticket_price?: number
  vip_price?: number
  expected_revenue: number
  actual_revenue: number
  expenses: number
  venue_contact_name?: string
  venue_contact_email?: string
  venue_contact_phone?: string
  sound_requirements?: string
  lighting_requirements?: string
  stage_requirements?: string
  special_requirements?: string
  load_in_time?: string
  sound_check_time?: string
}

interface TourMember {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_date?: string
  departure_date?: string
  responsibilities?: string
}

interface TourVendor {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  status: 'confirmed' | 'pending' | 'declined'
  services: string[]
  contract_amount?: number
  payment_status: 'paid' | 'partial' | 'pending'
  notes?: string
}

export default function TourManagementPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tourId = params.id as string

  const [tour, setTour] = useState<Tour | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<TourMember[]>([])
  const [vendors, setVendors] = useState<TourVendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [tourFinances, setTourFinances] = useState<any[]>([])
  const [editForm, setEditForm] = useState<Partial<Tour>>({})
  const [shareUrl, setShareUrl] = useState('')
  const initialEventId = (searchParams.get('eventId') || undefined) as string | undefined

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (showShareDialog && typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/admin/dashboard/tours/${tourId}`)
    }
  }, [showShareDialog, tourId])

  useEffect(() => {
    const fetchTourData = async () => {
      try {
        setIsLoading(true)

        const tourResponse = await fetch(`/api/tours/${tourId}`)
        if (tourResponse.ok) {
          const tourData = await tourResponse.json()
          setTour(tourData)
          setEditForm(tourData)
        } else {
          setTour(null)
          setEditForm({})
          toast.error('Could not load tour')
        }

        const eventsResponse = await fetch(`/api/tours/${tourId}/events`)
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          const normalizedEvents = (eventsData.events || []).map((event: any) => {
            const normalized = normalizeAdminEvent(event)
            return {
              id: normalized.id || event.id,
              name: normalized.name,
              description: normalized.description || '',
              tour_id: event.tour_id || tourId,
              venue_name: normalized.venue_name || 'Venue TBD',
              venue_address: event.venue_address || '',
              event_date: normalized.event_date,
              event_time: normalized.event_time || '',
              doors_open: event.doors_open || '',
              duration_minutes: Number(event.duration_minutes || 0),
              status: normalized.status,
              capacity: normalized.capacity || 0,
              tickets_sold: normalized.tickets_sold || 0,
              ticket_price: normalized.ticket_price || 0,
              vip_price: Number(event.vip_price || 0),
              expected_revenue: normalized.expected_revenue || 0,
              actual_revenue: normalized.actual_revenue || 0,
              expenses: normalized.expenses || 0,
              venue_contact_name: event.venue_contact_name || '',
              venue_contact_email: event.venue_contact_email || '',
              venue_contact_phone: event.venue_contact_phone || '',
              sound_requirements: event.sound_requirements || '',
              lighting_requirements: event.lighting_requirements || '',
              stage_requirements: event.stage_requirements || '',
              special_requirements: event.special_requirements || '',
              load_in_time: event.load_in_time || '',
              sound_check_time: event.sound_check_time || ''
            } as Event
          })
          setEvents(normalizedEvents)
        } else {
          setEvents([])
        }

        const teamResponse = await fetch(`/api/tours/${tourId}/team`)
        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          setMembers(teamData.team_members || [])
        } else {
          setMembers([])
        }

        const vendorsResponse = await fetch(`/api/tours/${tourId}/vendors`)
        if (vendorsResponse.ok) {
          const vendorsData = await vendorsResponse.json()
          setVendors(vendorsData.vendors || [])
        } else {
          setVendors([])
        }

        try {
          const finRes = await fetch(`/api/admin/finances?type=transactions&tour_id=${tourId}`)
          if (finRes.ok) {
            const finData = await finRes.json()
            setTourFinances(finData.recentTransactions || finData.transactions || [])
          }
        } catch { /* best-effort */ }
      } catch (error) {
        console.error('Error fetching tour data:', error)
        toast.error('Failed to fetch tour data')
        setTour(null)
        setEditForm({})
        setEvents([])
        setMembers([])
        setVendors([])
      } finally {
        setIsLoading(false)
      }
    }

    if (tourId) {
      fetchTourData()
    }
  }, [tourId])

  const handleStatusChange = async (newStatus: Tour['status']) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setTour(prev => prev ? { ...prev, status: newStatus } : null)
        toast.success(`Tour status updated to ${newStatus}`)
      } else {
        throw new Error('Failed to update tour status')
      }
    } catch (error) {
      console.error('Error updating tour status:', error)
      toast.error('Failed to update tour status')
    }
  }

  const handleDeleteTour = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Tour deleted successfully')
        router.push('/admin/dashboard/tours')
      } else {
        throw new Error('Failed to delete tour')
      }
    } catch (error) {
      console.error('Error deleting tour:', error)
      toast.error('Failed to delete tour')
    }
  }

  const handleSaveTour = async () => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        const updatedTour = await response.json()
        setTour(updatedTour)
        setIsEditing(false)
        toast.success('Tour updated successfully')
      } else {
        throw new Error('Failed to update tour')
      }
    } catch (error) {
      console.error('Error updating tour:', error)
      toast.error('Failed to update tour')
    }
  }



  const handleShare = () => {
    setShowShareDialog(true)
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleDuplicateTour = async () => {
    try {
      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tour,
          name: `${tour?.name} (Copy)`,
          status: 'planning'
        })
      })

      if (response.ok) {
        const result = await response.json()
        const tourId = result.tour?.id || result.id
        toast.success('Tour duplicated successfully')
        router.push(`/admin/dashboard/tours/${tourId}`)
      } else {
        throw new Error('Failed to duplicate tour')
      }
    } catch (error) {
      console.error('Error duplicating tour:', error)
      toast.error('Failed to duplicate tour')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400'
      case 'planning': return 'bg-yellow-500/20 text-yellow-400'
      case 'completed': return 'bg-blue-500/20 text-blue-400'
      case 'cancelled': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-4 w-4" />
      case 'planning': return <Clock className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <StopCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Tour Not Found</h1>
          <p className="text-slate-400 mb-6">The tour you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/admin/dashboard/tours')}>
            Back to Tours
          </Button>
        </div>
      </div>
    )
  }

  // Safety check to ensure all required fields exist
  const safeTour = {
    ...tour,
    total_shows: tour.total_shows || 0,
    completed_shows: tour.completed_shows || 0,
    actual_revenue: tour.actual_revenue || 0,
    expected_revenue: tour.expected_revenue || 0,
    expenses: tour.expenses || 0,
    budget: tour.budget || 0,
    crew_size: tour.crew_size || 0
  }

  const progressPercentage = safeTour.total_shows > 0 ? (safeTour.completed_shows / safeTour.total_shows) * 100 : 0
  const profit = safeTour.actual_revenue - safeTour.expenses
  const budgetRemaining = safeTour.budget - safeTour.expenses
  const startDateParsed = new Date(safeTour.start_date)
  const endDateParsed = new Date(safeTour.end_date)
  const hasValidTourRange = !Number.isNaN(startDateParsed.getTime()) && !Number.isNaN(endDateParsed.getTime())
  const durationDays = hasValidTourRange
    ? Math.max(0, Math.ceil((endDateParsed.getTime() - startDateParsed.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20 p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/dashboard/tours')}
              className="text-slate-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Tours
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">{safeTour.name}</h1>
              <p className="text-slate-400">Tour Management Dashboard</p>
            </div>
          </div>
          <AdminPageActionsRow>
            <Select
              value={safeTour.status}
              onValueChange={(v) => void handleStatusChange(v as Tour['status'])}
            >
              <AdminSurfaceSelectTrigger className="w-[168px] border-slate-600 bg-slate-900/50 capitalize text-slate-200">
                <div className="flex items-center gap-2">
                  {getStatusIcon(safeTour.status)}
                  <SelectValue />
                </div>
              </AdminSurfaceSelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                if (isEditing && tour) setEditForm(tour)
                setIsEditing((v) => !v)
              }}
              className="border-slate-600 text-slate-300"
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-slate-600 text-slate-300"
            >
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-slate-600 text-slate-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={handleDuplicateTour}
              className="border-slate-600 text-slate-300"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AdminPageActionsRow>
        </div>

        {isEditing && (
          <AdminSurfaceCard>
            <CardHeader>
              <CardTitle className="text-white">Edit tour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-slate-400">Name</Label>
                  <SurfaceInput
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Description</Label>
                  <Textarea
                    value={editForm.description ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[88px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Start date</Label>
                  <SurfaceInput
                    type="date"
                    value={(editForm.start_date ?? '').slice(0, 10)}
                    onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">End date</Label>
                  <SurfaceInput
                    type="date"
                    value={(editForm.end_date ?? '').slice(0, 10)}
                    onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Transportation</Label>
                  <SurfaceInput
                    value={editForm.transportation ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, transportation: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Accommodation</Label>
                  <SurfaceInput
                    value={editForm.accommodation ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, accommodation: e.target.value }))}
                    className="surface-entry bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Equipment requirements</Label>
                  <Textarea
                    value={editForm.equipment_requirements ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, equipment_requirements: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[72px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-400">Special requirements</Label>
                  <Textarea
                    value={editForm.special_requirements ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, special_requirements: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white min-h-[72px]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => void handleSaveTour()}
                >
                  Save changes
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={() => {
                    if (tour) setEditForm(tour)
                    setIsEditing(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </AdminSurfaceCard>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminSurfaceCard>
            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Progress</p>
                      <p className="text-2xl font-bold text-white">{safeTour.completed_shows}/{safeTour.total_shows}</p>
                      <p className="text-sm text-slate-400">Shows Completed</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/20 shadow-lg shadow-blue-500/10">
                      <Music className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white">{progressPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </AdminSurfaceCard>

          <AdminSurfaceCard>
            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Revenue</p>
                      <p className="text-2xl font-bold text-green-400">{formatSafeCurrency(safeTour.actual_revenue)}</p>
                      <p className="text-sm text-slate-400">of {formatSafeCurrency(safeTour.expected_revenue)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/20 shadow-lg shadow-green-500/10">
                      <DollarSign className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
            </CardContent>
          </AdminSurfaceCard>

          <AdminSurfaceCard>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Profit</p>
                  <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSafeCurrency(profit)}
                  </p>
                  <p className="text-sm text-slate-400">Net Income</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/20 shadow-lg shadow-blue-500/10">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </AdminSurfaceCard>

          <AdminSurfaceCard>
            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Crew</p>
                      <p className="text-2xl font-bold text-white">{safeTour.crew_size}</p>
                      <p className="text-sm text-slate-400">Team Members</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-500/20 shadow-lg shadow-purple-500/10">
                      <Users className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
            </CardContent>
          </AdminSurfaceCard>
        </div>

        {/* Quick Actions */}
        <AdminSurfaceCard>
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('events')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Manage Events
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('team')}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Team
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('vendors')}>
                      <Truck className="mr-2 h-4 w-4" />
                      Manage Vendors
                    </Button>
                                <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab('finances')}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      View Finances
                    </Button>
                    <Separator className="bg-slate-700" />
                    <TourJobPosting
                      tourId={tourId}
                      tourName={safeTour.name}
                      tourStartDate={safeTour.start_date}
                      tourEndDate={safeTour.end_date}
                      onJobPosted={(job) => {
                        toast.success(`Job "${job.title}" posted successfully!`)
                      }}
                    />
          </CardContent>
        </AdminSurfaceCard>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <AdminSurfaceTabsList className="grid w-full grid-cols-7">
            <AdminSurfaceTabsTrigger value="overview">Overview</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="events">Events ({events.length})</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="team">Team ({members.length})</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="vendors">Vendors ({vendors.length})</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="jobs">Jobs</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="finances">Finances</AdminSurfaceTabsTrigger>
            <AdminSurfaceTabsTrigger value="logistics">Logistics</AdminSurfaceTabsTrigger>
          </AdminSurfaceTabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Tour Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-400">Description</Label>
                    <p className="text-white mt-1">{safeTour.description || 'No description provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Start Date</Label>
                      <p className="text-white mt-1">{formatSafeDate(safeTour.start_date)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">End Date</Label>
                      <p className="text-white mt-1">{formatSafeDate(safeTour.end_date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Duration</Label>
                      <p className="text-white mt-1">
                        {durationDays} days
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Status</Label>
                      <Badge className={`mt-1 ${getStatusColor(safeTour.status)}`}>
                        {getStatusIcon(safeTour.status)}
                        <span className="ml-1 capitalize">{safeTour.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Expected Revenue</Label>
                      <p className="text-white mt-1">{formatSafeCurrency(safeTour.expected_revenue)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Actual Revenue</Label>
                      <p className="text-green-400 mt-1">{formatSafeCurrency(safeTour.actual_revenue)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Expenses</Label>
                      <p className="text-red-400 mt-1">{formatSafeCurrency(safeTour.expenses)}</p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Budget</Label>
                      <p className="text-white mt-1">{formatSafeCurrency(safeTour.budget)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-400">Profit</Label>
                      <p className={`mt-1 ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatSafeCurrency(profit)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-slate-400">Budget Remaining</Label>
                      <p className={`mt-1 ${budgetRemaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatSafeCurrency(budgetRemaining)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </AdminSurfaceCard>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="text-sm text-slate-400">Select an event below to view or edit. If you arrived here from the calendar, the targeted event opens automatically.</div>
            <TourEventManager
              tourId={tourId}
              events={events}
              onEventsUpdate={setEvents}
              initialEventId={initialEventId}
            />
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <TourTeamManager
              tourId={tourId}
              members={members}
              onMembersUpdate={setMembers}
            />
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-6">
            <TourVendorManager
              tourId={tourId}
              vendors={vendors}
              onVendorsUpdate={setVendors}
            />
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Tour Jobs</h2>
                <p className="text-slate-400">Post jobs to find crew and team members for this tour</p>
              </div>
              <TourJobPosting
                tourId={tourId}
                tourName={safeTour.name}
                tourStartDate={safeTour.start_date}
                tourEndDate={safeTour.end_date}
                onJobPosted={(job) => {
                  toast.success(`Job "${job.title}" posted successfully!`)
                }}
              />
            </div>
            <TourJobsList tourId={tourId} />
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-6">
            <AdminSurfaceCard>
              <CardHeader>
                <CardTitle className="text-white">Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-green-400">{formatSafeCurrency(safeTour.actual_revenue)}</h3>
                    <p className="text-slate-400">Total Revenue</p>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-red-400">{formatSafeCurrency(safeTour.expenses)}</h3>
                    <p className="text-slate-400">Total Expenses</p>
                  </div>
                  <div className="text-center">
                    <h3 className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatSafeCurrency(profit)}
                    </h3>
                    <p className="text-slate-400">Net Profit</p>
                  </div>
                </div>
              </CardContent>
            </AdminSurfaceCard>

            {tourFinances.length > 0 && (
              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tourFinances.slice(0, 10).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl backdrop-blur-sm">
                      <div>
                        <p className="text-sm font-medium text-white">{tx.description || tx.category}</p>
                        <p className="text-xs text-slate-400">{formatSafeDate(tx.created_at)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatSafeCurrency(Number(tx.amount)).replace("$", "")}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </AdminSurfaceCard>
            )}
          </TabsContent>

          {/* Logistics Tab */}
          <TabsContent value="logistics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Transportation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{safeTour.transportation || 'Not specified'}</p>
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Accommodation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{safeTour.accommodation || 'Not specified'}</p>
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Equipment Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{safeTour.equipment_requirements || 'Not specified'}</p>
                </CardContent>
              </AdminSurfaceCard>

              <AdminSurfaceCard>
                <CardHeader>
                  <CardTitle className="text-white">Special Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">{safeTour.special_requirements || 'No special requirements'}</p>
                </CardContent>
              </AdminSurfaceCard>
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Tour</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                Are you sure you want to delete this tour? This action cannot be undone and will also delete all associated events.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTour} className="bg-red-600 hover:bg-red-700">
                Delete Tour
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Share Tour</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Tour Link</Label>
                <div className="flex space-x-2 mt-1">
                  <SurfaceInput
                    value={shareUrl}
                    readOnly
                    className="surface-entry bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-slate-300 shrink-0"
                    onClick={async () => {
                      const url =
                        shareUrl ||
                        (typeof window !== 'undefined'
                          ? `${window.location.origin}/admin/dashboard/tours/${tourId}`
                          : '')
                      if (!url) {
                        toast.error('Link not ready')
                        return
                      }
                      try {
                        await navigator.clipboard.writeText(url)
                        toast.success('Link copied')
                      } catch {
                        toast.error('Could not copy link')
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Export Tour Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-300">Choose what data to export:</p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="tour-info" defaultChecked />
                  <Label htmlFor="tour-info" className="text-slate-300">Tour Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="events" defaultChecked />
                  <Label htmlFor="events" className="text-slate-300">Events</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="team" defaultChecked />
                  <Label htmlFor="team" className="text-slate-300">Team Members</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="vendors" defaultChecked />
                  <Label htmlFor="vendors" className="text-slate-300">Vendors</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="finances" defaultChecked />
                  <Label htmlFor="finances" className="text-slate-300">Financial Data</Label>
                </div>
              </div>
              <TooltipProvider>
                <div className="flex space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <Button disabled className="w-full bg-blue-600/50 hover:bg-blue-600/50">
                          <Download className="mr-2 h-4 w-4" />
                          Export as PDF
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Export coming soon</TooltipContent>
                  </Tooltip>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const lines = [`Tour: ${safeTour.name}`, `Status: ${safeTour.status}`, `Start: ${safeTour.start_date}`, `End: ${safeTour.end_date}`, '']
                      lines.push('Events:')
                      events.forEach((e: any) => lines.push(`  ${e.name || e.title || 'Event'} - ${e.event_date || e.start_at || ''}`))
                      lines.push('', 'Team:')
                      members.forEach((m: any) => lines.push(`  ${m.name} (${m.role})`))
                      lines.push('', 'Vendors:')
                      vendors.forEach((v: any) => lines.push(`  ${v.name} - ${v.service_type || v.type || 'Vendor'}`))
                      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
                      const u = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = u; a.download = `tour-${tourId}.csv`; a.click()
                      URL.revokeObjectURL(u)
                      setShowExportDialog(false)
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              </TooltipProvider>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 