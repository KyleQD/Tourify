import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Share, Switch, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/lib/auth/auth-provider"
import { useSession } from "@/hooks/use-session"
import { useAccountMode } from "@/hooks/use-account-mode"
import { supabase } from "@/lib/supabase/client"
import { getCreatorCapabilities, updateCreatorCapabilities } from "@/lib/api/creator-capabilities"
import { isQueuedOfflineError } from "@/lib/api/client"
import { createConnectSession } from "@/lib/api/connect"
import {
  clearMeshRelayPackets,
  getMeshSyncStats,
  importPeerSyncPacketFromPicker,
  sharePeerSyncPacket
} from "@/lib/connectivity/peer-sync"

interface VenueSummaryStats {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
}

interface CreatorCapabilityForm {
  creatorType: string
  serviceOfferings: string
  productsForSale: string
  credentials: string
  workHighlights: string
  availability: string
  preferredContact: string
  availableForHire: boolean
  collaborationInterest: boolean
}

const emptyCapabilitiesForm: CreatorCapabilityForm = {
  creatorType: "",
  serviceOfferings: "",
  productsForSale: "",
  credentials: "",
  workHighlights: "",
  availability: "",
  preferredContact: "email",
  availableForHire: false,
  collaborationInterest: false,
}

function toCommaText(values: string[] | null | undefined): string {
  if (!Array.isArray(values) || !values.length) return ""
  return values.join(", ")
}

export default function ProfileScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { user } = useSession()
  const { isVenueMode, venueProfile } = useAccountMode()
  const [stats, setStats] = useState<VenueSummaryStats>({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
  })
  const [capabilitiesForm, setCapabilitiesForm] = useState<CreatorCapabilityForm>(emptyCapabilitiesForm)
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(false)
  const [isSavingCapabilities, setIsSavingCapabilities] = useState(false)
  const [meshStats, setMeshStats] = useState({
    queuedActions: 0,
    storedPackets: 0,
    relayablePackets: 0,
    seenPackets: 0
  })
  const [activeConnectLink, setActiveConnectLink] = useState<string | null>(null)
  const [activeConnectToken, setActiveConnectToken] = useState<string | null>(null)
  const [activeConnectDeepLink, setActiveConnectDeepLink] = useState<string | null>(null)
  const [isCreatingConnectSession, setIsCreatingConnectSession] = useState(false)
  const [manualConnectToken, setManualConnectToken] = useState("")

  useEffect(() => {
    async function loadVenueStats() {
      if (!venueProfile?.id) return

      const { data, error } = await supabase
        .from("venue_booking_requests")
        .select("status")
        .eq("venue_id", venueProfile.id)
        .limit(200)

      if (error) return

      const rows = data || []
      setStats({
        totalRequests: rows.length,
        pendingRequests: rows.filter((row) => row.status === "pending").length,
        approvedRequests: rows.filter((row) => row.status === "approved").length,
      })
    }

    void loadVenueStats()
  }, [venueProfile?.id])

  useEffect(() => {
    async function loadCreatorCapabilities() {
      if (isVenueMode) return

      try {
        setIsLoadingCapabilities(true)
        const response = await getCreatorCapabilities()
        const capabilities = response.capabilities
        setCapabilitiesForm({
          creatorType: capabilities.creatorType || "",
          serviceOfferings: toCommaText(capabilities.serviceOfferings),
          productsForSale: toCommaText(capabilities.productsForSale),
          credentials: toCommaText(capabilities.credentials),
          workHighlights: toCommaText(capabilities.workHighlights),
          availability: capabilities.availability || "",
          preferredContact: capabilities.preferredContact || "email",
          availableForHire: capabilities.availableForHire,
          collaborationInterest: capabilities.collaborationInterest,
        })
      } catch (error) {
        Alert.alert(
          "Could not load creator profile",
          error instanceof Error ? error.message : "Please try again"
        )
      } finally {
        setIsLoadingCapabilities(false)
      }
    }

    void loadCreatorCapabilities()
  }, [isVenueMode])

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      Alert.alert("Sign out failed", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function handleSharePeerSync() {
    try {
      const result = await sharePeerSyncPacket()
      if (!result.shared) {
        Alert.alert("Share not available", result.reason)
        return
      }

      Alert.alert(
        "Sync packet ready",
        `Shared ${result.packetCount || 0} packet(s) containing ${result.actionCount || 0} action(s).`
      )
      await refreshMeshStats()
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function handleImportPeerSync() {
    try {
      const result = await importPeerSyncPacketFromPicker()
      if (!result.imported) {
        Alert.alert("Import canceled", result.reason)
        return
      }

      Alert.alert(
        "Sync packet imported",
        `Received ${result.receivedPackets} packet(s), accepted ${result.acceptedPackets}. Added ${result.addedActions} action(s). Relay-ready packets: ${result.relayedPacketsReady}.`
      )
      await refreshMeshStats()
    } catch (error) {
      Alert.alert("Import failed", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function refreshMeshStats() {
    const stats = await getMeshSyncStats()
    setMeshStats(stats)
  }

  async function handleClearRelayPackets() {
    try {
      await clearMeshRelayPackets()
      await refreshMeshStats()
      Alert.alert("Relay cache cleared", "Stored relay packets were removed from this device.")
    } catch (error) {
      Alert.alert("Clear failed", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function handleSaveCapabilities() {
    try {
      setIsSavingCapabilities(true)
      await updateCreatorCapabilities({
        creatorType: capabilitiesForm.creatorType,
        serviceOfferings: capabilitiesForm.serviceOfferings,
        productsForSale: capabilitiesForm.productsForSale,
        credentials: capabilitiesForm.credentials,
        workHighlights: capabilitiesForm.workHighlights,
        availability: capabilitiesForm.availability,
        preferredContact: capabilitiesForm.preferredContact,
        availableForHire: capabilitiesForm.availableForHire,
        collaborationInterest: capabilitiesForm.collaborationInterest,
      })
      Alert.alert("Saved", "Creator capabilities updated")
    } catch (error) {
      if (isQueuedOfflineError(error)) {
        Alert.alert("Queued", "No service right now. Your profile changes will sync when connection returns.")
        return
      }
      Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSavingCapabilities(false)
    }
  }

  async function handleStartInPersonConnect() {
    try {
      setIsCreatingConnectSession(true)
      const session = await createConnectSession({
        handshakeMethod: "nfc_ble",
        oneTimeClaim: true,
        expiresInSeconds: 120,
      })

      setActiveConnectLink(session.webClaimUrl || session.claimUrl)
      setActiveConnectToken(session.ephemeralToken)
      setActiveConnectDeepLink(session.deepLinkUrl || null)

      Alert.alert(
        "Connect session ready",
        "Share the connect link nearby so the other user can claim and preview your profile."
      )
    } catch (error) {
      Alert.alert("Connect setup failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsCreatingConnectSession(false)
    }
  }

  async function handleShareConnectLink() {
    if (!activeConnectLink) {
      Alert.alert("No active session", "Start an in-person connect session first.")
      return
    }

    try {
      await Share.share({
        message: [
          "Connect with me on Tourify:",
          activeConnectLink,
          "",
          "Mobile deep link:",
          activeConnectDeepLink || `tourify://connect/claim?token=${activeConnectToken || ""}`,
        ].join("\n"),
        url: activeConnectLink,
      })
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again")
    }
  }

  function handleOpenManualClaim() {
    const token = manualConnectToken.trim()
    if (token.length <= 20) {
      Alert.alert("Missing token", "Paste a valid connect token.")
      return
    }

    router.push({
      pathname: "/connect/claim",
      params: { token },
    })
  }

  function updateCapabilitiesField<K extends keyof CreatorCapabilityForm>(field: K, value: CreatorCapabilityForm[K]) {
    setCapabilitiesForm((previous) => ({ ...previous, [field]: value }))
  }

  useEffect(() => {
    void refreshMeshStats()
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 56 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Profile</Text>
        <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8 }}>
          <Text style={{ color: "#94a3b8" }}>Account Mode</Text>
          <Text style={{ color: "#fff", textTransform: "capitalize" }}>{isVenueMode ? "venue" : "creator"}</Text>
          <Text style={{ color: "#94a3b8" }}>User ID</Text>
          <Text style={{ color: "#fff" }}>{user?.id || "Unknown"}</Text>
          <Text style={{ color: "#94a3b8" }}>Email</Text>
          <Text style={{ color: "#fff" }}>{user?.email || "Unknown"}</Text>
        </View>

        {isVenueMode && venueProfile ? (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{venueProfile.venue_name}</Text>
            <Text style={{ color: "#94a3b8" }}>
              {[venueProfile.city, venueProfile.state].filter(Boolean).join(", ") || "Location unavailable"}
            </Text>
            <Text style={{ color: "#cbd5e1" }}>Total requests: {stats.totalRequests}</Text>
            <Text style={{ color: "#cbd5e1" }}>Pending approvals: {stats.pendingRequests}</Text>
            <Text style={{ color: "#cbd5e1" }}>Approved this period: {stats.approvedRequests}</Text>
          </View>
        ) : null}

        {!isVenueMode ? (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 10 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Creator capabilities</Text>
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>
              Present your services, credentials, and past work. Comma-separate multiple values.
            </Text>

            {isLoadingCapabilities ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color="#a78bfa" />
              </View>
            ) : (
              <>
                <LabeledInput
                  label="Primary creator type"
                  value={capabilitiesForm.creatorType}
                  onChangeText={(value) => updateCapabilitiesField("creatorType", value)}
                  placeholder="Musician, Producer, Videographer..."
                />
                <LabeledInput
                  label="Service offerings"
                  value={capabilitiesForm.serviceOfferings}
                  onChangeText={(value) => updateCapabilitiesField("serviceOfferings", value)}
                  placeholder="Live set, mixing, visual direction..."
                  multiline
                />
                <LabeledInput
                  label="Products for sale"
                  value={capabilitiesForm.productsForSale}
                  onChangeText={(value) => updateCapabilitiesField("productsForSale", value)}
                  placeholder="Sample packs, merch, presets..."
                  multiline
                />
                <LabeledInput
                  label="Credentials"
                  value={capabilitiesForm.credentials}
                  onChangeText={(value) => updateCapabilitiesField("credentials", value)}
                  placeholder="Certifications, training, licenses..."
                  multiline
                />
                <LabeledInput
                  label="Past work highlights"
                  value={capabilitiesForm.workHighlights}
                  onChangeText={(value) => updateCapabilitiesField("workHighlights", value)}
                  placeholder="Notable projects, clients, tours..."
                  multiline
                />
                <LabeledInput
                  label="Availability"
                  value={capabilitiesForm.availability}
                  onChangeText={(value) => updateCapabilitiesField("availability", value)}
                  placeholder="Weekends, touring season, remote..."
                />
                <LabeledInput
                  label="Preferred contact"
                  value={capabilitiesForm.preferredContact}
                  onChangeText={(value) => updateCapabilitiesField("preferredContact", value)}
                  placeholder="email / phone / platform"
                />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ color: "#cbd5e1" }}>Available for hire</Text>
                  <Switch
                    value={capabilitiesForm.availableForHire}
                    onValueChange={(value) => updateCapabilitiesField("availableForHire", value)}
                  />
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ color: "#cbd5e1" }}>Open to collaborations</Text>
                  <Switch
                    value={capabilitiesForm.collaborationInterest}
                    onValueChange={(value) => updateCapabilitiesField("collaborationInterest", value)}
                  />
                </View>

                <Pressable
                  onPress={handleSaveCapabilities}
                  disabled={isSavingCapabilities}
                  style={{
                    marginTop: 4,
                    borderRadius: 12,
                    backgroundColor: isSavingCapabilities ? "#4338ca" : "#6366f1",
                    paddingVertical: 12
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                    {isSavingCapabilities ? "Saving..." : "Save creator capabilities"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 10 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>In-person connect (beta)</Text>
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>
            Start a short-lived connect session, then share the link with someone nearby so they can claim and confirm.
          </Text>
          <Pressable
            onPress={handleStartInPersonConnect}
            disabled={isCreatingConnectSession}
            style={secondaryActionButton}
          >
            <Text style={secondaryActionButtonText}>
              {isCreatingConnectSession ? "Starting connect..." : "Start in-person connect"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShareConnectLink} style={secondaryActionButton}>
            <Text style={secondaryActionButtonText}>Share connect link</Text>
          </Pressable>
          {activeConnectLink ? (
            <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={2}>
              Active link: {activeConnectLink}
            </Text>
          ) : null}
          {activeConnectToken ? (
            <Text style={{ color: "#64748b", fontSize: 11 }} numberOfLines={1}>
              Active token: {activeConnectToken}
            </Text>
          ) : null}
          {activeConnectDeepLink ? (
            <Text style={{ color: "#64748b", fontSize: 11 }} numberOfLines={1}>
              Deep link: {activeConnectDeepLink}
            </Text>
          ) : null}
          <TextInput
            value={manualConnectToken}
            onChangeText={setManualConnectToken}
            placeholder="Paste received token to claim"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: "#334155",
              borderRadius: 10,
              color: "#fff",
              paddingHorizontal: 10,
              paddingVertical: 10,
              backgroundColor: "#0f172a"
            }}
          />
          <Pressable onPress={handleOpenManualClaim} style={secondaryActionButton}>
            <Text style={secondaryActionButtonText}>Open claim screen</Text>
          </Pressable>
        </View>

        <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 10 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Off-grid mesh sync</Text>
          <Text style={{ color: "#94a3b8", fontSize: 13 }}>
            Use AirDrop / Nearby Share / Bluetooth share channels to relay mesh packets device-to-device when service is unavailable.
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 12 }}>
            Queue: {meshStats.queuedActions} • Stored packets: {meshStats.storedPackets} • Relay-ready: {meshStats.relayablePackets}
          </Text>
          <Pressable onPress={handleSharePeerSync} style={secondaryActionButton}>
            <Text style={secondaryActionButtonText}>Share mesh packet</Text>
          </Pressable>
          <Pressable onPress={handleImportPeerSync} style={secondaryActionButton}>
            <Text style={secondaryActionButtonText}>Import mesh packet</Text>
          </Pressable>
          <Pressable onPress={() => void refreshMeshStats()} style={secondaryActionButton}>
            <Text style={secondaryActionButtonText}>Refresh mesh stats</Text>
          </Pressable>
          <Pressable onPress={handleClearRelayPackets} style={secondaryDangerButton}>
            <Text style={secondaryActionButtonText}>Clear relay cache</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSignOut} style={{ borderRadius: 12, backgroundColor: "#b91c1c", paddingVertical: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const secondaryActionButton = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#334155",
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: "#0f172a"
} as const

const secondaryDangerButton = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#7f1d1d",
  paddingVertical: 10,
  paddingHorizontal: 12,
  backgroundColor: "#450a0a"
} as const

const secondaryActionButtonText = {
  color: "#e2e8f0",
  fontWeight: "700",
  textAlign: "center"
} as const

function LabeledInput(params: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: "#cbd5e1", fontSize: 13 }}>{params.label}</Text>
      <TextInput
        value={params.value}
        onChangeText={params.onChangeText}
        placeholder={params.placeholder}
        placeholderTextColor="#64748b"
        multiline={params.multiline}
        style={{
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 10,
          color: "#fff",
          paddingHorizontal: 10,
          paddingVertical: params.multiline ? 10 : 8,
          minHeight: params.multiline ? 76 : 40,
          textAlignVertical: params.multiline ? "top" : "center",
          backgroundColor: "#0f172a"
        }}
      />
    </View>
  )
}
