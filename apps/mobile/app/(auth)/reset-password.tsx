import { useEffect, useState } from "react"
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity } from "react-native"
import { Link, useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { validateNewPassword } from "@/lib/auth/reset-password-guard"

export default function ResetPasswordScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function prepareRecoverySession() {
      if (params.error) {
        Alert.alert(
          "Reset link invalid",
          typeof params.error_description === "string"
            ? params.error_description
            : "Please request a new password reset email."
        )
        router.replace("/(auth)/forgot-password")
        return
      }

      if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code)
        if (error) {
          Alert.alert("Reset link expired", error.message)
          router.replace("/(auth)/forgot-password")
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        Alert.alert(
          "Open the email link",
          "Open the password reset link from your email to continue."
        )
        router.replace("/(auth)/forgot-password")
        return
      }

      setIsReady(true)
    }

    void prepareRecoverySession()
  }, [params.code, params.error, params.error_description, router])

  async function handleUpdatePassword() {
    const validation = validateNewPassword({ password, confirmPassword })
    if (!validation.ok) {
      Alert.alert("Invalid password", validation.message)
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      Alert.alert("Password updated", "You can sign in with your new password.")
      router.replace("/(auth)/login")
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isReady) {
    return (
      <SafeAreaView style={containerStyle}>
        <Text style={{ fontSize: 18, color: "#fff", fontWeight: "600" }}>Preparing reset…</Text>
        <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
          Validating your recovery link.
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={containerStyle}>
      <Text style={{ fontSize: 24, color: "#fff", fontWeight: "700" }}>Set new password</Text>
      <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 4, marginBottom: 16 }}>
        Choose a new password for your Tourify account.
      </Text>
      <TextInput
        style={inputStyle}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor="#64748b"
      />
      <TextInput
        style={inputStyle}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Confirm password"
        placeholderTextColor="#64748b"
      />
      <TouchableOpacity
        style={buttonStyle(isSubmitting)}
        onPress={handleUpdatePassword}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center" }}>
          {isSubmitting ? "Updating..." : "Update Password"}
        </Text>
      </TouchableOpacity>
      <Link href="/(auth)/login" style={linkStyle}>
        Back to Login
      </Link>
    </SafeAreaView>
  )
}

const containerStyle = {
  flex: 1,
  backgroundColor: "#0a0a1a",
  padding: 20,
  justifyContent: "center",
  gap: 12,
} as const

const inputStyle = {
  borderWidth: 1,
  borderColor: "#334155",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: "#fff",
} as const

const linkStyle = {
  color: "#cbd5e1",
  textAlign: "center",
  marginTop: 12,
} as const

function buttonStyle(disabled: boolean) {
  return {
    borderRadius: 12,
    backgroundColor: disabled ? "#6b21a8" : "#9333ea",
    paddingVertical: 12,
    marginTop: 4,
  } as const
}
