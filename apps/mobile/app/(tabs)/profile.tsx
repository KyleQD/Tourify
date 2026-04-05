import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from "react-native"
import { useAuth } from "@/lib/auth/auth-provider"
import { useSession } from "@/hooks/use-session"
import { useAccountMode } from "@/hooks/use-account-mode"
import { supabase } from "@/lib/supabase/client"
import { getCreatorCapabilities, updateCreatorCapabilities } from "@/lib/api/creator-capabilities"

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
      Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSavingCapabilities(false)
    }
  }

  function updateCapabilitiesField<K extends keyof CreatorCapabilityForm>(field: K, value: CreatorCapabilityForm[K]) {
    setCapabilitiesForm((previous) => ({ ...previous, [field]: value }))
  }

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

        <Pressable onPress={handleSignOut} style={{ borderRadius: 12, backgroundColor: "#b91c1c", paddingVertical: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

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
