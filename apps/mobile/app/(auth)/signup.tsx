import { useState } from "react"
import { Alert, Pressable, SafeAreaView, Text, TextInput } from "react-native"
import { Link, Redirect } from "expo-router"
import { useAuth } from "@/lib/auth/auth-provider"
import { useSession } from "@/hooks/use-session"

export default function SignupScreen() {
  const { signUp } = useAuth()
  const { isAuthenticated } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Redirect href="/(tabs)/discover" />

  async function handleSignup() {
    setIsSubmitting(true)
    try {
      await signUp(email.trim(), password)
      Alert.alert("Check your email", "Use the confirmation link to complete account setup.")
    } catch (error) {
      Alert.alert("Sign up failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 30, color: "#fff", fontWeight: "700" }}>Create account</Text>
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
      <Pressable style={buttonStyle(isSubmitting)} onPress={handleSignup} disabled={isSubmitting}>
        <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
          {isSubmitting ? "Creating..." : "Create account"}
        </Text>
      </Pressable>
      <Link href="/(auth)/login" style={{ color: "#cbd5e1", textAlign: "center", marginTop: 8 }}>
        Already have an account? Sign in
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

function buttonStyle(isSubmitting: boolean) {
  return {
    borderRadius: 12,
    backgroundColor: isSubmitting ? "#6b21a8" : "#9333ea",
    paddingVertical: 12
  } as const
}
