'use client'

/**
 * Work Mode hook — provides read access to the user's active employment assignments
 * and a helper to activate/deactivate Work Mode for a given assignment.
 *
 * Work Mode is a transient overlay on the general account. It does NOT create a
 * new account type in the switcher. Instead, it stores a `work_assignment_id` in
 * the session so API routes can grant the additional event/venue permissions.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  WorkModeApiResponse,
  WorkModeAssignmentListItem,
  WorkModeAssignmentsPayload,
  WorkModePublication,
} from '@/types/hiring-roster-work-mode'

const WORK_MODE_KEY = 'tourify.work-mode-assignment'
const WORK_MODE_SNAPSHOT_PREFIX = 'tourify.work-mode-snapshot.v1'
const workModeRealtimeEnabled = process.env.NEXT_PUBLIC_FEATURE_WORK_MODE_REALTIME === 'true'

interface WorkModeSnapshot {
  assignments: WorkModeAssignmentListItem[]
  publications: WorkModePublication[]
  workerActionsAvailable: boolean
  savedAt: string
}

function snapshotKey(userId: string) {
  return `${WORK_MODE_SNAPSHOT_PREFIX}.${userId}`
}

function readSnapshot(userId: string): WorkModeSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(snapshotKey(userId))
    if (!raw) return null
    const snapshot = JSON.parse(raw) as Partial<WorkModeSnapshot>
    if (!Array.isArray(snapshot.assignments) || !Array.isArray(snapshot.publications)) return null
    if (typeof snapshot.savedAt !== 'string') return null

    return {
      assignments: snapshot.assignments,
      publications: snapshot.publications,
      workerActionsAvailable: Boolean(snapshot.workerActionsAvailable),
      savedAt: snapshot.savedAt,
    }
  } catch {
    return null
  }
}

function saveSnapshot(userId: string, snapshot: WorkModeSnapshot) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot))
  } catch {
    // Private browsing and storage quotas must not prevent Work Mode from loading.
  }
}

export function useWorkMode() {
  const [assignments, setAssignments] = useState<WorkModeAssignmentListItem[]>([])
  const [publications, setPublications] = useState<WorkModePublication[]>([])
  const [workerActionsAvailable, setWorkerActionsAvailable] = useState(false)
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [isUsingCachedSnapshot, setIsUsingCachedSnapshot] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const hasReadModelRef = useRef(false)

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

  // A snapshot is scoped to the authenticated worker and contains only the latest
  // server-authorized read model. Attendance writes are never queued or replayed.
  useEffect(() => {
    let cancelled = false

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      setViewerId(user.id)
      const snapshot = readSnapshot(user.id)
      if (!snapshot) return

      hasReadModelRef.current = true
      setAssignments(snapshot.assignments)
      setPublications(snapshot.publications)
      setWorkerActionsAvailable(snapshot.workerActionsAvailable)
      setLastSyncedAt(snapshot.savedAt)
      setIsUsingCachedSnapshot(true)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const fetchAssignments = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    if (!background && !hasReadModelRef.current) setIsLoading(true)
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
      setPublications(payload.data.publications)
      setAssignments(payload.data.assignments)
      setWorkerActionsAvailable(payload.data.workerActionsAvailable)
      hasReadModelRef.current = true
      setIsUsingCachedSnapshot(false)
      setLastSyncedAt(payload.data.generatedAt)
      if (viewerId) {
        saveSnapshot(viewerId, {
          assignments: payload.data.assignments,
          publications: payload.data.publications,
          workerActionsAvailable: payload.data.workerActionsAvailable,
          savedAt: payload.data.generatedAt,
        })
      }
      setActiveAssignmentId((current) => {
        if (current && payload.data?.assignments.some((assignment) => assignment.id === current)) {
          return current
        }
        return (
          payload.data?.assignments.find(
            (assignment) => assignment.status === 'active' || assignment.status === 'confirmed',
          )?.id ?? null
        )
      })
    } catch (requestError) {
      if (!hasReadModelRef.current) {
        setAssignments([])
        setPublications([])
        setWorkerActionsAvailable(false)
      }
      setError(requestError instanceof Error ? requestError.message : 'Unable to load Work Mode.')
    } finally {
      setIsLoading(false)
    }
  }, [viewerId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    const markOnline = () => setIsOnline(true)
    const markOffline = () => setIsOnline(false)
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => {
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])

  // Revalidate after returning to the app; this is the reliable fallback when a
  // device has missed a Realtime update while backgrounded or offline.
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        void fetchAssignments({ background: true })
      }
    }

    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [fetchAssignments])

  // Limit Postgres Changes subscriptions to the worker's assignments and the
  // active event's schedule/publications. Failed or unavailable subscriptions do
  // not change the UI; focus refresh and the manual Refresh control remain valid.
  useEffect(() => {
    if (!workModeRealtimeEnabled || !viewerId || !activeAssignment) return

    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        void fetchAssignments({ background: true })
      }, 250)
    }

    const channel = supabase
      .channel(`work-mode-${viewerId}-${activeAssignment.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employment_assignments',
          filter: `user_id=eq.${viewerId}`,
        },
        scheduleRefresh,
      )

    if (activeAssignment.schedule?.shiftId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_shifts',
          filter: `id=eq.${activeAssignment.schedule.shiftId}`,
        },
        scheduleRefresh,
      )
    }

    if (activeAssignment.eventId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_mode_publications',
          filter: `event_id=eq.${activeAssignment.eventId}`,
        },
        scheduleRefresh,
      )
    }

    channel.subscribe()

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [activeAssignment, fetchAssignments, viewerId])

  const activateWorkMode = useCallback((assignmentId: string) => {
    if (assignments.some(
      (assignment) =>
        assignment.id === assignmentId &&
        assignment.status !== 'completed' &&
        assignment.status !== 'cancelled',
    )) {
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('You are offline. Check-in and check-out are only recorded after a live server confirmation.')
      return false
    }
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
      await fetchAssignments()
      return true
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The worker action could not be saved.',
      )
      return false
    }
  }, [fetchAssignments])

  return {
    assignments,
    publications,
    workerActionsAvailable,
    activeAssignment,
    isInWorkMode: activeAssignmentId !== null,
    isLoading,
    error,
    isUsingCachedSnapshot,
    lastSyncedAt,
    isOnline,
    activateWorkMode,
    deactivateWorkMode,
    confirmAssignment,
    declineAssignment,
    respondToAssignment,
    submitWorkerAction,
    refreshAssignments: fetchAssignments,
  }
}
