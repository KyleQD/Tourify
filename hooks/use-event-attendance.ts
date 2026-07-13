"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { extractApiError } from "@/lib/api/extract-error"
import type { AttendanceData, AttendanceStatus } from "@/components/events/public/types"

interface UseEventAttendanceArgs {
  eventId: string
  userId?: string | null
}

export function useEventAttendance({ eventId, userId }: UseEventAttendanceArgs) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null)
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false)

  const loadAttendanceData = useCallback(async () => {
    if (!eventId) return

    try {
      const { data: attendanceData, error } = await supabase
        .from("event_attendance")
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("event_id", eventId)
        .eq("event_table", "events")

      if (error) throw error

      const attending = (attendanceData || [])
        .filter((a) => a.status === "attending")
        .map((a) => ({ ...a, user: a.profiles || null }))
      const interested = (attendanceData || [])
        .filter((a) => a.status === "interested")
        .map((a) => ({ ...a, user: a.profiles || null }))
      const notGoing = (attendanceData || []).filter((a) => a.status === "not_going")

      const userStatus = userId
        ? (attendanceData?.find((a) => a.user_id === userId)?.status as AttendanceStatus | undefined) || null
        : null

      setAttendance({
        attending: attending.length,
        interested: interested.length,
        not_going: notGoing.length,
        user_status: userStatus,
        attendees: attending,
        interested_users: interested,
      })
    } catch (error) {
      console.error("Error loading attendance:", error)
    }
  }, [eventId, userId])

  const updateAttendance = useCallback(
    async (status: AttendanceStatus) => {
      if (!userId || !eventId) return

      try {
        setIsUpdatingAttendance(true)

        if (attendance?.user_status === status) {
          const res = await fetch(`/api/events/${eventId}/attendance`, { method: "DELETE" })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(extractApiError(body, "Failed to clear attendance"))
          }
          await loadAttendanceData()
          toast.success("RSVP cleared")
          return
        }

        const res = await fetch(`/api/events/${eventId}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(extractApiError(body, "Failed to update attendance"))
        }

        await loadAttendanceData()
        toast.success(
          status === "attending"
            ? "You are attending this event"
            : status === "interested"
              ? "Marked as interested"
              : "Marked as not going"
        )
      } catch (error) {
        console.error("Error updating attendance:", error)
        toast.error(error instanceof Error ? error.message : "Failed to update attendance")
      } finally {
        setIsUpdatingAttendance(false)
      }
    },
    [attendance?.user_status, eventId, loadAttendanceData, userId]
  )

  return {
    attendance,
    isUpdatingAttendance,
    loadAttendanceData,
    updateAttendance,
  }
}
