import { useState } from "react"
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from "react-native"
import { Link, Redirect } from "expo-router"
import { useAuth } from "@/lib/auth/auth-provider"
import { useSession } from "@/hooks/use-session"

export default function LoginScreen() {
  const { signIn, signInWithOAuth } = useAuth()
  const { isAuthenticated } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Redirect href="/(tabs)/discover" />

  async function handleSignIn() {
    setIsSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSocial(provider: "google" | "apple" | "facebook") {
    setIsSubmitting(true)
    try {
      await signInWithOAuth(provider)
    } catch (error) {
      Alert.alert("OAuth failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 30, color: "#fff", fontWeight: "700" }}>Tourify</Text>
      <Text style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>Sign in to continue</Text>
      <TextInput
        style={inputStyle}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#64748b"
      />
      <TextInput
        style={inputStyle}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#64748b"
      />
      <Pressable style={buttonStyle(isSubmitting)} onPress={handleSignIn} disabled={isSubmitting}>
        <Text style={buttonTextStyle}>{isSubmitting ? "Signing in..." : "Sign in"}</Text>
      </Pressable>
      <View style={{ marginTop: 12, gap: 8 }}>
        <Pressable style={secondaryButtonStyle} onPress={() => handleSocial("google")} disabled={isSubmitting}>
          <Text style={secondaryTextStyle}>Continue with Google</Text>
        </Pressable>
        <Pressable style={secondaryButtonStyle} onPress={() => handleSocial("apple")} disabled={isSubmitting}>
          <Text style={secondaryTextStyle}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={secondaryButtonStyle} onPress={() => handleSocial("facebook")} disabled={isSubmitting}>
          <Text style={secondaryTextStyle}>Continue with Facebook</Text>
        </Pressable>
      </View>
      <Link href="/(auth)/signup" style={{ color: "#cbd5e1", textAlign: "center", marginTop: 8 }}>
        New here? Create an account
      </Link>
    </SafeAreaView>
  )
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "#fff"
} as const

const buttonTextStyle = { color: "#fff", fontWeight: "600", textAlign: "center" } as const
const secondaryTextStyle = { color: "#cbd5e1", fontWeight: "600", textAlign: "center" } as const
const secondaryButtonStyle = { borderRadius: 12, borderWidth: 1, borderColor: "#334155", paddingVertical: 12 } as const

function buttonStyle(isSubmitting: boolean) {
  return {
    borderRadius: 12,
    backgroundColor: isSubmitting ? "#6b21a8" : "#9333ea",
    paddingVertical: 12,
    marginTop: 4
  } as const
}
