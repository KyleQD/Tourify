"use client"

import { useState, useEffect } from "react"
import { supabase } from '@/lib/supabase/client'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  User,
  Briefcase,
  Target,
  Globe,
  Save,
  Loader2,
  Settings,
  Shield,
  Plus,
  X,
  DollarSign,
  Clock,
  Star,
  Award,
  GraduationCap
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters').optional(),
  location: z.string().max(100).optional(),
  
  // Professional details
  experience_level: z.enum(['entry', 'mid', 'senior', 'expert']).optional(),
  availability_status: z.enum(['available', 'busy', 'unavailable']).default('available'),
  hourly_rate: z.number().min(0).max(1000).optional(),
  preferred_project_types: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  
  // Contact & Social
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  behance: z.string().optional(),
  dribbble: z.string().optional(),
  
  // Privacy settings
  show_email: z.boolean().default(false),
  show_phone: z.boolean().default(false),
  show_location: z.boolean().default(true),
  show_hourly_rate: z.boolean().default(false),
  show_availability: z.boolean().default(true),
  allow_project_offers: z.boolean().default(true),
  public_profile: z.boolean().default(true),
})

const skillOptions = [
  'Audio Engineering',
  'Live Sound',
  'Music Production',
  'Mixing',
  'Mastering',
  'DJ',
  'Event Planning',
  'Stage Management',
  'Lighting Design',
  'Video Production',
  'Photography',
  'Graphic Design',
  'Marketing',
  'Social Media',
  'Project Management',
  'Booking',
  'Artist Management',
  'Promotions',
  'Venue Operations',
  'Sound Design',
  'Podcast Production',
  'Content Creation',
  'Music Journalism',
  'A&R',
  'Music Business',
  'Tour Management',
  'Technical Support',
  'Equipment Rental',
  'Music Education',
  'Other'
]

const projectTypes = [
  'Music Production',
  'Live Events',
  'Studio Sessions',
  'Podcast Production',
  'Event Management',
  'Marketing Campaigns',
  'Video Production',
  'Photography',
  'Artist Development',
  'Tour Support',
  'Equipment Rental',
  'Consultation',
  'Education/Training',
  'Other'
]

type ProfileFormData = z.infer<typeof profileSchema>

export function EnhancedGeneralSettings() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("profile")

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      title: '',
      company: '',
      bio: '',
      location: '',
      experience_level: 'mid',
      availability_status: 'available',
      hourly_rate: 50,
      preferred_project_types: [],
      skills: [],
      website: '',
      linkedin: '',
      github: '',
      instagram: '',
      twitter: '',
      behance: '',
      dribbble: '',
      show_email: false,
      show_phone: false,
      show_location: true,
      show_hourly_rate: false,
      show_availability: true,
      allow_project_offers: true,
      public_profile: true,
    }
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        return
      }

      if (profile) {
        setProfile(profile)
        setSelectedSkills(profile.skills || [])
        setSelectedProjectTypes(profile.preferred_project_types || [])
        
        // Populate form with existing data
        form.reset({
          full_name: profile.full_name || '',
          title: profile.title || '',
          company: profile.company || '',
          bio: profile.bio || '',
          location: profile.location || '',
          experience_level: profile.experience_level || 'mid',
          availability_status: profile.availability_status || 'available',
          hourly_rate: profile.hourly_rate || 50,
          preferred_project_types: profile.preferred_project_types || [],
          skills: profile.skills || [],
          website: profile.website || '',
          linkedin: profile.linkedin || '',
          github: profile.github || '',
          instagram: profile.instagram || '',
          twitter: profile.twitter || '',
          behance: profile.behance || '',
          dribbble: profile.dribbble || '',
          show_email: profile.show_email ?? false,
          show_phone: profile.show_phone ?? false,
          show_location: profile.show_location ?? true,
          show_hourly_rate: profile.show_hourly_rate ?? false,
          show_availability: profile.show_availability ?? true,
          allow_project_offers: profile.allow_project_offers ?? true,
          public_profile: profile.public_profile ?? true,
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true)
      console.log('Saving profile data for user:', user?.id)
      console.log('Profile data to save:', data)

      const payload = {
        full_name: data.full_name,
        title: data.title,
        company: data.company,
        bio: data.bio,
        location: data.location,
        experience_level: data.experience_level,
        availability_status: data.availability_status,
        hourly_rate: data.hourly_rate,
        preferred_project_types: selectedProjectTypes,
        skills: selectedSkills,
        website: data.website,
        linkedin: data.linkedin,
        github: data.github,
        instagram: data.instagram,
        twitter: data.twitter,
        behance: data.behance,
        dribbble: data.dribbble,
        show_email: data.show_email,
        show_phone: data.show_phone,
        show_location: data.show_location,
        show_hourly_rate: data.show_hourly_rate,
        show_availability: data.show_availability,
        allow_project_offers: data.allow_project_offers,
        public_profile: data.public_profile
      }

      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('API error saving profile:', body)
        toast.error('Failed to save profile')
        return
      }

      toast.success('Profile saved successfully!')
      await loadProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => {
      const newSkills = prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
      
      form.setValue('skills', newSkills)
      return newSkills
    })
  }

  const toggleProjectType = (type: string) => {
    setSelectedProjectTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
      
      form.setValue('preferred_project_types', newTypes)
      return newTypes
    })
  }

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur border border-white/20 p-1 rounded-2xl">
          <TabsTrigger 
            value="profile" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="professional" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Professional
          </TabsTrigger>
          <TabsTrigger 
            value="skills" 
            className="data-[state=active]:bg-white data-[state=active]:text-black text-white rounded-xl transition-all duration-200 hover:bg-white/10"
          >
            <Target className="h-4 w-4 mr-2" />
            Skills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Full Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John Doe" 
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Professional Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Audio Engineer, Music Producer, Live Sound Engineer..." 
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="text-white/60">
                            This will appear under your name on your profile (e.g., "Audio Engineer", "Music Producer")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Company</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Independent / Company Name" 
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Location</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="City, State/Country" 
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-semibold">Bio</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell others about your experience, specialties, and what you're passionate about in the music industry..."
                            className="min-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-white/60">
                          Share your professional background and what makes you unique.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="bg-white/20" />

                  {/* Social Links */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Social & Portfolio Links
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">Website</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://yourwebsite.com" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">LinkedIn</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="linkedin.com/in/username" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="github"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">GitHub</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="github.com/username" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="behance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">Behance</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="behance.net/username" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">Instagram</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="@username" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="twitter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white font-semibold">Twitter/X</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="@username" 
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-8 py-3 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 font-semibold"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="experience_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Experience Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                              <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                              <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                              <SelectItem value="expert">Expert (10+ years)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="availability_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white font-semibold">Availability Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/5 border-white/20 text-white rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available for work</SelectItem>
                              <SelectItem value="busy">Busy - Limited availability</SelectItem>
                              <SelectItem value="unavailable">Not available</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="hourly_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white font-semibold">Hourly Rate: ${field.value}/hour</FormLabel>
                        <FormControl>
                          <Slider
                            min={10}
                            max={500}
                            step={5}
                            value={[field.value || 50]}
                            onValueChange={(value) => field.onChange(value[0])}
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription className="text-white/60">
                          Set your typical hourly rate for projects
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preferred Project Types */}
                  <div className="space-y-4">
                    <Label className="text-white font-semibold text-lg">Preferred Project Types</Label>
                    <div className="flex flex-wrap gap-3">
                      {projectTypes.map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={selectedProjectTypes.includes(type) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleProjectType(type)}
                          className={selectedProjectTypes.includes(type) 
                            ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-4 py-2 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                            : "border-white/30 text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all duration-200"
                          }
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                    <p className="text-sm text-white/60">
                      Select the types of projects you're interested in working on
                    </p>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-white font-semibold text-lg">Skills</Label>
                  <div className="flex flex-wrap gap-3">
                    {skillOptions.map((skill) => (
                      <Button
                        key={skill}
                        type="button"
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSkill(skill)}
                        className={selectedSkills.includes(skill) 
                          ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl px-4 py-2 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                          : "border-white/30 text-white hover:bg-white/10 rounded-xl px-4 py-2 transition-all duration-200"
                        }
                      >
                        {skill}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-white/60">
                    Select all skills that apply to your expertise
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Selected Skills</h3>
                  {selectedSkills.length > 0 ? (
                    <div className="grid gap-4">
                      {selectedSkills.map((skill) => (
                        <div key={skill} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                          <span className="font-semibold text-white">{skill}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSkill(skill)}
                            className="text-white hover:bg-white/10 rounded-xl"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/60 text-center py-8">
                      No skills selected yet. Choose from the options above.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  )
}