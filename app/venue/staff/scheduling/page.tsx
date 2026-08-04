import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Settings, 
  BarChart3, 
  RefreshCw,
  Download,
  Upload
} from 'lucide-react'
import { ShiftCalendar } from '@/components/venue/staff/shift-calendar'
import { ShiftManagement } from '@/components/venue/staff/shift-management'
import { ShiftTemplates } from '@/components/venue/staff/shift-templates'
import { ShiftAnalytics } from '@/components/venue/staff/shift-analytics'
import { ShiftRequests } from '@/components/venue/staff/shift-requests'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { ensureVenueOperationalContext, getCurrentVenueContext } from '@/lib/venue/venue-access'

interface SchedulingPageProps {
  searchParams: Promise<{ venueId?: string }>
}

export default async function SchedulingPage({ searchParams }: SchedulingPageProps) {
  const { venueId: queryVenueId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-muted-foreground mb-4">
              Please sign in to access the scheduling system.
            </p>
            <Button asChild>
              <a href="/login">Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const venue = await getCurrentVenueContext(supabase as any, user.id, queryVenueId)
  const venueId = venue?.id

  if (!venueId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Venue Required</h3>
            <p className="text-muted-foreground mb-4">
              Please select a venue to access the scheduling system.
            </p>
            <Button asChild>
              <a href="/venue">Select Venue</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Never trust a raw ?venueId= without verified venue context ownership.
  if (queryVenueId && queryVenueId !== venueId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access denied</h3>
            <p className="text-muted-foreground mb-4">
              You do not have access to that venue scheduling workspace.
            </p>
            <Button asChild>
              <a href="/venue">Select Venue</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const service = createServiceRoleClient()
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, user.id)
  const today = new Date()
  const weekEnd = new Date()
  weekEnd.setDate(today.getDate() + 7)

  const shiftQuery = mappedVenue?.venuesV2Id
    ? service
        .from('staff_shifts')
        .select('id, staff_member_id, status, shift_date, start_time, end_time', { count: 'exact' })
        .or(`venue_id.eq.${venueId},adhoc_venue_id.eq.${mappedVenue.venuesV2Id}`)
        .is('deleted_at', null)
        .gte('shift_date', today.toISOString().slice(0, 10))
        .lte('shift_date', weekEnd.toISOString().slice(0, 10))
    : service
        .from('staff_shifts')
        .select('id, staff_member_id, status, shift_date, start_time, end_time', { count: 'exact' })
        .eq('venue_id', venueId)
        .is('deleted_at', null)
        .gte('shift_date', today.toISOString().slice(0, 10))
        .lte('shift_date', weekEnd.toISOString().slice(0, 10))
    ? service
        .from('staff_shifts')
        .select('id, staff_member_id, status, shift_date, start_time, end_time', { count: 'exact' })
        .or(`venue_id.eq.${venueId},adhoc_venue_id.eq.${mappedVenue.venuesV2Id}`)
        .gte('shift_date', today.toISOString().slice(0, 10))
        .lte('shift_date', weekEnd.toISOString().slice(0, 10))
    : service
        .from('staff_shifts')
        .select('id, staff_member_id, status, shift_date, start_time, end_time', { count: 'exact' })
        .eq('venue_id', venueId)
        .gte('shift_date', today.toISOString().slice(0, 10))
        .lte('shift_date', weekEnd.toISOString().slice(0, 10))

  const [shiftResult, staffResult] = await Promise.all([
    shiftQuery,
    service
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('employer_entity_type', 'venue')
      .eq('employer_entity_id', venueId)
      .eq('status', 'active'),
  ])

  const shifts = shiftResult.data || []
  const assignedShiftCount = shifts.filter((shift: any) => Boolean(shift.staff_member_id)).length
  const completedShiftCount = shifts.filter((shift: any) => shift.status === 'completed').length
  const totalScheduledHours = shifts.reduce((sum: number, shift: any) => {
    const start = Date.parse(`1970-01-01T${shift.start_time || '00:00'}Z`)
    const end = Date.parse(`1970-01-01T${shift.end_time || '00:00'}Z`)
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return sum
    return sum + (end - start) / (1000 * 60 * 60)
  }, 0)
  const completionRate = shifts.length ? Math.round((completedShiftCount / shifts.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Staff Scheduling</h1>
          <p className="text-muted-foreground break-words">
            {venue?.venue_name
              ? `Shifts and assignments for ${venue.venue_name}`
              : "Manage shifts, assignments, and scheduling for your venue"}
          </p>
          <Button asChild variant="link" className="mt-1 h-auto px-0 text-emerald-400">
            <a href="/venue/staff">Back to staff hub</a>
          </Button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Shifts</p>
                <p className="text-2xl font-bold">{shifts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Staff Assigned</p>
                <p className="text-2xl font-bold">{assignedShiftCount || staffResult.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Hours This Week</p>
                <p className="text-2xl font-bold">{Math.round(totalScheduledHours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Shifts</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Requests</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Calendar</CardTitle>
              <CardDescription>
                View and manage shifts in a calendar format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading calendar...</div>}>
                <ShiftCalendar venueId={venueId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Management</CardTitle>
              <CardDescription>
                Create, edit, and manage individual shifts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading shifts...</div>}>
                <ShiftManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Templates</CardTitle>
              <CardDescription>
                Create and manage reusable shift templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading templates...</div>}>
                <ShiftTemplates venueId={venueId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Requests</CardTitle>
              <CardDescription>
                Manage shift swaps, drops, and pickup requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading requests...</div>}>
                <ShiftRequests venueId={venueId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Analytics</CardTitle>
              <CardDescription>
                View insights and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading analytics...</div>}>
                <ShiftAnalytics venueId={venueId} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
