import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { useAccountMode } from "@/hooks/use-account-mode"
import { env } from "@/lib/config/env"
import {
  listVenueBookingRequests,
  updateVenueBookingRequestStatus,
  type VenueBookingRequest,
} from "@/lib/api/venue-booking-requests"

export default function BookingsScreen() {
  function getStatusLabel(status: VenueBookingRequest["status"]) {
    if (status === "approved" || status === "accepted") return "accepted"
    if (status === "rejected" || status === "declined") return "declined"
    return status
  }

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
    try {
      const data = await listVenueBookingRequests({ venueId: venueProfile.id, limit: 50 })
      setRequests(data)
    } catch (error) {
      Alert.alert(
        "Failed to load requests",
        error instanceof Error ? error.message : "Please try again."
      )
      setRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [venueProfile?.id])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  async function updateRequestStatus(id: string, status: "approved" | "rejected") {
    setIsUpdating(id)
    try {
      const updated = await updateVenueBookingRequestStatus({ requestId: id, status })
      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status: updated?.status || status } : request
        )
      )
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setIsUpdating(null)
    }
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
          <Text style={{ color: "#94a3b8", marginTop: 8 }}>
            Ticket purchases for events are available from the Events screen with server-verified checkout.
          </Text>
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/marketplace`)}
            style={{ marginTop: 12, borderRadius: 10, backgroundColor: "#1e293b", paddingVertical: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Open marketplace on web</Text>
          </Pressable>
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
            <Text style={{ color: "#cbd5e1", textTransform: "capitalize" }}>Status: {getStatusLabel(request.status)}</Text>

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
