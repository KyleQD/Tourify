import { useState } from "react"
import { Modal, Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as WebBrowser from "expo-web-browser"
import { env } from "@/lib/config/env"
import { useMultiAccount } from "@/providers/multi-account-provider"
import {
  getAccountDisplayName,
  getAccountTypeLabel,
  type MobileAccountType,
  type UserAccount,
} from "@/lib/api/accounts"

const accountTypeIcon: Record<MobileAccountType, keyof typeof Ionicons.glyphMap> = {
  general: "person-outline",
  artist: "musical-notes-outline",
  service: "briefcase-outline",
  venue: "business-outline",
  organization: "shield-outline",
  staff: "people-outline",
}

const accountDashboardPath: Record<MobileAccountType, string> = {
  general: "/dashboard",
  artist: "/artist",
  service: "/artist",
  venue: "/venue/dashboard",
  organization: "/admin/dashboard",
  staff: "/dashboard",
}

export function AccountSwitcher() {
  const { userAccounts, currentAccount, switchAccount } = useMultiAccount()
  const [isOpen, setIsOpen] = useState(false)

  if (!currentAccount) return null

  async function handleSelect(account: UserAccount) {
    setIsOpen(false)
    if (account.profile_id !== currentAccount?.profile_id) {
      await switchAccount(account.profile_id)
    }
  }

  async function handleOpenDashboard(account: UserAccount) {
    setIsOpen(false)
    const path = accountDashboardPath[account.account_type] || "/dashboard"
    await WebBrowser.openBrowserAsync(`${env.apiBaseUrl}${path}`)
  }

  async function handleCreateAccount() {
    setIsOpen(false)
    await WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/onboarding`)
  }

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Switch account"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: "#0f172a",
        }}
      >
        <Ionicons
          name={accountTypeIcon[currentAccount.account_type] || "person-outline"}
          size={16}
          color="#c084fc"
        />
        <Text style={{ color: "#e2e8f0", fontWeight: "600", maxWidth: 120 }} numberOfLines={1}>
          {getAccountDisplayName(currentAccount)}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <Pressable
          onPress={() => setIsOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#0f172a",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              gap: 8,
              paddingBottom: 36,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>Switch account</Text>
              <Pressable onPress={() => setIsOpen(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            {userAccounts.map((account) => {
              const isActive = account.profile_id === currentAccount.profile_id
              return (
                <View
                  key={account.profile_id}
                  style={{
                    borderWidth: 1,
                    borderColor: isActive ? "#7c3aed" : "#1e293b",
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                    backgroundColor: isActive ? "rgba(124,58,237,0.12)" : "transparent",
                  }}
                >
                  <Pressable
                    onPress={() => handleSelect(account)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#1e293b",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name={accountTypeIcon[account.account_type] || "person-outline"}
                        size={18}
                        color="#c084fc"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#f8fafc", fontWeight: "600" }}>
                        {getAccountDisplayName(account)}
                      </Text>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        {getAccountTypeLabel(account.account_type)}
                      </Text>
                    </View>
                    {isActive ? (
                      <View
                        style={{
                          borderRadius: 999,
                          backgroundColor: "#7c3aed",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Active</Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable onPress={() => handleOpenDashboard(account)} style={{ paddingVertical: 2 }}>
                    <Text style={{ color: "#a78bfa", fontSize: 12, fontWeight: "600" }}>Open dashboard →</Text>
                  </Pressable>
                </View>
              )
            })}

            <Pressable
              onPress={handleCreateAccount}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: "#334155",
                borderStyle: "dashed",
                borderRadius: 12,
                paddingVertical: 12,
                marginTop: 4,
              }}
            >
              <Ionicons name="add" size={18} color="#a78bfa" />
              <Text style={{ color: "#a78bfa", fontWeight: "600" }}>Create another account</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
