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
import type {
  WorkModeApiResponse,
  WorkModeAttentionItem,
  WorkModeAssignmentListItem,
  WorkModeCommunication,
  WorkModeEventSummary,
  WorkModeOverviewPayload,
  WorkModePublication,
  WorkModeReminder,
  WorkModeSourceAvailability,
  WorkModeTaskItem,
} from '@/types/hiring-roster-work-mode'

const WORK_MODE_KEY = 'tourify.work-mode-assignment'

export function useWorkMode() {
  const [assignments, setAssignments] = useState<WorkModeAssignmentListItem[]>([])
  const [publications, setPublications] = useState<WorkModePublication[]>([])
  const [tasks, setTasks] = useState<WorkModeTaskItem[]>([])
  const [events, setEvents] = useState<WorkModeEventSummary[]>([])
  const [communications, setCommunications] = useState<WorkModeCommunication[]>([])
  const [reminders, setReminders] = useState<WorkModeReminder[]>([])
  const [attention, setAttention] = useState<WorkModeAttentionItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [sourceAvailability, setSourceAvailability] = useState<WorkModeSourceAvailability | null>(null)
  const [workerActionsAvailable, setWorkerActionsAvailable] = useState(false)
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Restore the local selection; the server API still validates ownership on every read.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem(WORK_MODE_KEY)
    if (stored) setActiveAssignmentId(stored)
  }, [])

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/work-mode/overview', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as WorkModeApiResponse<WorkModeOverviewPayload> | null
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error || 'Unable to load Work Mode.')
      }
      setPublications(payload.data.publications)
      setTasks(payload.data.tasks || [])
      setEvents(payload.data.events || [])
      setCommunications(payload.data.communications || [])
      setReminders(payload.data.reminders || [])
      setAttention(payload.data.attention || [])
      setUnreadCount(payload.data.unreadCount || 0)
      setSourceAvailability(payload.data.sourceAvailability)
      setAssignments(payload.data.assignments)
      setWorkerActionsAvailable(payload.data.workerActionsAvailable)
      setActiveAssignmentId((current) => {
        if (!current) return null
        return payload.data?.assignments.some((assignment) => assignment.id === current)
          ? current
          : null
      })
    } catch (requestError) {
      setAssignments([])
      setPublications([])
      setTasks([])
      setEvents([])
      setCommunications([])
      setReminders([])
      setAttention([])
      setUnreadCount(0)
      setSourceAvailability(null)
      setWorkerActionsAvailable(false)
      setError(requestError instanceof Error ? requestError.message : 'Unable to load Work Mode.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const activateWorkMode = useCallback((assignmentId: string) => {
    if (assignments.some((assignment) => assignment.id === assignmentId)) {
      setActiveAssignmentId(assignmentId)
    }
  }, [assignments])

  const deactivateWorkMode = useCallback(() => {
    setActiveAssignmentId(null)
  }, [])

  const respondToAssignment = useCallback(async (
    assignmentId: string,
    action: 'accept' | 'decline'
  ) => {
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
          : 'The assignment response could not be saved.',
      )
      return false
    }
  }, [fetchAssignments])

  const confirmAssignment = useCallback(async (assignmentId: string) => {
    return respondToAssignment(assignmentId, 'accept')
  }, [respondToAssignment])

  const declineAssignment = useCallback(async (assignmentId: string) => {
    return respondToAssignment(assignmentId, 'decline')
  }, [respondToAssignment])

  const submitWorkerAction = useCallback(async (
    assignmentId: string,
    input:
      | { action: 'check_in' | 'check_out'; clientRequestId: string; deviceOccurredAt: string }
      | { action: 'acknowledge'; publicationId: string; clientRequestId: string },
  ) => {
    setError(null)
    try {
      const response = await fetch(`/api/work-mode/assignments/${assignmentId}/actions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const payload = (await response.json().catch(() => null)) as WorkModeApiResponse<{
        id: string
        occurredAt: string
      }> | null
      if (!response.ok || !payload?.data) {
        setError(payload?.error || 'The worker action could not be saved.')
        return false
      }
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The worker action could not be saved.',
      )
      return false
    }
  }, [])

  const respondToCommunication = useCallback(async (
    id: string,
    source: "team_communication" | "event_bulletin",
    action: "mark_read" | "acknowledge",
  ) => {
    setError(null)
    try {
      const response = await fetch(`/api/work-mode/communications/${id}/respond`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, action }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as WorkModeApiResponse<never> | null
        setError(payload?.error || "The communication response could not be saved.")
        return false
      }
      await fetchAssignments()
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The communication response could not be saved.")
      return false
    }
  }, [fetchAssignments])

  return {
    assignments,
    publications,
    tasks,
    events,
    communications,
    reminders,
    attention,
    unreadCount,
    sourceAvailability,
    workerActionsAvailable,
    activeAssignment,
    isInWorkMode: activeAssignmentId !== null,
    isLoading,
    error,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
    respondToAssignment,
    submitWorkerAction,
    respondToCommunication,
    refreshAssignments: fetchAssignments,
  }
}
