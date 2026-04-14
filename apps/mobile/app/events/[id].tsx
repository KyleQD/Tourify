import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import * as Linking from "expo-linking"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"
import { apiRequest } from "@/lib/api/client"

interface EventDetail {
  id: string
  title: string
  event_date: string | null
  location: string | null
  description: string | null
  status: string | null
  venue_name: string | null
  artist_id: string | null
  max_capacity: number | null
}

interface TicketType {
  id: string
  name: string
  price: number
  description: string | null
  quantity_available: number | null
  quantity_sold: number | null
  status: string | null
}

interface PurchaseResponse {
  checkout_url?: string
  order_id?: string
  status?: string
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)

  const loadEvent = useCallback(async () => {
    if (!id) return

    setIsLoading(true)

    const [eventResult, ticketsResult] = await Promise.allSettled([
      supabase
        .from("events")
        .select("id, title, event_date, location, description, status, venue_name, artist_id, max_capacity")
        .eq("id", id)
        .single(),
      supabase
        .from("ticket_types")
        .select("id, name, price, description, quantity_available, quantity_sold, status")
        .eq("event_id", id)
        .eq("status", "active")
        .order("price", { ascending: true }),
    ])

    if (eventResult.status === "fulfilled" && eventResult.value.data) {
      setEvent(eventResult.value.data as EventDetail)
    } else {
      Alert.alert("Error", "Could not load event details.")
    }

    if (ticketsResult.status === "fulfilled" && ticketsResult.value.data) {
      setTicketTypes(ticketsResult.value.data as TicketType[])
    }

    setIsLoading(false)
  }, [id])

  useEffect(() => {
    void loadEvent()
  }, [loadEvent])

  async function handleBuyTicket(ticketType: TicketType) {
    if (!session?.user) {
      Alert.alert("Sign in required", "Please sign in to purchase tickets.")
      return
    }
    if (!event) return

    setIsPurchasing(ticketType.id)

    try {
      const redirectUri = Linking.createURL("/checkout")
      const response = await apiRequest<PurchaseResponse>(
        "/api/ticketing/enhanced",
        {
          method: "POST",
          body: JSON.stringify({
            ticket_type_id: ticketType.id,
            event_id: event.id,
            customer_email: session.user.email,
            customer_name: session.user.user_metadata?.full_name || session.user.email,
            quantity: 1,
            delivery_method: "digital",
            metadata: { source: "mobile_app", redirect_uri: redirectUri },
          }),
        }
      )

      if (response.checkout_url) {
        await WebBrowser.openBrowserAsync(response.checkout_url)
      } else if (response.order_id) {
        router.push({
          pathname: "/checkout",
          params: {
            order_id: response.order_id,
            event_title: event.title,
            ticket_name: ticketType.name,
            amount: String(ticketType.price),
            status: response.status || "completed",
          },
        })
      } else {
        router.push({
          pathname: "/checkout",
          params: {
            event_title: event.title,
            ticket_name: ticketType.name,
            amount: String(ticketType.price),
            status: "completed",
          },
        })
      }
    } catch (error) {
      Alert.alert("Purchase failed", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setIsPurchasing(null)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </SafeAreaView>
    )
  }

  if (!event) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", padding: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: "#a855f7", fontWeight: "600" }}>Back</Text>
        </Pressable>
        <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14 }}>
          <Text style={{ color: "#94a3b8" }}>Event not found.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date TBD"

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#1e293b", text: "#94a3b8" },
    published: { bg: "#064e3b", text: "#6ee7b7" },
    cancelled: { bg: "#7f1d1d", text: "#fca5a5" },
    completed: { bg: "#1e1b4b", text: "#a5b4fc" },
  }
  const colors = statusColors[event.status || "draft"] || statusColors.draft

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 44 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: "#a855f7", fontWeight: "600" }}>Back</Text>
        </Pressable>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: "#f8fafc", fontSize: 22, fontWeight: "700", flex: 1 }}>
              {event.title}
            </Text>
            <View style={{ backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>
                {event.status || "draft"}
              </Text>
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ color: "#cbd5e1", fontSize: 14 }}>{formattedDate}</Text>
            {event.venue_name ? (
              <Text style={{ color: "#94a3b8", fontSize: 14 }}>{event.venue_name}</Text>
            ) : null}
            {event.location ? (
              <Text style={{ color: "#64748b", fontSize: 13 }}>{event.location}</Text>
            ) : null}
            {event.max_capacity ? (
              <Text style={{ color: "#64748b", fontSize: 13 }}>Capacity: {event.max_capacity}</Text>
            ) : null}
          </View>
        </View>

        {event.description ? (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, backgroundColor: "#0f172a" }}>
            <Text style={{ color: "#e2e8f0", fontWeight: "600", marginBottom: 6 }}>About</Text>
            <Text style={{ color: "#cbd5e1", lineHeight: 20 }}>{event.description}</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          <Text style={{ color: "#e2e8f0", fontWeight: "700", fontSize: 16 }}>Tickets</Text>

          {ticketTypes.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, backgroundColor: "#0f172a" }}>
              <Text style={{ color: "#94a3b8" }}>No tickets available for this event.</Text>
            </View>
          ) : (
            ticketTypes.map((ticket) => {
              const remaining = ticket.quantity_available != null && ticket.quantity_sold != null
                ? ticket.quantity_available - ticket.quantity_sold
                : null
              const isSoldOut = remaining != null && remaining <= 0
              const isBuying = isPurchasing === ticket.id

              return (
                <View
                  key={ticket.id}
                  style={{
                    borderWidth: 1,
                    borderColor: "#334155",
                    borderRadius: 12,
                    padding: 14,
                    gap: 8,
                    backgroundColor: "#0f172a",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: "#f8fafc", fontWeight: "700", fontSize: 15 }}>{ticket.name}</Text>
                    <Text style={{ color: "#c084fc", fontWeight: "700", fontSize: 16 }}>
                      {ticket.price === 0 ? "Free" : `$${ticket.price.toFixed(2)}`}
                    </Text>
                  </View>

                  {ticket.description ? (
                    <Text style={{ color: "#94a3b8", fontSize: 13 }}>{ticket.description}</Text>
                  ) : null}

                  {remaining != null ? (
                    <Text style={{ color: isSoldOut ? "#f87171" : "#64748b", fontSize: 12 }}>
                      {isSoldOut ? "Sold out" : `${remaining} remaining`}
                    </Text>
                  ) : null}

                  <Pressable
                    onPress={() => handleBuyTicket(ticket)}
                    disabled={isSoldOut || isBuying}
                    style={{
                      borderRadius: 10,
                      backgroundColor: isSoldOut ? "#1e293b" : "#7c3aed",
                      paddingVertical: 12,
                      opacity: isSoldOut || isBuying ? 0.5 : 1,
                    }}
                  >
                    {isBuying ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                        {isSoldOut ? "Sold Out" : ticket.price === 0 ? "Get Free Ticket" : "Buy Ticket"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
