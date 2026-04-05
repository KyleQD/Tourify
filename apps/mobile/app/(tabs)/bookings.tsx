import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native"
import { supabase } from "@/lib/supabase/client"
import { useAccountMode } from "@/hooks/use-account-mode"

interface VenueBookingRequest {
  id: string
  event_name: string
  event_date: string
  expected_attendance: number | null
  contact_email: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  requested_at: string
}

export default function BookingsScreen() {
  const { isLoading: isAccountLoading, isVenueMode, venueProfile } = useAccountMode()
  const [requests, setRequests] = useState<VenueBookingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    if (!venueProfile?.id) {
      setRequests([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase
      .from("venue_booking_requests")
      .select("id, event_name, event_date, expected_attendance, contact_email, status, requested_at")
      .eq("venue_id", venueProfile.id)
      .order("requested_at", { ascending: false })
      .limit(50)

    if (error) {
      Alert.alert("Failed to load requests", error.message)
      setRequests([])
      setIsLoading(false)
      return
    }

    setRequests((data || []) as VenueBookingRequest[])
    setIsLoading(false)
  }, [venueProfile?.id])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  async function updateRequestStatus(id: string, status: "approved" | "rejected") {
    setIsUpdating(id)
    const { error } = await supabase
      .from("venue_booking_requests")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id)

    setIsUpdating(null)

    if (error) {
      Alert.alert("Update failed", error.message)
      return
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request
      )
    )
  }

  if (isAccountLoading || isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </SafeAreaView>
    )
  }

  if (!isVenueMode) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", padding: 16, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Bookings</Text>
        <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12 }}>
          <Text style={{ color: "#cbd5e1" }}>
            Venue booking operations are available when you are signed in to a venue account.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Booking Requests</Text>
        <Text style={{ color: "#94a3b8" }}>
          {venueProfile?.venue_name || "Venue"} incoming requests and approvals.
        </Text>

        {requests.length === 0 ? (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#cbd5e1" }}>No booking requests yet.</Text>
          </View>
        ) : null}

        {requests.map((request) => (
          <View key={request.id} style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{request.event_name}</Text>
            <Text style={{ color: "#94a3b8" }}>
              {new Date(request.event_date).toLocaleDateString()} • {request.expected_attendance || 0} attendees
            </Text>
            <Text style={{ color: "#94a3b8" }}>Contact: {request.contact_email}</Text>
            <Text style={{ color: "#cbd5e1", textTransform: "capitalize" }}>Status: {request.status}</Text>

            {request.status === "pending" ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => updateRequestStatus(request.id, "approved")}
                  disabled={isUpdating === request.id}
                  style={actionButton("#065f46")}
                >
                  <Text style={actionButtonText}>Approve</Text>
                </Pressable>
                <Pressable
                  onPress={() => updateRequestStatus(request.id, "rejected")}
                  disabled={isUpdating === request.id}
                  style={actionButton("#7f1d1d")}
                >
                  <Text style={actionButtonText}>Decline</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

function actionButton(backgroundColor: string) {
  return {
    borderRadius: 10,
    backgroundColor,
    paddingHorizontal: 12,
    paddingVertical: 10,
  } as const
}

const actionButtonText = {
  color: "#fff",
  fontWeight: "700",
  textAlign: "center",
} as const
