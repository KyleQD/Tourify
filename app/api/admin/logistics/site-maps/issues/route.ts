import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'
import type { CreateMapIssueRequest } from '@/types/site-map'

export async function GET(request: NextRequest) {
  return withAdminCapability('logistics.view', async (_request, { supabase, user, admin }) => {
    try {
      const { searchParams } = new URL(request.url)
      const siteMapId = searchParams.get('siteMapId') || searchParams.get('site_map_id')

      if (!siteMapId) {
        return siteMapError('Site map ID is required', 400)
      }

      const access = await getSiteMapAccess(supabase as any, siteMapId, user.id, { requiredOrgId: admin.orgId })
      const accessCheck = requireSiteMapAccess(access, 'read')
      if (!accessCheck.ok) {
        return siteMapError(accessCheck.error, accessCheck.status)
      }

      const { data: issues, error } = await supabase
        .from('map_issues')
        .select(`
          *,
          assigned_to_user:profiles!assigned_to(full_name, username),
          reported_by_user:profiles!reported_by(full_name, username)
        `)
        .eq('site_map_id', siteMapId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching issues:', error)
        return siteMapError('Failed to fetch issues')
      }

      return siteMapSuccess(issues || [])
    } catch (error) {
      console.error('Error in issues GET:', error)
      return siteMapError('Internal server error')
    }
  })(request)
}

export async function POST(request: NextRequest) {
  return withAdminCapability('logistics.manage', async (_request, { supabase, user, admin }) => {
    try {
      const body = await request.json() as CreateMapIssueRequest & Record<string, any>
      const siteMapId = body.siteMapId || body.site_map_id
      const issueType = body.issueType || body.issue_type
      const severity = body.severity
      const title = body.title
      const description = body.description
      const x = body.x
      const y = body.y
      const assignedTo = body.assignedTo ?? body.assigned_to
      const photos = body.photos
      const notes = body.notes

      if (!siteMapId || !issueType || !severity || !title || x === undefined || y === undefined) {
        return siteMapError('Site map ID, issue type, severity, title, and coordinates are required', 400)
      }

      const access = await getSiteMapAccess(supabase as any, siteMapId, user.id, { requiredOrgId: admin.orgId })
      const accessCheck = requireSiteMapAccess(access, 'edit')
      if (!accessCheck.ok) {
        return siteMapError(accessCheck.error, accessCheck.status)
      }

      const { data: issue, error } = await supabase
        .from('map_issues')
        .insert({
          site_map_id: siteMapId,
          issue_type: issueType,
          severity,
          title,
          description,
          x,
          y,
          assigned_to: assignedTo,
          reported_by: user.id,
          photos,
          notes,
          status: 'open'
        })
        .select(`
          *,
          assigned_to_user:profiles!assigned_to(full_name, username),
          reported_by_user:profiles!reported_by(full_name, username)
        `)
        .single()

      if (error) {
        console.error('Error creating issue:', error)
        return siteMapError('Failed to create issue')
      }

      return siteMapSuccess(issue, { status: 201 })
    } catch (error) {
      console.error('Error in issues POST:', error)
      return siteMapError('Internal server error')
    }
  })(request)
}