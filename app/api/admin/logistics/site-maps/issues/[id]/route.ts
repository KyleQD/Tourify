import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'

type RouteContext = { params: Promise<{ id: string }> }

const ISSUE_SELECT = `
  *,
  assigned_to_user:profiles!assigned_to(full_name, username),
  reported_by_user:profiles!reported_by(full_name, username)
`

function buildIssueUpdates(body: Record<string, any>) {
  const updates: Record<string, any> = {}

  if (body.issueType !== undefined || body.issue_type !== undefined) updates.issue_type = body.issueType ?? body.issue_type
  if (body.severity !== undefined) updates.severity = body.severity
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.x !== undefined) updates.x = body.x
  if (body.y !== undefined) updates.y = body.y
  if (body.status !== undefined) updates.status = body.status
  if (body.assignedTo !== undefined || body.assigned_to !== undefined) updates.assigned_to = body.assignedTo ?? body.assigned_to
  if (body.photos !== undefined) updates.photos = body.photos
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.resolvedAt !== undefined || body.resolved_at !== undefined) updates.resolved_at = body.resolvedAt ?? body.resolved_at

  if ((updates.status === 'resolved' || updates.status === 'closed') && updates.resolved_at === undefined) {
    updates.resolved_at = new Date().toISOString()
  }
  if ((updates.status === 'open' || updates.status === 'in_progress') && updates.resolved_at === undefined) {
    updates.resolved_at = null
  }

  return updates
}

async function getIssueForAccess(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  return supabase
    .from('map_issues')
    .select('id, site_map_id')
    .eq('id', id)
    .single()
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data: issue, error } = await supabase
      .from('map_issues')
      .select(ISSUE_SELECT)
      .eq('id', id)
      .single()

    if (error || !issue) return siteMapError('Issue not found', 404)

    const access = await getSiteMapAccess(supabase, issue.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    return siteMapSuccess(issue)
  } catch (error) {
    console.error('Error in issue GET:', error)
    return siteMapError('Internal server error')
  }
}

async function updateIssue(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data: existingIssue, error: fetchError } = await getIssueForAccess(supabase, id)
    if (fetchError || !existingIssue) return siteMapError('Issue not found', 404)

    const access = await getSiteMapAccess(supabase, existingIssue.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const body = await request.json()
    const updates = buildIssueUpdates(body)

    const { data: issue, error } = await supabase
      .from('map_issues')
      .update(updates)
      .eq('id', id)
      .select(ISSUE_SELECT)
      .single()

    if (error) {
      console.error('Error updating issue:', error)
      return siteMapError('Failed to update issue')
    }

    return siteMapSuccess(issue)
  } catch (error) {
    console.error('Error in issue update:', error)
    return siteMapError('Internal server error')
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateIssue(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateIssue(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data: existingIssue, error: fetchError } = await getIssueForAccess(supabase, id)
    if (fetchError || !existingIssue) return siteMapError('Issue not found', 404)

    const access = await getSiteMapAccess(supabase, existingIssue.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const { error } = await supabase
      .from('map_issues')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting issue:', error)
      return siteMapError('Failed to delete issue')
    }

    return siteMapSuccess({ deleted: true })
  } catch (error) {
    console.error('Error in issue DELETE:', error)
    return siteMapError('Internal server error')
  }
}
