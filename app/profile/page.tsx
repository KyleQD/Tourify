"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Music, Building2, User, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ProfileShareCard } from "@/components/profile/profile-share-card"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
    
    // Check for create parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const createType = urlParams.get('create')
    if (createType && ['artist', 'venue', 'admin'].includes(createType)) {
      // Auto-activate the appropriate tab
      // You could also trigger account creation here
    }
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // First check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code === "PGRST116") {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert([{
            id: user.id,
            name: user.user_metadata?.full_name || "",
            username: user.email?.split("@")[0] || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (createError) throw createError
        setProfile(newProfile)
        setName(newProfile.name || "")
        setUsername(newProfile.username || "")
        setBio(newProfile.bio || "")
      } else if (profileError) {
        throw profileError
      } else {
        setProfile(profile)
        setName(profile.name || "")
        setUsername(profile.username || "")
        setBio(profile.bio || "")
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name,
          username,
          bio,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setProfile({ ...profile, name, username, bio })
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const handleActivateProfile = async (type: "artist" | "venue") => {
    setLoading(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      // Check if profile type already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from(`${type}_profiles`)
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") throw checkError

      if (existingProfile) {
        router.push(`/${type}/${existingProfile.id}`)
        return
      }

      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from(`${type}_profiles`)
        .insert([{ user_id: user.id }])
        .select()
        .single()

      if (createError) throw createError

      router.push(`/${type}/${newProfile.id}`)
    } catch (error) {
      console.error(`Error activating ${type} profile:`, error)
      setError(`Failed to activate ${type} profile`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-8">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <User className="w-4 h-4 mr-2" />
            General Profile
          </TabsTrigger>
          <TabsTrigger value="artist">
            <Music className="w-4 h-4 mr-2" />
            Artist Profile
          </TabsTrigger>
          <TabsTrigger value="venue">
            <Building2 className="w-4 h-4 mr-2" />
            Venue Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Profile</CardTitle>
              <CardDescription>
                Manage your basic profile information
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                {username ? (
                  <ProfileShareCard
                    username={username}
                    displayName={name || username}
                    sharePath="/profile"
                  />
                ) : null}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="artist">
          <Card>
            <CardHeader>
              <CardTitle>Artist Profile</CardTitle>
              <CardDescription>
                Create and manage your artist profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                An artist profile lets you showcase what you create, offer services, sell products, and connect with clients or venues.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Features include:</p>
                <ul className="text-xs space-y-1 text-gray-400">
                  <li>• Creator showcase (music, photo, video, and more)</li>
                  <li>• Event creation and management</li>
                  <li>• Hire-me and collaboration tools</li>
                  <li>• Revenue analytics</li>
                </ul>
              </div>
              <Button
                onClick={() => handleActivateProfile("artist")}
                disabled={loading}
              >
                {loading ? "Processing..." : "Create Artist Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venue">
          <Card>
            <CardHeader>
              <CardTitle>Venue Profile</CardTitle>
              <CardDescription>
                Create and manage your venue profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                A venue profile allows you to list your space, manage events, and connect with artists.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Features include:</p>
                <ul className="text-xs space-y-1 text-gray-400">
                  <li>• Venue listing and management</li>
                  <li>• Event booking system</li>
                  <li>• Artist discovery and booking</li>
                  <li>• Revenue tracking</li>
                </ul>
              </div>
              <Button
                onClick={() => handleActivateProfile("venue")}
                disabled={loading}
              >
                {loading ? "Processing..." : "Create Venue Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 