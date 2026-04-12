import { useMemo, useState } from "react"
import { Alert, Pressable, SafeAreaView, ScrollView, Share, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { createConnectSession } from "@/lib/api/connect"
import { sendConnectTelemetry } from "@/lib/api/connect-telemetry"
import { CONNECT_TOKEN_MIN_LENGTH, extractConnectToken } from "@/lib/connect/connect-token"

export default function ConnectHubScreen() {
  const router = useRouter()
  const [manualTokenInput, setManualTokenInput] = useState("")
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeWebLink, setActiveWebLink] = useState<string | null>(null)
  const [activeDeepLink, setActiveDeepLink] = useState<string | null>(null)
  const [activeToken, setActiveToken] = useState<string | null>(null)

  const normalizedManualToken = useMemo(
    () => extractConnectToken(manualTokenInput),
    [manualTokenInput]
  )

  async function handleStartConnectSession() {
    try {
      setIsCreatingSession(true)
      const session = await createConnectSession({
        handshakeMethod: "nfc_ble",
        oneTimeClaim: true,
        expiresInSeconds: 120,
      })

      setActiveWebLink(session.webClaimUrl || session.claimUrl)
      setActiveDeepLink(session.deepLinkUrl)
      setActiveToken(session.ephemeralToken)
      setActiveSessionId(session.connectSessionId)
      void sendConnectTelemetry({
        eventName: "connect_flow_session_created_mobile",
        connectSessionId: session.connectSessionId,
      })
      Alert.alert("Connect session ready", "Share the link with the other user to claim and confirm.")
    } catch (error) {
      Alert.alert("Start failed", error instanceof Error ? error.message : "Could not start connect session.")
    } finally {
      setIsCreatingSession(false)
    }
  }

  async function handleShareSession() {
    if (!activeWebLink) {
      Alert.alert("No active session", "Start an in-person connect session first.")
      return
    }

    try {
      await Share.share({
        message: [
          "Connect with me on Tourify:",
          activeWebLink,
          "",
          "Direct mobile deep link:",
          activeDeepLink || "",
        ].join("\n"),
        url: activeWebLink,
      })
      void sendConnectTelemetry({
        eventName: "connect_flow_session_shared_mobile",
        connectSessionId: activeSessionId || undefined,
      })
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again.")
    }
  }

  function handleOpenClaimScreen() {
    if (!normalizedManualToken || normalizedManualToken.length < CONNECT_TOKEN_MIN_LENGTH) {
      Alert.alert("Invalid token", "Paste a valid token or claim URL.")
      return
    }

    router.push({
      pathname: "/connect/claim",
      params: { token: normalizedManualToken },
    })
    void sendConnectTelemetry({
      eventName: "connect_flow_claim_opened_mobile",
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 56 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>In-person Connect</Text>
        <Text style={{ color: "#94a3b8", fontSize: 13 }}>
          Start a short session, share it nearby, then let the other user preview and confirm.
        </Text>

        <View style={panelStyle}>
          <Text style={panelTitleStyle}>Start and share</Text>
          <Pressable onPress={handleStartConnectSession} disabled={isCreatingSession} style={primaryButtonStyle}>
            <Text style={primaryButtonTextStyle}>
              {isCreatingSession ? "Starting session..." : "Start in-person connect"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShareSession} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>Share active session</Text>
          </Pressable>

          {activeWebLink ? (
            <Text style={metaTextStyle} numberOfLines={2}>Web link: {activeWebLink}</Text>
          ) : null}
          {activeDeepLink ? (
            <Text style={metaTextStyle} numberOfLines={1}>Deep link: {activeDeepLink}</Text>
          ) : null}
          {activeToken ? (
            <Text style={metaTextStyle} numberOfLines={1}>Token: {activeToken}</Text>
          ) : null}
        </View>

        <View style={panelStyle}>
          <Text style={panelTitleStyle}>Claim incoming session</Text>
          <TextInput
            value={manualTokenInput}
            onChangeText={setManualTokenInput}
            placeholder="Paste token or claim URL"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
          <Pressable onPress={handleOpenClaimScreen} style={secondaryButtonStyle}>
            <Text style={secondaryButtonTextStyle}>Open claim flow</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const panelStyle = {
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 12,
  padding: 12,
  gap: 10,
} as const

const panelTitleStyle = {
  color: "#fff",
  fontSize: 18,
  fontWeight: "700",
} as const

const inputStyle = {
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 10,
  color: "#fff",
  paddingHorizontal: 10,
  paddingVertical: 10,
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

const secondaryButtonStyle = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#334155",
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: "#0f172a",
} as const

const secondaryButtonTextStyle = {
  color: "#e2e8f0",
  fontWeight: "700",
  textAlign: "center",
} as const

const metaTextStyle = {
  color: "#64748b",
  fontSize: 11,
} as const
