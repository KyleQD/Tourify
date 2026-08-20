import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: siteMap, error } = await supabase
      .from('site_maps')
      .select(`
        id, name, description, width, height, status, event_id, tour_id,
        background_color, grid_enabled, grid_size, scale, scale_unit,
        zones:site_map_zones(*),
        tents:glamping_tents(*),
        elements:site_map_elements(*),
        layers:site_map_layers(*)
      `)
      .eq('id', siteMapId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!siteMap) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })

    let assignmentQuery = supabase
      .from('employment_assignments')
      .select('id, department, event_id, status')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'active'])
    if (siteMap.event_id) assignmentQuery = assignmentQuery.eq('event_id', siteMap.event_id)
    const { data: assignment } = await assignmentQuery.limit(1).maybeSingle()

    const department = assignment?.department || null

    const { data: tasks } = await supabase
      .from('map_task_assignments')
      .select(`
        id, title, task_description, status, priority, due_date, checklist,
        element_id, element_type, assigned_user_id, assigned_role, assigned_team_id,
        blocker_reason, coordinate
      `)
      .eq('site_map_id', siteMapId)
      .or(
        [
          `assigned_user_id.eq.${user.id}`,
          department ? `assigned_role.ilike.%${department}%` : null,
        ].filter(Boolean).join(',')
      )

    const hasAssignedTask = (tasks || []).some((task: any) => task.assigned_user_id === user.id)
    if (!assignment && !hasAssignedTask) {
      return NextResponse.json({ error: 'Map not available for this Work Mode assignment' }, { status: 403 })
    }

    const leadZoneIds = new Set(
      (siteMap.zones || [])
        .filter((zone: any) => zone.lead_user_id === user.id || (department && zone.assigned_department === department))
        .map((zone: any) => zone.id)
    )

    const scopedTasks = (tasks || []).filter((task: any) => {
      if (task.assigned_user_id === user.id) return true
      if (task.element_type === 'zone' && leadZoneIds.has(task.element_id)) return true
      if (department && task.assigned_role && String(task.assigned_role).toLowerCase().includes(department.toLowerCase()))
        return true
      return false
    })

    const relevantZoneIds = new Set([
      ...leadZoneIds,
      ...scopedTasks.filter((t: any) => t.element_type === 'zone' && t.element_id).map((t: any) => t.element_id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...siteMap,
        zones: (siteMap.zones || []).filter((zone: any) =>
          relevantZoneIds.size === 0 ? true : relevantZoneIds.has(zone.id) || zone.lead_user_id === user.id
        ),
        myTasks: scopedTasks,
        viewer: {
          userId: user.id,
          department,
        },
      },
    })
  } catch (error: any) {
    console.error('[Work Site Map GET]', error)
    return NextResponse.json({ error: error?.message || 'Failed to load worker map' }, { status: 500 })
  }
}
