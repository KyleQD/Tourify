'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { VenueService } from '@/lib/services/venue.service'
import { TeamRole, TeamMember, TeamInvite } from '../types/team'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'manager', 'staff', 'artist'] as const),
  eventId: z.string(),
})

function mapRoleToDbRole(role: TeamRole) {
  return role
}

function mapRowToTeamMember(row: Record<string, unknown>): TeamMember {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : '',
    eventId: String(row.venue_id),
    role: (row.role as TeamRole) || 'staff',
    status: (row.status as TeamMember['status']) || 'active',
    joinedAt: String(row.created_at || new Date().toISOString()),
    user: {
      id: row.user_id ? String(row.user_id) : String(row.id),
      fullName: String(row.name || row.email || 'Team member'),
      email: String(row.email || ''),
      avatar: row.avatar_url ? String(row.avatar_url) : undefined,
    },
  }
}

async function getAuthorizedSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, supabase, user: null }
  return { supabase, user, error: null }
}

async function canManageVenueTeam(supabase: Awaited<ReturnType<typeof createClient>>, venueId: string, userId: string) {
  const { data: venue } = await supabase
    .from('venue_profiles')
    .select('id, user_id, main_profile_id')
    .eq('id', venueId)
    .maybeSingle()

  if (!venue) return false
  if (venue.user_id === userId || venue.main_profile_id === userId) return true

  const { data: membership } = await supabase
    .from('venue_team_members')
    .select('permissions')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  const permissions = membership?.permissions as Record<string, boolean> | null
  return Boolean(permissions?.manage_team || permissions?.manage_settings)
}

export async function inviteTeamMember(data: z.infer<typeof inviteSchema>) {
  try {
    const validatedData = inviteSchema.parse(data)
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const venueId = validatedData.eventId
    const allowed = await canManageVenueTeam(auth.supabase, venueId, auth.user.id)
    if (!allowed) return { success: false, error: 'You do not have permission to invite team members' }

    const { error: insertError } = await auth.supabase
      .from('venue_team_members')
      .insert({
        venue_id: venueId,
        email: validatedData.email,
        name: validatedData.email.split('@')[0],
        role: mapRoleToDbRole(validatedData.role),
        status: 'inactive',
        permissions: {
          manage_bookings: false,
          manage_events: false,
          view_analytics: false,
          manage_team: false,
          manage_documents: false,
        },
      })

    if (insertError) {
      return { success: false, error: insertError.message }
    }

    revalidatePath('/venue')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation',
    }
  }
}

export async function updateTeamMemberRole(memberId: string, role: TeamRole) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const { data: member } = await auth.supabase
      .from('venue_team_members')
      .select('venue_id')
      .eq('id', memberId)
      .maybeSingle()

    if (!member?.venue_id) return { success: false, error: 'Team member not found' }

    const allowed = await canManageVenueTeam(auth.supabase, member.venue_id, auth.user.id)
    if (!allowed) return { success: false, error: 'You do not have permission to update roles' }

    const { error } = await auth.supabase
      .from('venue_team_members')
      .update({ role: mapRoleToDbRole(role), updated_at: new Date().toISOString() })
      .eq('id', memberId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update role' }
  }
}

export async function removeTeamMember(memberId: string) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const { data: member } = await auth.supabase
      .from('venue_team_members')
      .select('venue_id')
      .eq('id', memberId)
      .maybeSingle()

    if (!member?.venue_id) return { success: false, error: 'Team member not found' }

    const allowed = await canManageVenueTeam(auth.supabase, member.venue_id, auth.user.id)
    if (!allowed) return { success: false, error: 'You do not have permission to remove team members' }

    const { error } = await auth.supabase
      .from('venue_team_members')
      .delete()
      .eq('id', memberId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to remove team member' }
  }
}

export async function getTeamMembers(eventId: string): Promise<TeamMember[]> {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return []

    const venueService = new VenueService(auth.supabase as never)
    const members = await venueService.getVenueTeamMembers(eventId)
    return members.map(member => mapRowToTeamMember(member as unknown as Record<string, unknown>))
  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return []
  }
}

export async function getTeamInvites(eventId: string): Promise<TeamInvite[]> {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return []

    const { data, error } = await auth.supabase
      .from('venue_team_members')
      .select('*')
      .eq('venue_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch team invites:', error)
      return []
    }

    return (data || []).map(row => ({
      id: String(row.id),
      eventId: String(row.venue_id),
      email: String(row.email),
      role: (row.role as TeamRole) || 'staff',
      status: 'pending',
      createdAt: String(row.created_at),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  } catch (error) {
    console.error('Failed to fetch team invites:', error)
    return []
  }
}
