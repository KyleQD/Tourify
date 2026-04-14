import { useState } from "react"
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Link } from "expo-router"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  async function handleReset() {
    const trimmed = email.trim()
    if (!trimmed) {
      Alert.alert("Email required", "Please enter your email address.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: "tourify://reset-password",
      })
      if (error) throw error
      setIsSent(true)
    } catch (error) {
      Alert.alert(
        "Request failed",
        error instanceof Error ? error.message : "Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSent) {
    return (
      <SafeAreaView style={containerStyle}>
        <Text style={{ fontSize: 24, color: "#fff", fontWeight: "700" }}>Check your email</Text>
        <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 8, lineHeight: 20 }}>
          We sent a password reset link to {email.trim()}. Open the link to set a new password.
        </Text>
        <Link href="/(auth)/login" style={linkStyle}>
          Back to Login
        </Link>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={containerStyle}>
      <Text style={{ fontSize: 24, color: "#fff", fontWeight: "700" }}>Reset password</Text>
      <Text style={{ fontSize: 14, color: "#94a3b8", marginTop: 4, marginBottom: 16 }}>
        Enter your email and we'll send you a reset link.
      </Text>
      <TextInput
        style={inputStyle}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#64748b"
      />
      <TouchableOpacity
        style={buttonStyle(isSubmitting)}
        onPress={handleReset}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center" }}>
          {isSubmitting ? "Sending..." : "Send Reset Link"}
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
