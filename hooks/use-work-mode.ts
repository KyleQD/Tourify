'use client'

/**
 * Work Mode hook — provides read access to the user's active employment assignments
 * and a helper to activate/deactivate Work Mode for a given assignment.
 *
 * Work Mode is a transient overlay on the general account. It does NOT create a
 * new account type in the switcher. The assignment read model is authorized on
 * the server; the client only stores the selected assignment id for navigation
 * resilience and optional session context.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication as SharedWorkModePublication,
} from '@/types/hiring-roster-work-mode'

export type WorkAssignment = WorkModeAssignmentListItem
export type WorkModePublication = SharedWorkModePublication

const WORK_MODE_KEY = 'tourify.work-mode-assignment'

export function useWorkMode() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<WorkAssignment[]>([])
  const [publications, setPublications] = useState<WorkModePublication[]>([])
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) ?? null

  // Persist active assignment id to sessionStorage for page-reload resilience.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeAssignmentId) {
      sessionStorage.setItem(WORK_MODE_KEY, activeAssignmentId)
    } else {
      sessionStorage.removeItem(WORK_MODE_KEY)
    }
  }, [activeAssignmentId])

  // Restore from sessionStorage first, then validate against user_sessions.
  // The restored id is never an authorization signal; the server read model must
  // still return the assignment before it can become an active Work assignment.
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return
    const stored = sessionStorage.getItem(WORK_MODE_KEY)
    if (stored) {
      setActiveAssignmentId(stored)
      return
    }

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
    if (!user?.id) {
      setAssignments([])
      setPublications([])
      setActiveAssignmentId(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/work-mode/assignments', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as
        | WorkModeApiResponse<WorkModeAssignmentsPayload>
        | null

      if (!response.ok || !payload?.data) {
        console.warn('[work-mode] authorized assignment read unavailable', payload?.error)
        return
      }

      setAssignments(payload.data.assignments)
      setPublications(payload.data.publications)
      setActiveAssignmentId((current) => {
        if (current && payload.data?.assignments.some((assignment) => assignment.id === current)) {
          return current
        }

        return (
          payload.data.assignments.find(
            (assignment) => assignment.status === 'active' || assignment.status === 'confirmed'
          )?.id ?? null
        )
      })
    } catch (error) {
      console.warn('[work-mode] authorized assignment read failed', error)
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
      // non-fatal — sessionStorage is still the primary client-side selection signal
    }
  }, [user?.id])

  const activateWorkMode = useCallback((assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId) ?? null
    if (!assignment) return

    setActiveAssignmentId(assignmentId)
    void persistWorkModeToSession(assignmentId, assignment)
  }, [assignments, persistWorkModeToSession])

  const deactivateWorkMode = useCallback(() => {
    setActiveAssignmentId(null)
    void persistWorkModeToSession(null)
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
    isInWorkMode: activeAssignment !== null,
    isLoading,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
    respondToAssignment,
    refreshAssignments: fetchAssignments,
  }
}
