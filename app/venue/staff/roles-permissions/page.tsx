import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Settings, Activity } from 'lucide-react'
import { RoleManagement } from '@/components/venue/staff/role-management'
import { UserRoleAssignment } from '@/components/venue/staff/user-role-assignment'
import { createClient } from '@/lib/supabase/server'
import { getCurrentVenueContext } from '@/lib/venue/venue-access'
import { redirect } from 'next/navigation'

interface RolesPermissionsPageProps {
  searchParams: Promise<{ venueId?: string }>
}

export default async function RolesPermissionsPage({ searchParams }: RolesPermissionsPageProps) {
  const { venueId: venueIdParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=%2Fvenue%2Fstaff%2Froles-permissions')

  let venueId = venueIdParam
  if (!venueId) {
    const context = await getCurrentVenueContext(supabase, user.id)
    venueId = context?.id
  }

  if (!venueId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Venue Selected</h3>
            <p className="text-muted-foreground text-center">
              Complete your venue profile first, then return to manage roles and permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [rolesResp, assignmentsResp, permissionsResp, auditResp] = await Promise.all([
    supabase.from('rbac_roles').select('id', { count: 'exact', head: true }),
    supabase
      .from('rbac_user_entity_roles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'Venue')
      .eq('entity_id', venueId)
      .eq('is_active', true),
    supabase.from('rbac_permissions').select('id', { count: 'exact', head: true }),
    supabase
      .from('rbac_permission_audit_log')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalRoles = rolesResp.count || 0
  const activeUsers = assignmentsResp.count || 0
  const systemPermissions = permissionsResp.count || 0
  const recentActivity = auditResp.count || 0

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
        </div>
        <p className="text-muted-foreground">
          Manage roles, assign permissions, and control access for your venue staff
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRoles}</div>
            <p className="text-xs text-muted-foreground">
              Configured role templates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active assignments for this venue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Permissions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemPermissions}</div>
            <p className="text-xs text-muted-foreground">
              Total permission primitives
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivity}</div>
            <p className="text-xs text-muted-foreground">
              Permission changes in last 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Role Management</span>
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>User Assignments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Suspense fallback={
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>Loading...</CardDescription>
              </CardHeader>
            </Card>
          }>
            <RoleManagement venueId={venueId} />
          </Suspense>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Suspense fallback={
            <Card>
              <CardHeader>
                <CardTitle>User Role Assignment</CardTitle>
                <CardDescription>Loading...</CardDescription>
              </CardHeader>
            </Card>
          }>
            <UserRoleAssignment venueId={venueId} />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Role Levels</span>
            </CardTitle>
            <CardDescription>
              Understanding the hierarchy of roles in your venue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Entry Level</span>
              <Badge variant="secondary">Level 1</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Mid Level</span>
              <Badge variant="secondary">Level 2</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Senior Level</span>
              <Badge variant="secondary">Level 3</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Manager Level</span>
              <Badge variant="secondary">Level 4</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Admin Level</span>
              <Badge variant="secondary">Level 5</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Permission Categories</span>
            </CardTitle>
            <CardDescription>
              Types of permissions available in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Badge variant="outline" className="text-xs">Staff Management</Badge>
              <Badge variant="outline" className="text-xs">Events</Badge>
              <Badge variant="outline" className="text-xs">Bookings</Badge>
              <Badge variant="outline" className="text-xs">Analytics</Badge>
              <Badge variant="outline" className="text-xs">Settings</Badge>
              <Badge variant="outline" className="text-xs">Documents</Badge>
              <Badge variant="outline" className="text-xs">Payroll</Badge>
              <Badge variant="outline" className="text-xs">Communications</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>Best Practices for Role Management</CardTitle>
          <CardDescription>
            Follow these guidelines to maintain a secure and efficient permission system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Principle of Least Privilege</h4>
              <p className="text-sm text-muted-foreground">
                Only grant permissions that are absolutely necessary for each role to perform their duties.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Regular Reviews</h4>
              <p className="text-sm text-muted-foreground">
                Periodically review role assignments and permissions to ensure they remain appropriate.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Temporary Assignments</h4>
              <p className="text-sm text-muted-foreground">
                Use expiration dates for temporary role assignments to automatically revoke access.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Audit Trail</h4>
              <p className="text-sm text-muted-foreground">
                All permission changes are logged for security and compliance purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 