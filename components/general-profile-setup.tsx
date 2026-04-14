"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Camera, 
  MapPin, 
  Globe,
  Heart,
  Music,
  Users,
  Calendar,
  Sparkles
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getAuthSignUpEmailRedirectTo } from "@/lib/auth/auth-email-redirect"

interface GeneralProfileSetupProps {
  userData: {
    email: string
    password: string
    name: string
    username: string
  }
  onComplete: () => void
}

const musicGenres = [
  "Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Classical", 
  "Country", "R&B", "Reggae", "Folk", "Blues", "Metal", "Punk", 
  "Indie", "Alternative", "Dance", "House", "Techno", "Ambient"
]

const interests = [
  "Live Music", "Concerts", "Festivals", "Local Venues", "New Artists",
  "Music Discovery", "Community Events", "Networking", "Music Production",
  "DJing", "Music Photography", "Music Journalism", "Event Planning"
]

export default function GeneralProfileSetup({ userData, onComplete }: GeneralProfileSetupProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState({
    name: userData.name,
    username: userData.username,
    bio: "",
    location: "",
    website: "",
    avatar_url: "",
    genres: [] as string[],
    interests: [] as string[],
    privacy_settings: {
      profile_public: true,
      show_activity: true,
      allow_messages: true
    }
  })

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const toggleGenre = (genre: string) => {
    setProfile(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: getAuthSignUpEmailRedirectTo(),
          data: {
            name: profile.name,
            username: profile.username,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          name: profile.name,
          username: profile.username,
          bio: profile.bio,
          location: profile.location,
          website: profile.website,
          avatar_url: profile.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (profileError) throw profileError

      // Create onboarding state
      const { error: onboardingError } = await supabase
        .from('onboarding')
        .insert([{
          user_id: authData.user.id,
          general_profile_completed: true,
          artist_profile_completed: false,
          venue_profile_completed: false,
          active_profile_type: 'general',
          steps: {
            general: {
              basic_info: true,
              preferences: true
            },
            artist: {
              basic_info: false,
              genres: false,
              social: false
            },
            venue: {
              basic_info: false,
              location: false,
              amenities: false
            }
          }
        }])

      if (onboardingError) throw onboardingError

      // Store preferences in user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          genres: profile.genres,
          interests: profile.interests,
          privacy_settings: profile.privacy_settings
        }
      })

      if (metadataError) console.warn("Failed to update user metadata:", metadataError)

      onComplete()
    } catch (error) {
      console.error("Error creating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-purple-600 text-white">
            <User className="h-8 w-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Set Up Your General Profile</h2>
        <p className="text-gray-400">
          Create your free account to connect with the music community
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Tell us about yourself to help others discover and connect with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-purple-600 text-white text-xl">
                    {profile.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="flex items-center">
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell the community about yourself, your music taste, what you're looking for..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="City, State"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="website"
                      value={profile.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://your-website.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="px-8">
              Next: Preferences
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="h-5 w-5 mr-2" />
                Music Preferences
              </CardTitle>
              <CardDescription>
                Select genres you love to help us personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {musicGenres.map((genre) => (
                  <Badge
                    key={genre}
                    variant={profile.genres.includes(genre) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-purple-600 hover:text-white"
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Interests
              </CardTitle>
              <CardDescription>
                What aspects of the music scene interest you most?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant={profile.interests.includes(interest) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-purple-600 hover:text-white"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-600/10 border-purple-600/20">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-400">
                <Sparkles className="h-5 w-5 mr-2" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Connect & Follow</p>
                    <p className="text-gray-400">Follow artists, venues, and other music lovers</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Discover Events</p>
                    <p className="text-gray-400">Find concerts and events in your area</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Music className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Upgrade Anytime</p>
                    <p className="text-gray-400">Create artist or venue accounts when ready</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-8"
            >
              {loading ? "Creating Account..." : "Complete Setup"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
