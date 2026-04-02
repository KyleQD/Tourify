"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  User,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  Users,
  Mail,
  Phone,
  Globe,
  Star,
  CheckCircle,
  ExternalLink,
  Share2,
  BookOpen,
  GraduationCap,
  Target,
  TrendingUp,
  Camera,
  FileText,
  Code,
  Palette,
  Music,
  Video,
  Building,
  Clock,
  ThumbsUp,
  MessageCircle,
  Network
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfilePosts } from "./profile-posts"

interface GeneralProfileProps {
  profile: {
    id: string
    username: string
    account_type: 'general'
    profile_data: {
      name: string
      title?: string
      company?: string
      bio?: string
      skills?: string[]
      experience_level?: string
      availability_status?: 'available' | 'busy' | 'unavailable'
      hourly_rate?: number
      preferred_project_types?: string[]
    }
    avatar_url?: string
    cover_image?: string
    verified: boolean
    location?: string
    stats: {
      followers: number
      following: number
      projects_completed?: number
      client_rating?: number
      response_rate?: number
    }
    social_links?: {
      website?: string
      linkedin?: string
      github?: string
      instagram?: string
      twitter?: string
      behance?: string
      dribbble?: string
    }
  }
  isOwnProfile?: boolean
  onFollow?: () => void
  onMessage?: () => void
}

interface Skill {
  name: string
  level: number
  category: string
  endorsed_count: number
}

interface Experience {
  id: string
  title: string
  company: string
  duration: string
  description: string
  skills_used: string[]
  featured: boolean
}

interface Project {
  id: string
  title: string
  description: string
  image: string
  category: string
  tags: string[]
  completion_date: string
  client_name?: string
  testimonial?: string
  rating?: number
  url?: string
}

interface Certification {
  id: string
  name: string
  organization: string
  date: string
  credential_url?: string
  verified: boolean
}

export function GeneralProfileEnhanced({ profile, isOwnProfile = false, onFollow, onMessage }: GeneralProfileProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [skills, setSkills] = useState<Skill[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfileData()
  }, [profile.id])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Fetch real portfolio data
      try {
        console.log('Fetching portfolio data for general profile:', profile.id)
        const response = await fetch(`/api/settings/portfolio`)
        if (response.ok) {
          const { items } = await response.json()
          console.log('Portfolio items fetched for general profile:', items)
          
          const mappedProjects: Project[] = (items || []).map((it: any) => {
            const firstImage = Array.isArray(it.media) ? (it.media.find((m: any) => m?.kind === 'image') || it.media[0]) : undefined
            const firstLink = Array.isArray(it.links) ? it.links[0]?.url : undefined
            return {
              id: it.id,
              title: it.title,
              description: it.description || '',
              image: firstImage?.url || '/placeholder-project.jpg',
              category: it.type || 'Portfolio',
              tags: it.tags || [],
              completion_date: it.updated_at || it.created_at || new Date().toISOString(),
              url: firstLink
            }
          })
          
          setProjects(mappedProjects)
          console.log('Projects set for general profile:', mappedProjects)
        } else {
          console.error('Failed to fetch portfolio data for general profile:', response.status)
        }
      } catch (error) {
        console.error('Error fetching portfolio data for general profile:', error)
      }

      // Mock skills data
      const mockSkills: Skill[] = [
        { name: "Audio Engineering", level: 95, category: "Technical", endorsed_count: 23 },
        { name: "Live Sound", level: 88, category: "Technical", endorsed_count: 19 },
        { name: "Music Production", level: 92, category: "Creative", endorsed_count: 31 },
        { name: "Project Management", level: 85, category: "Management", endorsed_count: 15 },
        { name: "Team Leadership", level: 78, category: "Management", endorsed_count: 12 },
        { name: "Client Relations", level: 90, category: "Business", endorsed_count: 27 }
      ]
      
      // Mock experience data
      const mockExperience: Experience[] = [
        {
          id: "1",
          title: "Senior Audio Engineer",
          company: "Stellar Studios",
          duration: "2022 - Present",
          description: "Lead audio engineer for major recording projects. Responsible for mixing, mastering, and live sound for high-profile artists.",
          skills_used: ["Audio Engineering", "Music Production", "Project Management"],
          featured: true
        },
        {
          id: "2",
          title: "Freelance Sound Designer",
          company: "Independent",
          duration: "2020 - 2022",
          description: "Provided sound design services for films, podcasts, and live events. Built strong client relationships and delivered high-quality audio solutions.",
          skills_used: ["Audio Engineering", "Live Sound", "Client Relations"],
          featured: false
        }
      ]
      
      // Mock certifications
      const mockCertifications: Certification[] = [
        {
          id: "1",
          name: "Pro Tools Certified User",
          organization: "Avid Technology",
          date: "2023-03-15",
          credential_url: "https://avid.com/certification",
          verified: true
        },
        {
          id: "2",
          name: "Audio Engineering Society Member",
          organization: "AES",
          date: "2022-01-01",
          verified: true
        }
      ]
      
      setSkills(mockSkills)
      setExperience(mockExperience)
      // Don't override real portfolio data with mock data
      // setProjects(mockProjects)
      setCertifications(mockCertifications)
      
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getAvailabilityText = (status: string) => {
    switch (status) {
      case 'available': return 'Available for work'
      case 'busy': return 'Busy - Limited availability'
      case 'unavailable': return 'Not available'
      default: return 'Status unknown'
    }
  }

  const getSkillColor = (level: number) => {
    if (level >= 90) return 'bg-green-500'
    if (level >= 75) return 'bg-blue-500'
    if (level >= 60) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900">
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: profile.cover_image ? `url(${profile.cover_image})` : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        <div className="relative h-full flex items-end">
          <div className="container mx-auto px-6 pb-8">
            <div className="flex items-end gap-6">
              <Avatar className="h-32 w-32 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={profile.avatar_url} alt={profile.profile_data.name} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-emerald-500 to-teal-500">
                  {profile.profile_data.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{profile.profile_data.name}</h1>
                  {profile.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                {profile.profile_data.title && (
                  <p className="text-xl text-emerald-300 mb-2">{profile.profile_data.title}</p>
                )}
                
                {profile.profile_data.company && (
                  <p className="text-white/80 mb-3">
                    <Building className="h-4 w-4 inline mr-2" />
                    {profile.profile_data.company}
                  </p>
                )}
                
                <div className="flex items-center gap-6 text-sm text-white/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {profile.stats.followers.toLocaleString()} followers
                  </div>
                  {profile.stats.projects_completed && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {profile.stats.projects_completed} projects completed
                    </div>
                  )}
                  {profile.stats.client_rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {profile.stats.client_rating}/5 rating
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  {profile.location && (
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  
                  {profile.profile_data.availability_status && (
                    <Badge className={cn("text-white", getAvailabilityColor(profile.profile_data.availability_status))}>
                      <div className="w-2 h-2 rounded-full bg-white mr-2"></div>
                      {getAvailabilityText(profile.profile_data.availability_status)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {!isOwnProfile && (
                  <>
                    <Button 
                      onClick={onFollow}
                      className="bg-white text-black hover:bg-white/90 font-semibold"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button 
                      onClick={onMessage}
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                {profile.profile_data.hourly_rate && (
                  <div className="text-center text-white/80 text-sm">
                    ${profile.profile_data.hourly_rate}/hr
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/10 backdrop-blur border border-white/20 p-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="portfolio" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger 
              value="posts" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger 
              value="experience" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Experience
            </TabsTrigger>
            <TabsTrigger 
              value="skills" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Target className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* About Section */}
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">About {profile.profile_data.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed mb-6">
                  {profile.profile_data.bio || "This professional hasn't added a bio yet."}
                </p>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Briefcase className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{projects.length}</div>
                    <div className="text-sm text-white/60">Projects</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Star className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{profile.stats.client_rating || 0}/5</div>
                    <div className="text-sm text-white/60">Rating</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{profile.stats.response_rate || 95}%</div>
                    <div className="text-sm text-white/60">Response Rate</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <Users className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{profile.stats.followers}</div>
                    <div className="text-sm text-white/60">Followers</div>
                  </div>
                </div>

                {/* Skills Preview */}
                {skills.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium text-lg">Top Skills</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {skills.slice(0, 6).map((skill) => (
                        <div key={skill.name} className="p-3 bg-white/5 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{skill.name}</span>
                            <Badge className="text-white text-xs bg-white/10 border-white/20">
                              {skill.endorsed_count || 0} endorsements
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-white font-medium">Connect</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.social_links).map(([platform, url]) => (
                        url && (
                          <Button
                            key={platform}
                            variant="outline"
                            size="sm"
                            className="border-white/30 text-white hover:bg-white/10"
                            asChild
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-2" />
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          </Button>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="md:flex">
                      <div className="md:w-1/3">
                        <img 
                          src={project.image} 
                          alt={project.title}
                          className="w-full h-48 md:h-full object-cover"
                        />
                      </div>
                      <div className="md:w-2/3 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-semibold text-white mb-1">{project.title}</h3>
                            <p className="text-emerald-300">{project.category}</p>
                          </div>
                          {project.rating && (
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={cn(
                                    "h-4 w-4",
                                    i < project.rating! ? "text-yellow-400 fill-current" : "text-gray-500"
                                  )} 
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <p className="text-white/80 mb-4">{project.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        {project.testimonial && (
                          <blockquote className="border-l-4 border-emerald-500 pl-4 mb-4">
                            <p className="text-white/90 italic">"{project.testimonial}"</p>
                            {project.client_name && (
                              <cite className="text-emerald-300 text-sm">— {project.client_name}</cite>
                            )}
                          </blockquote>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-white/60 text-sm">
                            Completed {formatSafeDate(project.completion_date)}
                          </span>
                          {project.url && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                              asChild
                            >
                              <a href={project.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-2" />
                                View Project
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            <ProfilePosts 
              profileId={profile.id}
              profileUsername={profile.username}
              isOwnProfile={isOwnProfile}
              compact={false}
            />
          </TabsContent>

          <TabsContent value="experience" className="space-y-6">
            <div className="space-y-6">
              {experience.map((exp) => (
                <Card key={exp.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{exp.title}</h3>
                        <p className="text-emerald-300 text-lg">{exp.company}</p>
                        <p className="text-white/60">{exp.duration}</p>
                      </div>
                      {exp.featured && (
                        <Badge className="bg-yellow-500 text-black">
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-white/80 mb-4">{exp.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {exp.skills_used.map((skill) => (
                        <Badge key={skill} variant="outline" className="border-emerald-500/30 text-emerald-300">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Certifications */}
            {certifications.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                          <h4 className="text-white font-medium">{cert.name}</h4>
                          <p className="text-white/70">{cert.organization}</p>
                          <p className="text-white/60 text-sm">{formatSafeDate(cert.date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {cert.verified && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {cert.credential_url && (
                            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">Skills & Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['Technical', 'Creative', 'Management', 'Business'].map((category) => {
                    const categorySkills = skills.filter(skill => skill.category === category)
                    if (categorySkills.length === 0) return null
                    
                    return (
                      <div key={category}>
                        <h4 className="text-white font-medium mb-4">{category} Skills</h4>
                        <div className="grid gap-4">
                          {categorySkills.map((skill) => (
                            <div key={skill.name} className="p-4 bg-white/5 rounded-xl">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-white font-medium">{skill.name}</span>
                                <Badge className="text-white text-xs bg-white/10 border-white/20">
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {skill.endorsed_count || 0} endorsements
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}