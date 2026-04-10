import { useMemo, useState } from "react"
import { SafeAreaView, ScrollView, Text, TextInput, View, Pressable, Alert } from "react-native"
import { useLocalSearchParams } from "expo-router"
import { claimConnectSession, confirmConnectSession, type ClaimConnectSessionResponse } from "@/lib/api/connect"
import { ApiError } from "@/lib/api/client"
import { extractConnectToken } from "@/lib/connect/connect-token"

export default function MobileConnectClaimScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const seededToken = extractConnectToken(typeof params.token === "string" ? params.token : "")
  const [tokenInput, setTokenInput] = useState(seededToken)
  const [claimResult, setClaimResult] = useState<ClaimConnectSessionResponse | null>(null)
  const [isClaimPending, setIsClaimPending] = useState(false)
  const [isConfirmPending, setIsConfirmPending] = useState(false)

  const normalizedToken = useMemo(() => extractConnectToken(tokenInput), [tokenInput])
  const hasToken = useMemo(() => normalizedToken.length > 20, [normalizedToken])

  function handleClaimSession() {
    if (!hasToken) {
      Alert.alert("Missing token", "Paste a valid connect token to continue.")
      return
    }

    setIsClaimPending(true)
    void claimConnectSession({
      ephemeralToken: normalizedToken,
      deviceContext: {
        platform: "mobile",
        source: "connect-claim-screen",
      },
    })
      .then((claimed) => {
        setClaimResult(claimed)
      })
      .catch((error: unknown) => {
        setClaimResult(null)
        const message = error instanceof ApiError ? error.message : "Failed to claim connect session."
        Alert.alert("Claim failed", message)
      })
      .finally(() => {
        setIsClaimPending(false)
      })
  }

  function handleConfirmConnection() {
    if (!claimResult?.connectSessionId) return

    setIsConfirmPending(true)
    void confirmConnectSession({
      connectSessionId: claimResult.connectSessionId,
      intent: "send_follow_request",
    })
      .then(() => {
        Alert.alert("Connected", "Follow request sent successfully.")
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Failed to confirm connection."
        Alert.alert("Confirm failed", message)
      })
      .finally(() => {
        setIsConfirmPending(false)
      })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 56 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Claim Connect Session</Text>
        <Text style={{ color: "#94a3b8", fontSize: 13 }}>
          Paste a connect token or full claim URL to preview profile details and confirm a new connection request.
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#cbd5e1", fontSize: 13 }}>Connect token</Text>
          <TextInput
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="Paste token here"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            style={textInputStyle}
          />
        </View>

        <Pressable onPress={handleClaimSession} disabled={!hasToken || isClaimPending} style={primaryButtonStyle}>
          <Text style={primaryButtonTextStyle}>{isClaimPending ? "Claiming..." : "Claim Session"}</Text>
        </Pressable>

        {claimResult ? (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Preview</Text>
            <Text style={{ color: "#cbd5e1" }}>Name: {claimResult.profilePreview.fullName || "Not provided"}</Text>
            <Text style={{ color: "#cbd5e1" }}>Username: {claimResult.profilePreview.username || "Not provided"}</Text>
            <Text style={{ color: "#cbd5e1" }}>Bio: {claimResult.profilePreview.bio || "Not provided"}</Text>
            <Text style={{ color: "#cbd5e1" }}>Location: {claimResult.profilePreview.location || "Not shared"}</Text>
            <Text style={{ color: "#cbd5e1" }}>Email: {claimResult.profilePreview.email || "Not shared"}</Text>
            <Text style={{ color: "#cbd5e1" }}>Phone: {claimResult.profilePreview.phone || "Not shared"}</Text>
            <Text style={{ color: "#94a3b8", fontSize: 12 }}>
              Relationship: {claimResult.relationshipStatus}
            </Text>

            <Pressable
              onPress={handleConfirmConnection}
              disabled={isConfirmPending}
              style={[primaryButtonStyle, { marginTop: 8 }]}
            >
              <Text style={primaryButtonTextStyle}>
                {isConfirmPending ? "Confirming..." : "Confirm and Connect"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const textInputStyle = {
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 10,
  color: "#fff",
  paddingHorizontal: 10,
  paddingVertical: 10,
  minHeight: 56,
  textAlignVertical: "top",
  backgroundColor: "#0f172a",
} as const

const primaryButtonStyle = {
  borderRadius: 12,
  backgroundColor: "#6366f1",
  paddingVertical: 12,
} as const

const primaryButtonTextStyle = {
  color: "#fff",
  fontWeight: "700",
  textAlign: "center",
} as const
