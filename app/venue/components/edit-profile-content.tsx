"use client"

// Prevent pre-rendering since this component requires profile context
export const dynamic = 'force-dynamic'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Camera, MapPin, Save, Plus, Search, Moon, Sun, Loader2 } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { useProfile } from "@/context/venue/profile-context"
import { LoadingSpinner } from "./loading-spinner"
import { useState, useRef, type FormEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SkillBadge } from "./skill-badge"
import { ExperienceItem } from "./experience-item"
import { CertificationItem } from "./certification-item"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase/client"
import { useCurrentVenue } from "@/app/venue/hooks/useCurrentVenue"
import { useToast } from "@/hooks/use-toast"

export default function EditProfileContent() {
  const {
    profile,
    loading,
    updateProfile,
    addExperience,
    updateExperience,
    removeExperience,
    addCertification,
    updateCertification,
    removeCertification,
    addSkill,
    removeSkill,
    toggleTheme,
    searchSkills,
  } = useProfile()

  const router = useRouter()
  const { venue, updateVenue } = useCurrentVenue()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleAvatarUpload = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setIsUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      // Update both the local profile context and the persisted venue profile
      updateProfile({ avatar: publicUrl })
      if (venue?.id) {
        await updateVenue({ avatarUrl: publicUrl })
      }
      toast({ title: "Photo updated", description: "Your profile photo has been saved." })
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload photo.", variant: "destructive" })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const [newSkill, setNewSkill] = useState("")
  const [skillSearchQuery, setSkillSearchQuery] = useState("")
  const [skillSearchResults, setSkillSearchResults] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("experience")
  const [newExperience, setNewExperience] = useState({
    title: "",
    company: "",
    startDate: "",
    endDate: "",
    description: "",
    current: false,
  })
  const [newCertification, setNewCertification] = useState({
    title: "",
    organization: "",
    year: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (skillSearchQuery.trim()) {
      setSkillSearchResults(searchSkills(skillSearchQuery))
    } else {
      setSkillSearchResults([])
    }
  }, [skillSearchQuery, searchSkills])

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-gradient-to-b from-purple-900 to-black min-h-screen flex flex-col items-center justify-center text-white">
        <LoadingSpinner size="lg" />
        <p className="mt-4">Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto bg-gradient-to-b from-purple-900 to-black min-h-screen flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-xl mb-4">Profile not found</h2>
        <p>There was an error loading your profile.</p>
      </div>
    )
  }

  const handleBasicInfoSubmit = (e: FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    updateProfile({
      fullName: formData.get("fullName") as string,
      username: formData.get("username") as string,
      location: formData.get("location") as string,
      bio: formData.get("bio") as string,
    })
  }

  const handleAddSkill = (e: FormEvent) => {
    e.preventDefault()
    if (newSkill.trim()) {
      addSkill(newSkill.trim())
      setNewSkill("")
    }
  }

  const handleAddExperience = (e: FormEvent) => {
    e.preventDefault()
    if (newExperience.title && newExperience.company) {
      addExperience(newExperience)
      setNewExperience({
        title: "",
        company: "",
        startDate: "",
        endDate: "",
        description: "",
        current: false,
      })
    }
  }

  const handleAddCertification = (e: FormEvent) => {
    e.preventDefault()
    if (newCertification.title && newCertification.organization) {
      addCertification(newCertification)
      setNewCertification({
        title: "",
        organization: "",
        year: "",
      })
    }
  }

  const handleSaveAll = () => {
    setIsSaving(true)

    // Simulate saving delay
    setTimeout(() => {
      setIsSaving(false)
      router.push("/")
    }, 800)
  }

  return (
    <ErrorBoundary>
      <div
        className={`max-w-md mx-auto ${profile.theme === "dark" ? "bg-gradient-to-b from-purple-900 to-black" : "bg-gradient-to-b from-purple-100 to-white"} min-h-screen flex flex-col ${profile.theme === "dark" ? "text-white" : "text-gray-900"}`}
      >
        {/* Header */}
        <motion.div
          className={`${profile.theme === "dark" ? "bg-black" : "bg-white"} p-4 flex justify-between items-center shadow-sm`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center">
              <Image
                src="/images/tourify-logo.png"
                alt="Tourify Logo"
                width={100}
                height={25}
                className="h-6 w-auto mr-2"
              />
              <span
                className={`text-xl font-semibold ${profile.theme === "dark" ? "text-purple-400" : "text-purple-600"}`}
              >
                Edit Profile
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={profile.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {profile.theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveAll} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save
                </>
              )}
            </Button>
          </div>
        </motion.div>

        <div className="p-4 space-y-4 pb-20">
          {/* Profile Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card
              className={`${profile.theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
            >
              <CardContent className="p-4 flex flex-col items-center">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-2 border-purple-500">
                    <AvatarImage src={profile.avatar || "/placeholder.svg"} alt="Profile Picture" />
                    <AvatarFallback>
                      {profile.fullName
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleAvatarUpload(file)
                      e.target.value = ""
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label="Change profile photo"
                  >
                    {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">Upload a professional profile photo</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <form onSubmit={handleBasicInfoSubmit}>
              <Card
                className={`${profile.theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-md ${profile.theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={profile.fullName}
                      className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      aria-label="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      defaultValue={profile.username}
                      className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      aria-label="Username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="location"
                        name="location"
                        defaultValue={profile.location}
                        className={`pl-8 ${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                        aria-label="Location"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      defaultValue={profile.bio}
                      className={`min-h-[100px] ${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                      aria-label="Professional bio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Professional Title</Label>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-purple-600">{profile.title}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        type="button"
                        onClick={() => {
                          const newTitle = prompt("Enter your professional title:", profile.title)
                          if (newTitle) {
                            updateProfile({ title: newTitle })
                          }
                        }}
                        aria-label="Edit professional title"
                      >
                        Edit Title
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Update Basic Info
                  </Button>
                </CardContent>
              </Card>
            </form>
          </motion.div>

          {/* Detailed Profile Tabs */}
          <Tabs defaultValue="experience" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full grid-cols-3 ${profile.theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="certifications">Certifications</TabsTrigger>
            </TabsList>

            {/* Experience Tab */}
            <TabsContent value="experience" className="space-y-4 mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="experience-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`${profile.theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle
                        className={`text-md ${profile.theme === "dark" ? "text-white" : "text-gray-900"} flex justify-between items-center`}
                      >
                        <span>Work Experience</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const experienceSection = document.getElementById("add-experience-section")
                            if (experienceSection) {
                              experienceSection.scrollIntoView({ behavior: "smooth" })
                            }
                          }}
                          aria-label="Add new experience"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence>
                        {profile.experience.map((job: any) => (
                          <ExperienceItem
                            key={job.id}
                            experience={job}
                            onUpdate={updateExperience}
                            onRemove={removeExperience}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Add New Experience Form */}
                      <div
                        id="add-experience-section"
                        className={`border rounded-lg p-3 ${profile.theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-gray-100"}`}
                      >
                        <h3 className="font-medium mb-3">Add New Experience</h3>
                        <form onSubmit={handleAddExperience} className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="new-job-title">Job Title</Label>
                            <Input
                              id="new-job-title"
                              value={newExperience.title}
                              onChange={(e) => setNewExperience({ ...newExperience, title: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              required
                              aria-label="New job title"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="new-company">Company/Organization</Label>
                            <Input
                              id="new-company"
                              value={newExperience.company}
                              onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              required
                              aria-label="New company or organization"
                            />
                          </div>

                          <div className="space-y-1">
                                                          <Label htmlFor="new-startDate">Start Date</Label>
                            <Input
                              id="new-startDate"
                              type="date"
                              value={newExperience.startDate}
                              onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              aria-label="Start date"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="new-description">Description</Label>
                            <Textarea
                              id="new-description"
                              value={newExperience.description}
                              onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              aria-label="Job description"
                            />
                          </div>

                          <Button type="submit" className="w-full">
                            Add Experience
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills" className="space-y-4 mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="skills-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`${profile.theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-md ${profile.theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        Skills & Expertise
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <AnimatePresence>
                          {profile.skills.map((skill: string) => (
                            <SkillBadge key={skill} skill={skill} onRemove={removeSkill} isEditable={true} />
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="Search your skills"
                            className={`pl-8 ${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                            value={skillSearchQuery}
                            onChange={(e) => setSkillSearchQuery(e.target.value)}
                            aria-label="Search skills"
                          />
                        </div>

                        {skillSearchResults.length > 0 && (
                          <div className={`p-2 rounded-md ${profile.theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
                            <p className="text-xs text-gray-500 mb-2">Search results:</p>
                            <div className="flex flex-wrap gap-2">
                              {skillSearchResults.map((skill) => (
                                <Badge
                                  key={skill}
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-purple-500 hover:text-white transition-colors"
                                  onClick={() => {
                                    setSkillSearchQuery("")
                                    setSkillSearchResults([])
                                  }}
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleAddSkill} className="flex gap-2">
                          <Input
                            placeholder="Add a new skill"
                            className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            aria-label="New skill"
                          />
                          <Button type="submit">Add</Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Certifications Tab */}
            <TabsContent value="certifications" className="space-y-4 mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="certifications-tab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    className={`${profile.theme === "dark" ? "bg-gray-900 text-white border-gray-800" : "bg-white text-gray-900 border-gray-200"}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle
                        className={`text-md ${profile.theme === "dark" ? "text-white" : "text-gray-900"} flex justify-between items-center`}
                      >
                        <span>Certifications</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const certSection = document.getElementById("add-certification-section")
                            if (certSection) {
                              certSection.scrollIntoView({ behavior: "smooth" })
                            }
                          }}
                          aria-label="Add new certification"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence>
                        {profile.certifications.map((cert: any) => (
                          <CertificationItem
                            key={cert.id}
                            certification={cert}
                            onUpdate={updateCertification}
                            onRemove={removeCertification}
                          />
                        ))}
                      </AnimatePresence>

                      {/* Add New Certification Form */}
                      <div
                        id="add-certification-section"
                        className={`border rounded-lg p-3 ${profile.theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-gray-100"}`}
                      >
                        <h3 className="font-medium mb-3">Add New Certification</h3>
                        <form onSubmit={handleAddCertification} className="space-y-3">
                          <div className="space-y-1">
                            <Label htmlFor="new-cert-title">Certification Title</Label>
                            <Input
                              id="new-cert-title"
                              value={newCertification.title}
                              onChange={(e) => setNewCertification({ ...newCertification, title: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              required
                              aria-label="Certification title"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="new-organization">Issuing Organization</Label>
                            <Input
                              id="new-organization"
                              value={newCertification.organization}
                              onChange={(e) =>
                                setNewCertification({ ...newCertification, organization: e.target.value })
                              }
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              required
                              aria-label="Issuing organization"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="new-year">Year</Label>
                            <Input
                              id="new-year"
                              value={newCertification.year}
                              onChange={(e) => setNewCertification({ ...newCertification, year: e.target.value })}
                              className={`${profile.theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                              aria-label="Year received"
                            />
                          </div>

                          <Button type="submit" className="w-full">
                            Add Certification
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  )
}
