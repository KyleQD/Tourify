"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, UserCircle2 } from "lucide-react"

export default function SocialAccountSetup() {
  const { user, loading, updateProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [formState, setFormState] = useState({
    fullName: "",
    username: "",
  })

  useEffect(() => {
    if (!user) return
    const metadata = user.user_metadata || {}
    setFormState({
      fullName: metadata.full_name || metadata.name || "",
      username: metadata.username || metadata.user_name || metadata.preferred_username || "",
    })
  }, [user])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")

    const trimmedFullName = formState.fullName.trim()
    const trimmedUsername = formState.username.trim().replace(/\s+/g, "").toLowerCase()
    if (!trimmedFullName || !trimmedUsername) {
      setErrorMessage("Please add your full name and username to continue.")
      return
    }

    setIsSubmitting(true)
    const result = await updateProfile({
      full_name: trimmedFullName,
      username: trimmedUsername,
    })
    setIsSubmitting(false)

    if (result.error) {
      setErrorMessage(result.error)
      return
    }

    const nextPath = normalizeNextPath(searchParams.get("next") || "/dashboard")
    router.push(nextPath)
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-white/10 bg-slate-900/90 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5" />
            Finish your account setup
          </CardTitle>
          <CardDescription className="text-slate-300">
            Add a few details so your social sign-in account is ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="social-full-name">Full name</Label>
              <Input
                id="social-full-name"
                value={formState.fullName}
                onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Your full name"
                className="border-white/20 bg-slate-800/70 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="social-username">Username</Label>
              <Input
                id="social-username"
                value={formState.username}
                onChange={(event) => setFormState((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="yourusername"
                className="border-white/20 bg-slate-800/70 text-white"
              />
            </div>

            {errorMessage ? (
              <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save and continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function normalizeNextPath(target: string): string {
  if (!target.startsWith("/")) return "/dashboard"
  if (target === "/" || target.startsWith("/login") || target.startsWith("/auth")) return "/dashboard"
  return target
}
