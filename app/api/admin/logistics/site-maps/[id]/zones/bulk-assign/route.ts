import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import { bulkAssignTeamToZone, refreshEventZoneStaffingCounts } from '@/lib/site-map/zone-roster-sync'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: siteMapId } = await params
  return withAdminCapability('logistics.manage', async (req, { supabase, user, admin }) => {
    try {
      const access = await getSiteMapAccess(supabase as any, siteMapId, user.id, {
        requiredOrgId: admin.orgId,
      })
      const accessCheck = requireSiteMapAccess(access, 'edit')
      if (!accessCheck.ok) {
        return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
      }

      const body = await req.json()
      const zoneId = body.zoneId || body.zone_id
      if (!zoneId) return NextResponse.json({ error: 'zoneId is required' }, { status: 400 })

      const result = await bulkAssignTeamToZone({
        supabase,
        siteMapId,
        zoneId,
        leadUserId: body.leadUserId ?? body.lead_user_id ?? null,
        assignedDepartment: body.assignedDepartment ?? body.assigned_department ?? null,
        starterTasks: Array.isArray(body.starterTasks) ? body.starterTasks : [],
        actorUserId: user.id,
      })

      await refreshEventZoneStaffingCounts({ supabase, siteMapId })

      return NextResponse.json({ success: true, data: result })
    } catch (error: any) {
      console.error('[Bulk Assign Zone]', error)
      return NextResponse.json({ error: error?.message || 'Failed to bulk assign zone' }, { status: 500 })
    }
  })(request)
}