'use client'

/**
 * Work Mode hook — provides read access to the user's active employment assignments
 * and a helper to activate/deactivate Work Mode for a given assignment.
 *
 * Work Mode is a transient overlay on the general account. It does NOT create a
 * new account type in the switcher. Instead, it stores a `work_assignment_id` in
 * the session so API routes can grant the additional event/venue permissions.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'

export interface WorkAssignment {
  id: string
  role_title: string
  department?: string | null
  event_id?: string | null
  venue_id?: string | null
  organizer_id?: string | null
  starts_at?: string | null
  ends_at?: string | null
  status: 'invited' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  permissions: Record<string, boolean>
  source?: 'assignment' | 'publication'
  publication_type?: string | null
  href?: string | null
  site_map_id?: string | null
}

export interface WorkModePublication {
  id: string
  event_id: string | null
  publication_type: string
  title: string
  payload?: Record<string, unknown> | null
  published_at?: string | null
}

const WORK_MODE_KEY = 'tourify.work-mode-assignment'

export function useWorkMode() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<WorkAssignment[]>([])
  const [publications, setPublications] = useState<WorkModePublication[]>([])
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) ?? null

  // Persist active assignment id to sessionStorage for page-reload resilience
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeAssignmentId) {
      sessionStorage.setItem(WORK_MODE_KEY, activeAssignmentId)
    } else {
      sessionStorage.removeItem(WORK_MODE_KEY)
    }
  }, [activeAssignmentId])

  // Restore from sessionStorage first, then validate against user_sessions
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return
    const stored = sessionStorage.getItem(WORK_MODE_KEY)
    if (stored) {
      setActiveAssignmentId(stored)
      return
    }
    // Fall back to server-side session_data.work_mode
    supabase
      .from('user_sessions')
      .select('session_data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const workMode = (data?.session_data as any)?.work_mode
        if (workMode?.assignment_id) {
          setActiveAssignmentId(workMode.assignment_id)
        }
      })
  }, [user?.id])

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('employment_assignments')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['invited', 'confirmed', 'active'])
        .order('starts_at', { ascending: true })

      const baseAssignments = (!error && data
        ? (data as WorkAssignment[]).map((row) => ({ ...row, source: 'assignment' as const }))
        : [])

      const eventIds = Array.from(
        new Set(baseAssignments.map((row) => row.event_id).filter((id): id is string => Boolean(id)))
      )

      // Also collect event IDs from participant / staff shift links
      const [{ data: participantRows }, { data: shiftRows }] = await Promise.all([
        supabase
          .from('event_participants')
          .select('event_id')
          .eq('participant_id', user.id)
          .eq('participant_type', 'Individual')
          .limit(100),
        supabase
          .from('staff_shifts')
          .select('event_id, staff_members!inner(user_id)')
          .eq('staff_members.user_id', user.id)
          .limit(100),
      ])

      for (const row of participantRows || []) {
        if (row.event_id && !eventIds.includes(row.event_id)) eventIds.push(row.event_id)
      }
      for (const row of shiftRows || []) {
        if (row.event_id && !eventIds.includes(row.event_id)) eventIds.push(row.event_id)
      }

      let publicationAssignments: WorkAssignment[] = []
      let publicationRows: WorkModePublication[] = []

      if (eventIds.length > 0) {
        const { data: pubs } = await supabase
          .from('work_mode_publications')
          .select('id, event_id, publication_type, title, payload, published_at')
          .in('event_id', eventIds)
          .order('published_at', { ascending: false })
          .limit(50)

        publicationRows = (pubs || []) as WorkModePublication[]
        const existingEventIds = new Set(baseAssignments.map((a) => a.event_id).filter(Boolean))

        publicationAssignments = publicationRows
          .filter((pub) => pub.event_id && !existingEventIds.has(pub.event_id))
          .map((pub) => {
            const payload = (pub.payload || {}) as Record<string, unknown>
            const siteMapId = typeof payload.site_map_id === 'string' ? payload.site_map_id : null
            const workerUrl =
              (typeof payload.worker_url === 'string' && payload.worker_url) ||
              (typeof payload.url === 'string' && payload.url) ||
              (siteMapId ? `/work/site-maps/${siteMapId}` : null)

            return {
              id: `pub:${pub.id}`,
              role_title: pub.title || 'Published work package',
              department: pub.publication_type,
              event_id: pub.event_id,
              status: 'confirmed' as const,
              permissions: {},
              source: 'publication' as const,
              publication_type: pub.publication_type,
              starts_at: pub.published_at,
              href: workerUrl,
              site_map_id: siteMapId,
            }
          })
      }

      setPublications(publicationRows)
      setAssignments([...baseAssignments, ...publicationAssignments])
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const persistWorkModeToSession = useCallback(async (
    assignmentId: string | null,
    assignment?: WorkAssignment | null
  ) => {
    if (!user?.id) return
    try {
      const workMode = assignmentId && assignment
        ? {
            assignment_id: assignmentId,
            role_title: assignment.role_title,
            venue_id: assignment.venue_id ?? undefined,
            event_id: assignment.event_id ?? undefined,
          }
        : null

      await supabase
        .from('user_sessions')
        .update({ session_data: workMode ? { work_mode: workMode } : {} })
        .eq('user_id', user.id)
    } catch {
      // non-fatal — sessionStorage is still the primary client-side signal
    }
  }, [user?.id])

  const activateWorkMode = useCallback((assignmentId: string) => {
    setActiveAssignmentId(assignmentId)
    const assignment = assignments.find(a => a.id === assignmentId) ?? null
    persistWorkModeToSession(assignmentId, assignment)
  }, [assignments, persistWorkModeToSession])

  const deactivateWorkMode = useCallback(() => {
    setActiveAssignmentId(null)
    persistWorkModeToSession(null)
  }, [persistWorkModeToSession])

  const respondToAssignment = useCallback(async (
    assignmentId: string,
    action: 'accept' | 'decline'
  ) => {
    if (!user?.id) return false
    if (assignmentId.startsWith('pub:')) return false

    try {
      const response = await fetch(`/api/work-mode/assignments/${assignmentId}/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!response.ok) return false
      await fetchAssignments()
      return true
    } catch {
      return false
    }
  }, [user?.id, fetchAssignments])

  const confirmAssignment = useCallback(async (assignmentId: string) => {
    return respondToAssignment(assignmentId, 'accept')
  }, [respondToAssignment])

  const declineAssignment = useCallback(async (assignmentId: string) => {
    return respondToAssignment(assignmentId, 'decline')
  }, [respondToAssignment])

  return {
    assignments,
    publications,
    activeAssignment,
    isInWorkMode: activeAssignmentId !== null,
    isLoading,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
    respondToAssignment,
    refreshAssignments: fetchAssignments,
  }
}
