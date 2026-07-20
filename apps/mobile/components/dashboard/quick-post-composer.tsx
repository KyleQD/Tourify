import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import * as DocumentPicker from "expo-document-picker"
import { useSession } from "@/hooks/use-session"
import { useMultiAccount } from "@/providers/multi-account-provider"
import { createFeedPost } from "@/lib/api/feed"
import { uploadFeedPhoto } from "@/lib/api/feed-media"
import { buildActingHeaders } from "@/lib/api/acting-headers"
import { isQueuedOfflineError } from "@/lib/api/client"
import { getAccountDisplayName, getAccountTypeLabel, type UserAccount } from "@/lib/api/accounts"

type Visibility = "public" | "followers" | "private"

const visibilityOptions: Array<{ value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "public", label: "Public", icon: "globe-outline" },
  { value: "followers", label: "Followers", icon: "people-outline" },
  { value: "private", label: "Private", icon: "lock-closed-outline" },
]

export function QuickPostComposer({ onPosted }: { onPosted?: () => void }) {
  const { user } = useSession()
  const { userAccounts, currentAccount } = useMultiAccount()
  const [content, setContent] = useState("")
  const [visibility, setVisibility] = useState<Visibility>("public")
  const [postingAccountId, setPostingAccountId] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoMeta, setPhotoMeta] = useState<{ name?: string; mimeType?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    if (currentAccount && !postingAccountId) setPostingAccountId(currentAccount.profile_id)
  }, [currentAccount, postingAccountId])

  const postingAccount = useMemo<UserAccount | null>(
    () => userAccounts.find((a) => a.profile_id === postingAccountId) ?? currentAccount ?? null,
    [userAccounts, postingAccountId, currentAccount]
  )

  async function handlePickPhoto() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      setPhotoMeta({ name: asset.name, mimeType: asset.mimeType })
    } catch (error) {
      Alert.alert("Could not select photo", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed && !photoUri) return
    if (!user?.id || !postingAccount) {
      Alert.alert("Sign in required", "You must be signed in to post.")
      return
    }

    setIsSubmitting(true)
    try {
      const mediaUrls: string[] = []
      if (photoUri) {
        const url = await uploadFeedPhoto({
          uri: photoUri,
          userId: user.id,
          mimeType: photoMeta?.mimeType,
          name: photoMeta?.name,
        })
        mediaUrls.push(url)
      }

      const headers = buildActingHeaders({
        profileId: postingAccount.profile_id,
        accountType: postingAccount.account_type,
      })

      await createFeedPost({ content: trimmed, visibility, mediaUrls, headers })

      setContent("")
      setPhotoUri(null)
      setPhotoMeta(null)
      onPosted?.()
    } catch (error) {
      if (isQueuedOfflineError(error)) {
        Alert.alert("Queued", "No service right now. Your post will publish when connection returns.")
        setContent("")
        setPhotoUri(null)
        setPhotoMeta(null)
        return
      }
      Alert.alert("Post failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (content.trim().length > 0 || Boolean(photoUri)) && !isSubmitting

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#1e293b",
        borderRadius: 16,
        padding: 12,
        gap: 10,
        backgroundColor: "#0b1220",
      }}
    >
      {postingAccount ? (
        <Pressable
          onPress={() => setIsPickerOpen(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
        >
          <Ionicons name="person-circle-outline" size={16} color="#94a3b8" />
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>
            Posting as <Text style={{ color: "#c084fc", fontWeight: "600" }}>{getAccountDisplayName(postingAccount)}</Text>
          </Text>
          <Ionicons name="chevron-down" size={12} color="#94a3b8" />
        </Pressable>
      ) : null}

      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind?"
        placeholderTextColor="#64748b"
        multiline
        style={{
          color: "#f1f5f9",
          fontSize: 15,
          minHeight: 44,
          textAlignVertical: "top",
        }}
      />

      {photoUri ? (
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: photoUri }}
            style={{ width: "100%", height: 160, borderRadius: 10, backgroundColor: "#1e293b" }}
            resizeMode="cover"
          />
          <Pressable
            onPress={() => {
              setPhotoUri(null)
              setPhotoMeta(null)
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: 999,
              padding: 4,
            }}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={handlePickPhoto} accessibilityLabel="Attach photo">
            <Ionicons name="image-outline" size={22} color="#c084fc" />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {visibilityOptions.map((option) => {
              const selected = visibility === option.value
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setVisibility(option.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: selected ? "rgba(124,58,237,0.25)" : "transparent",
                    borderWidth: 1,
                    borderColor: selected ? "#7c3aed" : "#1e293b",
                  }}
                >
                  <Ionicons name={option.icon} size={12} color={selected ? "#c084fc" : "#64748b"} />
                  <Text style={{ color: selected ? "#c084fc" : "#64748b", fontSize: 11 }}>{option.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? "#7c3aed" : "#334155",
            borderRadius: 999,
            paddingHorizontal: 18,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Post</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={isPickerOpen} transparent animationType="fade" onRequestClose={() => setIsPickerOpen(false)}>
        <Pressable
          onPress={() => setIsPickerOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#0f172a", borderRadius: 16, padding: 16, gap: 8 }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>Post as</Text>
            {userAccounts.map((account) => {
              const selected = account.profile_id === postingAccount?.profile_id
              return (
                <Pressable
                  key={account.profile_id}
                  onPress={() => {
                    setPostingAccountId(account.profile_id)
                    setIsPickerOpen(false)
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: selected ? "#7c3aed" : "#1e293b",
                  }}
                >
                  <View>
                    <Text style={{ color: "#f8fafc", fontWeight: "600" }}>{getAccountDisplayName(account)}</Text>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>{getAccountTypeLabel(account.account_type)}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color="#7c3aed" /> : null}
                </Pressable>
              )
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
