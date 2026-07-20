import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useSession } from "@/hooks/use-session"
import { supabase } from "@/lib/supabase"

type AccountType = "artist" | "venue" | "general"

const TOTAL_STEPS = 3

const accountTypeOptions: { value: AccountType; label: string; description: string }[] = [
  { value: "artist", label: "Artist / Creator", description: "Musicians, producers, DJs, visual artists, and other creatives" },
  { value: "venue", label: "Venue", description: "Bars, clubs, concert halls, and event spaces" },
  { value: "general", label: "General", description: "Fans, industry professionals, and everyone else" }
]

export default function OnboardingScreen() {
  const router = useRouter()
  const { user } = useSession()

  const [step, setStep] = useState(0)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to set a profile picture.")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    })

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  async function handleComplete() {
    if (!user?.id || !accountType) return

    setIsSaving(true)
    try {
      let avatarUrl: string | null = null

      if (photoUri) {
        const fileName = `${user.id}-${Date.now()}.jpg`
        const response = await fetch(photoUri)
        const blob = await response.blob()
        const arrayBuffer = await new Response(blob).arrayBuffer()

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, arrayBuffer, { contentType: "image/jpeg", upsert: true })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)
          avatarUrl = urlData.publicUrl
        }
      }

      const profilePayload: Record<string, unknown> = {
        id: user.id,
        account_type: accountType,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }
      if (avatarUrl) profilePayload.avatar_url = avatarUrl

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" })

      if (profileError) throw profileError

      await supabase.from("onboarding").upsert(
        {
          user_id: user.id,
          account_type: accountType,
          completed_at: new Date().toISOString(),
          status: "completed"
        },
        { onConflict: "user_id" }
      )

      router.replace("/(tabs)/discover")
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSaving(false)
    }
  }

  function canAdvance() {
    if (step === 0) return accountType !== null
    if (step === 1) return displayName.trim().length > 0
    return true
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
    } else {
      void handleComplete()
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 32, marginTop: 12 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === step ? 28 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: i <= step ? "#a855f7" : "#334155"
              }}
            />
          ))}
        </View>

        {step === 0 && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", textAlign: "center" }}>
              Welcome to Tourify
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              How will you use the platform?
            </Text>
            <View style={{ gap: 12, marginTop: 8 }}>
              {accountTypeOptions.map((option) => {
                const isSelected = accountType === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setAccountType(option.value)}
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? "#a855f7" : "#334155",
                      borderRadius: 16,
                      padding: 20,
                      backgroundColor: isSelected ? "#2e1065" : "#0f172a"
                    }}
                  >
                    <Text style={{ color: "#f8fafc", fontWeight: "700", fontSize: 17 }}>
                      {option.label}
                    </Text>
                    <Text style={{ color: "#94a3b8", marginTop: 4, lineHeight: 20 }}>
                      {option.description}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", textAlign: "center" }}>
              Tell us about yourself
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              This is how others will see you on Tourify.
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={{ color: "#cbd5e1", fontWeight: "600" }}>Display name *</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name or stage name"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
                style={{
                  borderWidth: 1,
                  borderColor: "#334155",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: "#fff",
                  backgroundColor: "#0f172a",
                  fontSize: 16
                }}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: "#cbd5e1", fontWeight: "600" }}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="A short intro about you"
                placeholderTextColor="#64748b"
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: "#334155",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: "#fff",
                  backgroundColor: "#0f172a",
                  fontSize: 16,
                  minHeight: 100,
                  textAlignVertical: "top"
                }}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 16, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", textAlign: "center" }}>
              Add a profile photo
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
              Help people recognize you. You can always change this later.
            </Text>
            <Pressable onPress={pickPhoto} style={{ marginTop: 12 }}>
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: "#a855f7" }}
                />
              ) : (
                <View style={{
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  backgroundColor: "#1e293b",
                  borderWidth: 2,
                  borderColor: "#334155",
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Text style={{ color: "#94a3b8", fontSize: 14 }}>Tap to choose</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={pickPhoto} style={{ marginTop: 4 }}>
              <Text style={{ color: "#a78bfa", fontWeight: "600" }}>
                {photoUri ? "Change photo" : "Choose from library"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ flex: 1 }} />

        <View style={{ gap: 12, marginTop: 32 }}>
          <Pressable
            onPress={handleNext}
            disabled={!canAdvance() || isSaving}
            style={{
              borderRadius: 14,
              backgroundColor: canAdvance() && !isSaving ? "#7c3aed" : "#334155",
              paddingVertical: 16
            }}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center", fontSize: 16 }}>
                {step < TOTAL_STEPS - 1 ? "Continue" : "Get started"}
              </Text>
            )}
          </Pressable>

          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={{ paddingVertical: 10 }}>
              <Text style={{ color: "#94a3b8", fontWeight: "600", textAlign: "center" }}>Back</Text>
            </Pressable>
          )}

          {step === 2 && !photoUri && (
            <Pressable onPress={() => void handleComplete()} disabled={isSaving} style={{ paddingVertical: 6 }}>
              <Text style={{ color: "#64748b", textAlign: "center" }}>Skip for now</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
