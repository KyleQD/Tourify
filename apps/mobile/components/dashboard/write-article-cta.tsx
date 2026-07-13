import { Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as WebBrowser from "expo-web-browser"
import { env } from "@/lib/config/env"

export function WriteArticleCTA() {
  return (
    <Pressable
      onPress={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/blog/new`)}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "#334155",
        borderStyle: "dashed",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#0b1220",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: "rgba(124,58,237,0.2)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="create-outline" size={20} color="#c084fc" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>Write an Article</Text>
        <Text style={{ color: "#94a3b8", fontSize: 12 }}>
          Share news, reviews, or stories — published to your followers&apos; feeds
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#64748b" />
    </Pressable>
  )
}
