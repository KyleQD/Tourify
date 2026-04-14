"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Check, ChevronRight, Music, Plus, Upload, Users, Headphones } from "lucide-react"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [progress, setProgress] = useState(20)

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    artistType: "",
    genres: [] as string[],
    skills: [] as string[],
    avatar: "/placeholder.svg?height=200&width=200&text=Upload+Photo",
    coverImage: "/placeholder.svg?height=400&width=800&text=Upload+Cover+Image",
  })

  // Available genres and skills
  const availableGenres = [
    "Rock",
    "Pop",
    "Hip-Hop",
    "R&B",
    "Jazz",
    "Electronic",
    "Classical",
    "Country",
    "Folk",
    "Metal",
    "Indie",
    "Alternative",
    "Blues",
  ]

  const availableSkills = [
    "Vocals",
    "Guitar",
    "Piano",
    "Drums",
    "Bass",
    "Violin",
    "Saxophone",
    "Trumpet",
    "Production",
    "Songwriting",
    "Mixing",
    "Mastering",
    "DJ",
  ]

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Toggle genre selection
  const toggleGenre = (genre: string) => {
    setFormData((prev) => {
      if (prev.genres.includes(genre)) {
        return { ...prev, genres: prev.genres.filter((g) => g !== genre) }
      } else {
        return { ...prev, genres: [...prev.genres, genre] }
      }
    })
  }

  // Toggle skill selection
  const toggleSkill = (skill: string) => {
    setFormData((prev) => {
      if (prev.skills.includes(skill)) {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) }
      } else {
        return { ...prev, skills: [...prev.skills, skill] }
      }
    })
  }

  // Go to next step
  const nextStep = () => {
    const newStep = step + 1
    setStep(newStep)
    setProgress(newStep * 20)
  }

  // Go to previous step
  const prevStep = () => {
    const newStep = step - 1
    setStep(newStep)
    setProgress(newStep * 20)
  }

  // Complete onboarding
  const completeOnboarding = () => {
    // In a real app, you would save the data to the server here
    router.push("/venue/dashboard")
  }

  return (
    <div className="mx-auto max-w-3xl min-w-0 px-3 py-10 sm:px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold break-words">Welcome to Tourify</h1>
        <p className="mt-2 text-balance text-gray-400">Let&apos;s set up your artist profile</p>
      </div>

      <div className="mb-8 min-w-0">
        <Progress value={progress} className="h-2 bg-gray-800" />
        <div className="mt-2 flex flex-wrap justify-between gap-x-2 gap-y-1 text-xs text-gray-400 sm:text-sm">
          <span className="shrink-0">Basic Info</span>
          <span className="shrink-0">Artist Type</span>
          <span className="shrink-0">Genres</span>
          <span className="shrink-0">Skills</span>
          <span className="shrink-0">Media</span>
        </div>
      </div>

      {step === 1 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a unique username"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country"
                className="bg-gray-800 border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself and your music"
                className="bg-gray-800 border-gray-700 min-h-[120px]"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Artist Type</CardTitle>
            <CardDescription>What best describes you?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 border rounded-lg cursor-pointer ${
                  formData.artistType === "solo"
                    ? "bg-purple-900/30 border-purple-500"
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, artistType: "solo" }))}
              >
                <div className="flex flex-col items-center text-center">
                  <Music className="h-10 w-10 mb-3 text-purple-400" />
                  <h3 className="font-medium">Solo Artist</h3>
                  <p className="text-sm text-gray-400 mt-2">You perform and create music as an individual</p>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer ${
                  formData.artistType === "band"
                    ? "bg-purple-900/30 border-purple-500"
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, artistType: "band" }))}
              >
                <div className="flex flex-col items-center text-center">
                  <Users className="h-10 w-10 mb-3 text-purple-400" />
                  <h3 className="font-medium">Band</h3>
                  <p className="text-sm text-gray-400 mt-2">You're part of a group that performs together</p>
                </div>
              </div>

              <div
                className={`p-4 border rounded-lg cursor-pointer ${
                  formData.artistType === "dj"
                    ? "bg-purple-900/30 border-purple-500"
                    : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, artistType: "dj" }))}
              >
                <div className="flex flex-col items-center text-center">
                  <Headphones className="h-10 w-10 mb-3 text-purple-400" />
                  <h3 className="font-medium">DJ / Producer</h3>
                  <p className="text-sm text-gray-400 mt-2">You create and mix electronic music</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} className="border-gray-700">
              Back
            </Button>
            <Button onClick={nextStep} disabled={!formData.artistType}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Music Genres</CardTitle>
            <CardDescription>Select the genres that best describe your music</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant={formData.genres.includes(genre) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    formData.genres.includes(genre) ? "bg-purple-600" : "border-gray-700 hover:border-gray-600"
                  }`}
                  onClick={() => toggleGenre(genre)}
                >
                  {formData.genres.includes(genre) && <Check className="h-3 w-3 mr-1" />}
                  {genre}
                </Badge>
              ))}
            </div>

            {formData.genres.length === 0 && (
              <p className="text-sm text-gray-400 mt-4">Select at least one genre to continue</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} className="border-gray-700">
              Back
            </Button>
            <Button onClick={nextStep} disabled={formData.genres.length === 0}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Skills & Instruments</CardTitle>
            <CardDescription>Select your musical skills and instruments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant={formData.skills.includes(skill) ? "default" : "outline"}
                  className={`cursor-pointer ${
                    formData.skills.includes(skill) ? "bg-purple-600" : "border-gray-700 hover:border-gray-600"
                  }`}
                  onClick={() => toggleSkill(skill)}
                >
                  {formData.skills.includes(skill) && <Check className="h-3 w-3 mr-1" />}
                  {skill}
                </Badge>
              ))}
            </div>

            <div className="mt-4">
              <Label htmlFor="customSkill">Add a custom skill</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="customSkill"
                  placeholder="Enter a skill not listed above"
                  className="bg-gray-800 border-gray-700"
                />
                <Button variant="outline" className="border-gray-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} className="border-gray-700">
              Back
            </Button>
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 5 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Profile Media</CardTitle>
            <CardDescription>Upload your profile photo and cover image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar} alt="Profile" />
                  <AvatarFallback>
                    {formData.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" className="border-gray-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                <img
                  src={formData.coverImage || "/placeholder.svg"}
                  alt="Cover"
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
                <Button variant="outline" className="border-gray-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Cover Image
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={prevStep} className="border-gray-700">
              Back
            </Button>
            <Button onClick={completeOnboarding}>Complete Setup</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
