import type { SupabaseClient } from '@supabase/supabase-js'

export interface CollaborationTour {
  id: string
  name: string
  status: string | null
  start_date: string | null
  end_date: string | null
}

export interface CollaborationTeamMember {
  id: string
  user_id: string | null
  role: string | null
  profile: Record<string, unknown> | null
}

export interface CollaborationTeam {
  id: string
  tour_id: string
  name: string
  team_type: string | null
  members: CollaborationTeamMember[]
}

export interface CollaborationLogisticsTask {
  id: string
  tour_id: string | null
  event_id: string | null
  type: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  assigned_to_user_id: string | null
}

function mapTask(row: Record<string, unknown>): CollaborationLogisticsTask {
  return {
    id: String(row.id),
    tour_id: (row.tour_id as string) || null,
    event_id: (row.event_id as string) || null,
    type: String(row.type),
    title: String(row.title),
    description: (row.description as string) || null,
    status: String(row.status),
    priority: String(row.priority),
    due_date: (row.due_date as string) || null,
    assigned_to_user_id: (row.assigned_to_user_id as string) || null,
  }
}

/**
 * Loads tours the artist is on, related tour teams/members, and logistics tasks
 * (for those tours or assigned directly to the user).
 */
export async function fetchArtistCollaboration(
  supabase: SupabaseClient,
  userId: string
): Promise<{ tours: CollaborationTour[]; teams: CollaborationTeam[]; tasks: CollaborationLogisticsTask[] }> {
  const empty: {
    tours: CollaborationTour[]
    teams: CollaborationTeam[]
    tasks: CollaborationLogisticsTask[]
  } = { tours: [], teams: [], tasks: [] }

  async function tasksAssignedToUser() {
    const { data: assigned } = await supabase.from('logistics_tasks').select('*').eq('assigned_to_user_id', userId)
    return (assigned || []).map(r => mapTask(r as Record<string, unknown>))
  }

  const { data: tourArtistRows, error: taErr } = await supabase
    .from('tour_artists')
    .select('tour_id')
    .eq('artist_user_id', userId)

  if (taErr) {
    console.warn('[collaboration] tour_artists:', taErr.message)
    return { ...empty, tasks: await tasksAssignedToUser() }
  }

  const tourIds = [...new Set((tourArtistRows || []).map(r => r.tour_id).filter(Boolean))] as string[]
  if (tourIds.length === 0) return { ...empty, tasks: await tasksAssignedToUser() }

  const { data: tours, error: toursErr } = await supabase
    .from('tours')
    .select('id, name, status, start_date, end_date')
    .in('id', tourIds)

  if (toursErr) {
    console.warn('[collaboration] tours:', toursErr.message)
    return { ...empty, tasks: await tasksAssignedToUser() }
  }

  const { data: teamRows } = await supabase.from('tour_teams').select('id, tour_id, name, team_type').in('tour_id', tourIds)

  const teamIds = (teamRows || []).map(t => t.id).filter(Boolean) as string[]
  const membersByTeam = new Map<string, CollaborationTeamMember[]>()

  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from('tour_team_members')
      .select('id, team_id, user_id, role, profile')
      .in('team_id', teamIds)

    for (const m of members || []) {
      const row = m as Record<string, unknown>
      const tid = String(row.team_id)
      const list = membersByTeam.get(tid) || []
      list.push({
        id: String(row.id),
        user_id: (row.user_id as string) || null,
        role: (row.role as string) || null,
        profile: (row.profile as Record<string, unknown>) || null,
      })
      membersByTeam.set(tid, list)
    }
  }

  const teams: CollaborationTeam[] = (teamRows || []).map(t => {
    const tr = t as Record<string, unknown>
    const id = String(tr.id)
    return {
      id,
      tour_id: String(tr.tour_id),
      name: String(tr.name),
      team_type: (tr.team_type as string) || null,
      members: membersByTeam.get(id) || [],
    }
  })

  const { data: byTour } = await supabase.from('logistics_tasks').select('*').in('tour_id', tourIds)
  const assigned = await tasksAssignedToUser()
  const taskMap = new Map<string, CollaborationLogisticsTask>()
  for (const r of [...(byTour || []), ...assigned]) {
    const t = mapTask(r as Record<string, unknown>)
    taskMap.set(t.id, t)
  }

  return {
    tours: (tours || []).map(t => ({
      id: String((t as { id: string }).id),
      name: String((t as { name: string }).name),
      status: ((t as { status?: string }).status as string) || null,
      start_date: ((t as { start_date?: string }).start_date as string) || null,
      end_date: ((t as { end_date?: string }).end_date as string) || null,
    })),
    teams,
    tasks: Array.from(taskMap.values()),
  }
}

export function memberDisplayName(m: CollaborationTeamMember): string {
  const p = m.profile
  if (p && typeof p === 'object' && p !== null && 'name' in p && typeof (p as { name?: string }).name === 'string') {
    return (p as { name: string }).name
  }
  if (p && typeof p === 'object' && p !== null && 'email' in p && typeof (p as { email?: string }).email === 'string') {
    return (p as { email: string }).email
  }
  if (m.user_id) return `Account ${m.user_id.slice(0, 8)}…`
  return 'Collaborator'
}
