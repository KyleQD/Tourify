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
}

const WORK_MODE_KEY = 'tourify.work-mode-assignment'

export function useWorkMode() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<WorkAssignment[]>([])
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

      if (!error && data) {
        setAssignments(data as WorkAssignment[])
      }
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

  const confirmAssignment = useCallback(async (assignmentId: string) => {
    if (!user?.id) return false
    const { error } = await supabase
      .from('employment_assignments')
      .update({ status: 'confirmed' })
      .eq('id', assignmentId)
      .eq('user_id', user.id)
    if (!error) await fetchAssignments()
    return !error
  }, [user?.id, fetchAssignments])

  return {
    assignments,
    activeAssignment,
    isInWorkMode: activeAssignmentId !== null,
    isLoading,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    refreshAssignments: fetchAssignments,
  }
}
