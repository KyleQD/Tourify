import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"

type CheckoutStatus = "pending" | "completed" | "failed"

export default function CheckoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    order_id?: string
    event_title?: string
    ticket_name?: string
    amount?: string
    status?: string
    checkout_url?: string
  }>()

  const amount = params.amount ? parseFloat(params.amount) : 0
  const isFree = amount === 0
  const initialStatus: CheckoutStatus =
    params.status === "completed" || isFree ? "completed" : "pending"

  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>(initialStatus)
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleCompletePurchase() {
    if (isFree) {
      setCheckoutStatus("completed")
      return
    }

    if (params.checkout_url) {
      setIsProcessing(true)
      try {
        await WebBrowser.openBrowserAsync(params.checkout_url)
        setCheckoutStatus("completed")
      } catch {
        setCheckoutStatus("failed")
      } finally {
        setIsProcessing(false)
      }
      return
    }

    setCheckoutStatus("completed")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ flex: 1, padding: 16, gap: 20 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: "#a855f7", fontWeight: "600" }}>Back</Text>
        </Pressable>

        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Checkout</Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: "#334155",
            borderRadius: 12,
            padding: 16,
            gap: 12,
            backgroundColor: "#0f172a",
          }}
        >
          <Text style={{ color: "#e2e8f0", fontWeight: "700", fontSize: 16 }}>Order Summary</Text>

          {params.event_title ? (
            <Row label="Event" value={params.event_title} />
          ) : null}

          {params.ticket_name ? (
            <Row label="Ticket" value={params.ticket_name} />
          ) : null}

          <Row label="Quantity" value="1" />

          <View style={{ borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 }}>
            <Row
              label="Total"
              value={isFree ? "Free" : `$${amount.toFixed(2)}`}
              isBold
            />
          </View>

          {params.order_id ? (
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              Order: {params.order_id}
            </Text>
          ) : null}
        </View>

        {checkoutStatus === "pending" ? (
          <Pressable
            onPress={handleCompletePurchase}
            disabled={isProcessing}
            style={{
              borderRadius: 12,
              backgroundColor: "#7c3aed",
              paddingVertical: 14,
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16, textAlign: "center" }}>
                {isFree ? "Confirm Free Ticket" : "Complete Purchase"}
              </Text>
            )}
          </Pressable>
        ) : null}

        {checkoutStatus === "completed" ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#065f46",
              borderRadius: 12,
              padding: 16,
              gap: 8,
              backgroundColor: "#064e3b",
            }}
          >
            <Text style={{ color: "#6ee7b7", fontWeight: "700", fontSize: 18, textAlign: "center" }}>
              Purchase Complete
            </Text>
            <Text style={{ color: "#a7f3d0", textAlign: "center", lineHeight: 20 }}>
              {isFree
                ? "Your free ticket has been confirmed. Check your email for details."
                : "Your payment was processed successfully. Check your email for your ticket."}
            </Text>
          </View>
        ) : null}

        {checkoutStatus === "failed" ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#7f1d1d",
              borderRadius: 12,
              padding: 16,
              gap: 10,
              backgroundColor: "#450a0a",
            }}
          >
            <Text style={{ color: "#fca5a5", fontWeight: "700", fontSize: 18, textAlign: "center" }}>
              Purchase Failed
            </Text>
            <Text style={{ color: "#fecaca", textAlign: "center", lineHeight: 20 }}>
              Something went wrong with your payment. Please try again.
            </Text>
            <Pressable
              onPress={() => setCheckoutStatus("pending")}
              style={{
                borderRadius: 10,
                backgroundColor: "#7c3aed",
                paddingVertical: 12,
                marginTop: 4,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {checkoutStatus === "completed" ? (
          <Pressable
            onPress={() => router.replace("/events")}
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#334155",
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#cbd5e1", fontWeight: "600", textAlign: "center" }}>
              Back to Events
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

function Row({ label, value, isBold }: { label: string; value: string; isBold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: isBold ? "#e2e8f0" : "#94a3b8", fontWeight: isBold ? "700" : "400" }}>
        {label}
      </Text>
      <Text style={{ color: isBold ? "#c084fc" : "#cbd5e1", fontWeight: isBold ? "700" : "400" }}>
        {value}
      </Text>
    </View>
  )
}
