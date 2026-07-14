import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SiteMapAccessRole = 'none' | 'public' | 'viewer' | 'editor' | 'admin' | 'owner'
export type SiteMapAccessAction = 'read' | 'edit' | 'manage' | 'share' | 'export' | 'comment' | 'completeTask'

export interface SiteMapAccess {
  siteMapId: string
  userId?: string | null
  role: SiteMapAccessRole
  siteMap?: {
    id: string
    created_by?: string | null
    is_public?: boolean | null
  }
  collaborator?: {
    can_edit?: boolean | null
    can_invite_users?: boolean | null
    can_export?: boolean | null
    is_active?: boolean | null
  } | null
  canRead: boolean
  canEdit: boolean
  canManage: boolean
  canShare: boolean
  canExport: boolean
  canComment: boolean
  canCompleteTasks: boolean
}

export interface SiteMapAccessFailure {
  ok: false
  status: number
  error: string
}

export interface SiteMapAccessSuccess {
  ok: true
}

function accessForRole(
  siteMapId: string,
  userId: string | null | undefined,
  role: SiteMapAccessRole,
  siteMap?: SiteMapAccess['siteMap'],
  collaborator?: SiteMapAccess['collaborator']
): SiteMapAccess {
  const owner = role === 'owner'
  const admin = role === 'admin'
  const editor = role === 'editor'
  const viewer = role === 'viewer'
  const publicUser = role === 'public'

  return {
    siteMapId,
    userId,
    role,
    siteMap,
    collaborator,
    canRead: owner || admin || editor || viewer || publicUser,
    canEdit: owner || admin || editor,
    canManage: owner || admin,
    canShare: owner || admin,
    canExport: owner || admin || editor || viewer,
    canComment: owner || admin || editor,
    canCompleteTasks: owner || admin || editor || viewer,
  }
}

export async function getSiteMapAccess(
  supabase: SupabaseClient,
  siteMapId: string,
  userId?: string | null
): Promise<SiteMapAccess> {
  if (!siteMapId) {
    return accessForRole(siteMapId, userId, 'none')
  }

  const { data: siteMap, error: siteMapError } = await supabase
    .from('site_maps')
    .select('id, created_by, is_public')
    .eq('id', siteMapId)
    .maybeSingle()

  if (siteMapError || !siteMap) {
    return accessForRole(siteMapId, userId, 'none')
  }

  if (!userId) {
    return accessForRole(siteMapId, userId, siteMap.is_public ? 'public' : 'none', siteMap)
  }

  if (siteMap.created_by === userId) {
    return accessForRole(siteMapId, userId, 'owner', siteMap)
  }

  const { data: collaborator } = await supabase
    .from('site_map_collaborators')
    .select('can_edit, can_invite_users, can_export, is_active')
    .eq('site_map_id', siteMapId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!collaborator?.is_active) {
    return accessForRole(siteMapId, userId, siteMap.is_public ? 'public' : 'none', siteMap)
  }

  if (collaborator.can_invite_users) {
    return accessForRole(siteMapId, userId, 'admin', siteMap, collaborator)
  }

  if (collaborator.can_edit) {
    return accessForRole(siteMapId, userId, 'editor', siteMap, collaborator)
  }

  return accessForRole(siteMapId, userId, 'viewer', siteMap, collaborator)
}

export function canAccessSiteMap(access: SiteMapAccess, action: SiteMapAccessAction): boolean {
  switch (action) {
    case 'read':
      return access.canRead
    case 'edit':
      return access.canEdit
    case 'manage':
      return access.canManage
    case 'share':
      return access.canShare
    case 'export':
      return access.canExport
    case 'comment':
      return access.canComment
    case 'completeTask':
      return access.canCompleteTasks
    default:
      return false
  }
}

export function requireSiteMapAccess(
  access: SiteMapAccess,
  action: SiteMapAccessAction
): SiteMapAccessSuccess | SiteMapAccessFailure {
  if (canAccessSiteMap(access, action)) {
    return { ok: true }
  }

  return {
    ok: false,
    status: access.siteMap ? 403 : 404,
    error: access.siteMap ? 'Forbidden' : 'Site map not found',
  }
}

export function siteMapSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data, error: null }, init)
}

export function siteMapError(error: string, status = 500) {
  return NextResponse.json({ success: false, data: null, error }, { status })
}
