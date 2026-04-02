"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  Users,
  Clock,
  Truck,
  Music,
  DollarSign,
  Target,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  Hotel,
  Headphones,
  Globe,
  Route
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AdminPageHeader } from "../components/admin-page-header"
import { statusBadgeClass } from "../components/admin-badge-utils"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminErrorCard } from "../components/admin-error-card"
import { AdminStatCard } from "../components/admin-stat-card"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface Tour {
  id: string
  name: string
  artist: string
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  startDate: string
  endDate: string
  totalShows: number
  completedShows: number
  revenue: number
  expenses: number
  profit: number
  venues: Array<{
    id: string
    name: string
    city: string
    state: string
    date: string
    capacity: number
    ticketsSold: number
    revenue: number
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  }>
  logistics: {
    transportation: string
    accommodation: string
    equipment: string
    crew: number
    budget: number
    spent: number
  }
  team: Array<{
    id: string
    name: string
    role: string
    contact: string
    status: 'confirmed' | 'pending' | 'declined'
  }>
}

export default function ToursPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterStatus, setFilterStatus] = useState('all')
  const [tours, setTours] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Check for success message from tour planner
  useEffect(() => {
    const published = searchParams.get('published')
    if (published === 'true') {
      toast({
        title: "🎉 Tour Published Successfully!",
        description: "Your tour is now live and ready to go!",
      })
      // Clean up the URL
      router.replace('/admin/dashboard/tours')
    }
  }, [searchParams, router])

  const fetchTours = async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/tours?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tours')
      }

      const data = await response.json()
      setTours(data.tours || [])
    } catch (error) {
      console.error('Error fetching tours:', error)
      const message = error instanceof Error ? error.message : 'Failed to load tours'
      setFetchError(message)
      setTours([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTours()
  }, [filterStatus])

  const getStatusColor = (status: string) => statusBadgeClass(status)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircle className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Logistics status component for tours
  const TourLogisticsStatus = ({ tour }: { tour: any }) => {
    const calculateLogisticsProgress = () => {
      const logistics = tour.logistics || {}
      let completed = 0
      let total = 0
      
      if (logistics.transportation) { total++; if (logistics.transportation !== 'pending') completed++ }
      if (logistics.accommodation) { total++; if (logistics.accommodation !== 'pending') completed++ }
      if (logistics.equipment) { total++; if (logistics.equipment !== 'pending') completed++ }
      if (logistics.crew) { total++; if (logistics.crew > 0) completed++ }
      
      return total > 0 ? Math.round((completed / total) * 100) : 0
    }

    const progress = calculateLogisticsProgress()
    const status = progress === 100 ? 'Complete' : progress > 50 ? 'In Progress' : 'Not Started'

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Logistics Status</span>
          <span className="text-sm font-bold text-white">{progress}%</span>
        </div>
        <div className="w-full bg-slate-700/60 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{status}</span>
          <Link href={`/admin/dashboard/logistics?tourId=${tour.id}`}>
            <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
              <Target className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </Link>
        </div>
        
        {/* Logistics breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Truck className="h-3 w-3 text-blue-400" />
            <span className="text-slate-400">Transport</span>
            <span className={`${tour.logistics?.transportation === 'confirmed' ? 'text-green-400' : 'text-slate-500'}`}>
              {tour.logistics?.transportation || 'Pending'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Hotel className="h-3 w-3 text-green-400" />
            <span className="text-slate-400">Accommodation</span>
            <span className={`${tour.logistics?.accommodation === 'confirmed' ? 'text-green-400' : 'text-slate-500'}`}>
              {tour.logistics?.accommodation || 'Pending'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Headphones className="h-3 w-3 text-purple-400" />
            <span className="text-slate-400">Equipment</span>
            <span className={`${tour.logistics?.equipment === 'confirmed' ? 'text-green-400' : 'text-slate-500'}`}>
              {tour.logistics?.equipment || 'Pending'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-3 w-3 text-orange-400" />
            <span className="text-slate-400">Crew</span>
            <span className="text-white">{tour.logistics?.crew || 0}</span>
          </div>
        </div>
      </div>
    )
  }

  const filteredTours = tours.filter(
    (tour) => filterStatus === 'all' || tour.status === filterStatus
  )

  const TourCard = ({ tour }: { tour: any }) => {
    // Safely extract values with fallbacks
    const revenue = tour.revenue || tour.expected_revenue || 0
    const expenses = tour.expenses || 0
    const profit = revenue - expenses
    const totalShows = tour.total_shows || tour.totalShows || 0
    const completedShows = tour.completed_shows || tour.completedShows || 0
    const crewSize = tour.crew_size || tour.logistics?.crew || 0
    const startDate = tour.start_date || tour.startDate
    const endDate = tour.end_date || tour.endDate
    const artist = tour.artist || tour.main_artist || 'Unknown Artist'
    const status = tour.status || 'planning'

    return (
      <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm hover:border-slate-600/50 transition-all duration-300 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-white">{tour.name}</CardTitle>
              <p className="text-sm text-slate-400">{artist}</p>
            </div>
            <Badge className={getStatusColor(status)}>
              {getStatusIcon(status)}
              <span className="ml-1 capitalize">{status}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-sm text-white">
                {formatSafeDate(startDate)} - {formatSafeDate(endDate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Shows</p>
              <p className="text-sm text-white">{completedShows}/{totalShows}</p>
            </div>
          </div>

          {totalShows > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Progress</span>
                <span className="text-xs text-white">{Math.round((completedShows / totalShows) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedShows / totalShows) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-slate-500">Revenue</p>
              <p className="text-sm font-semibold text-green-400">{formatSafeCurrency(revenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Expenses</p>
              <p className="text-sm font-semibold text-red-400">{formatSafeCurrency(expenses)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Profit</p>
              <p className={`text-sm font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSafeCurrency(profit)}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400">{crewSize} crew</span>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push(`/admin/dashboard/tours/${tour.id}`)}
                className="text-slate-400 hover:text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Manage Tour
              </Button>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Logistics Status */}
          <TourLogisticsStatus tour={tour} />
        </CardContent>
      </Card>
    )
  }

  function tourRevenue(tour: Tour | Record<string, unknown>) {
    const t = tour as Record<string, number | undefined>
    return t.revenue ?? t.actual_revenue ?? t.expected_revenue ?? 0
  }

  return (
    <div className="container mx-auto space-y-6">
        <AdminPageHeader
          title="Tour Management"
          subtitle="Plan, coordinate, and track all your tour operations"
          icon={Globe}
          actions={
            <>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => router.push("/admin/dashboard/tours/planner")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg shadow-purple-500/20 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tour
              </Button>
            </>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            title="Total Tours"
            value={tours.length}
            icon={Route}
            color="purple"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Active Tours"
            value={tours.filter((t) => t.status === 'active').length}
            icon={PlayCircle}
            color="green"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Revenue"
            value={formatSafeCurrency(tours.reduce((sum, tour) => sum + tourRevenue(tour), 0))}
            icon={DollarSign}
            color="green"
            size="default"
            isLoading={isLoading}
          />
          <AdminStatCard
            title="Shows"
            value={tours.reduce(
              (sum, tour) =>
                sum + ((tour as { total_shows?: number }).total_shows ?? tour.totalShows ?? 0),
              0
            )}
            icon={Music}
            color="blue"
            size="default"
            isLoading={isLoading}
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <AdminPageSkeleton />
        ) : fetchError ? (
          <AdminErrorCard
            title="Could not load tours"
            message={fetchError}
            onRetry={() => void fetchTours()}
          />
        ) : filteredTours.length === 0 ? (
          <AdminEmptyState
            icon={Globe}
            title="No tours yet"
            description="Create your first tour to get started"
            action={{ label: "Create Tour", href: "/admin/dashboard/tours/planner" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}
    </div>
  )
} 