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

interface SchedulingPageProps {
  searchParams: Promise<{ venueId?: string }>
}

export default async function SchedulingPage({ searchParams }: SchedulingPageProps) {
  const { venueId } = await searchParams

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Staff Scheduling</h1>
          <p className="text-muted-foreground break-words">
            Manage shifts, assignments, and scheduling for your venue
          </p>
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
                <p className="text-2xl font-bold">24</p>
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
                <p className="text-2xl font-bold">18</p>
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
                <p className="text-2xl font-bold">156</p>
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
                <p className="text-2xl font-bold">94%</p>
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