import { Pressable, Text, View } from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useMultiAccount } from "@/providers/multi-account-provider"
import { AccountSwitcher } from "@/components/dashboard/account-switcher"
import { getAccountDisplayName, getAccountUsername } from "@/lib/api/accounts"

export function DashboardHeader() {
  const router = useRouter()
  const { currentAccount } = useMultiAccount()

  const displayName = currentAccount ? getAccountDisplayName(currentAccount) : "Welcome"
  const username = currentAccount ? getAccountUsername(currentAccount) : null
  const avatarUrl = (currentAccount?.profile_data?.avatar_url as string | null | undefined) || null

  function handleAvatarPress() {
    if (!username) return
    router.push(`/profile/${username}`)
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        gap: 12,
      }}
    >
      <Pressable
        onPress={handleAvatarPress}
        disabled={!username}
        accessibilityRole="button"
        accessibilityLabel="View public profile"
        style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#334155" }}
            contentFit="cover"
            transition={120}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#334155",
            }}
          >
            <Ionicons name="person" size={20} color="#94a3b8" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>Welcome back</Text>
          <Text style={{ color: "#f8fafc", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </Pressable>

      <AccountSwitcher />
    </View>
  )
}
