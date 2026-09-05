'use client'

/**
 * Work Mode hook — provides read access to the user's active employment assignments
 * and a helper to activate/deactivate Work Mode for a given assignment.
 *
 * Work Mode is a transient overlay on the general account. It does NOT create a
 * new account type in the switcher. The assignment list is authorized and assembled
 * by the server; the browser only keeps the worker's current selection.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from '@/types/hiring-roster-work-mode'

// Compatibility aliases for existing hook consumers. New code should prefer the
// shared contracts from types/hiring-roster-work-mode.ts.
export type WorkAssignment = WorkModeAssignmentListItem
export type { WorkModePublication }

const WORK_MODE_KEY = 'tourify.work-mode-assignment'

export function useWorkMode() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<WorkAssignment[]>([])
  const [publications, setPublications] = useState<WorkModePublication[]>([])
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeAssignment = assignments.find(a => a.id === activeAssignmentId) ?? null

  // Persist only the selected assignment id locally. Authorization is always
  // recalculated by the server read model when assignments are loaded.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (activeAssignmentId) {
      sessionStorage.setItem(WORK_MODE_KEY, activeAssignmentId)
    } else {
      sessionStorage.removeItem(WORK_MODE_KEY)
    }
  }, [activeAssignmentId])

  // Restore from sessionStorage first, then use the legacy user_sessions selection
  // as a compatibility fallback. The restored id is validated after the server read.
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
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/work-mode/assignments', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json()) as WorkModeApiResponse<WorkModeAssignmentsPayload>

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || 'Unable to load Work Mode.')
      }

      setAssignments(payload.data.assignments)
      setPublications(payload.data.publications)
      setActiveAssignmentId((current) => {
        if (current && payload.data?.assignments.some((assignment) => assignment.id === current)) {
          return current
        }

        return (
          payload.data?.assignments.find(
            (assignment) => assignment.status === 'active' || assignment.status === 'confirmed'
          )?.id ?? null
        )
      })
    } catch (requestError) {
      setAssignments([])
      setPublications([])
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load Work Mode.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void fetchAssignments()
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
      // Non-fatal compatibility write. The server read model remains authoritative.
    }
  }, [user?.id])

  const activateWorkMode = useCallback((assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId) ?? null
    if (!assignment || assignment.status === 'completed' || assignment.status === 'cancelled') {
      return
    }

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

    setError(null)
    try {
      const response = await fetch(`/api/work-mode/assignments/${assignmentId}/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | WorkModeApiResponse<never>
          | null
        setError(payload?.error || 'The assignment response could not be saved.')
        return false
      }

      await fetchAssignments()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assignment response could not be saved.'
      )
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
    error,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
    respondToAssignment,
    refreshAssignments: fetchAssignments,
  }
}
