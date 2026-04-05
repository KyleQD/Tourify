"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ProfilePosts } from "./profile-posts"
import { MusicShowcase } from "./music-showcase"
import { useProfileColors } from "@/hooks/use-profile-colors"
import { ProfileAchievementsSection } from "@/components/achievements/profile-achievements-section"
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
  Network,
  Play,
  Pause,
  Eye,
  Heart,
  Download,
  Disc3,
  Radio,
  Headphones,
  Volume2,
  Plus,
  Edit,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EnhancedPublicProfileProps {
  profile: {
    id: string
    username: string
    account_type: 'general' | 'artist' | 'venue' | 'organization'
    profile_data: any
    avatar_url?: string
    cover_image?: string
    verified: boolean
    bio?: string
    location?: string
    social_links: any
    stats: {
      followers: number
      following: number
      posts: number
      likes: number
      views: number
      streams?: number
      events?: number
      monthly_listeners?: number
      projects_completed?: number
      client_rating?: number
      response_rate?: number
    }
    created_at: string
  }
  isOwnProfile?: boolean
  onFollow?: (userId: string) => void
  onMessage?: (userId: string) => void
  onShare?: (profile: any) => void
  portfolio?: any[]
  experiences?: any[]
  certifications?: any[]
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

interface Track {
  id: string
  title: string
  album?: string
  duration: string
  streams: number
  release_date: string
  cover_art?: string
  preview_url?: string
  spotify_url?: string
  apple_music_url?: string
}

interface Show {
  id: string
  date: string
  venue: string
  city: string
  status: 'upcoming' | 'past' | 'sold_out'
  ticket_url?: string
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== "string") return []
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function EnhancedPublicProfileView({ 
  profile, 
  isOwnProfile = false, 
  onFollow, 
  onMessage, 
  onShare,
  portfolio: portfolioProp,
  experiences: experiencesProp,
  certifications: certificationsProp
}: EnhancedPublicProfileProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [relationship, setRelationship] = useState<'none' | 'pending' | 'following' | 'friends'>('none')
  const [isChecking, setIsChecking] = useState(false)

  // Load profile colors
  const {
    colors: profileColors,
    getBackgroundGradient,
    getColorClasses,
    getAnimationClasses,
    getGlowClasses
  } = useProfileColors(profile.id)

  useEffect(() => {
    fetchProfileData()
  }, [profile.id])

  // Check current follow relationship for the viewed profile
  useEffect(() => {
    let isMounted = true
    async function checkRelationship() {
      try {
        setIsChecking(true)
        const res = await fetch(`/api/social/follow-request?action=check&targetUserId=${profile.id}`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        setIsFollowing(!!data.isFollowing)
        setRelationship((data.relationship as any) || (data.isFollowing ? 'following' : (data.requestStatus === 'pending' ? 'pending' : 'none')))
      } catch (_) {
        // ignore
      } finally {
        if (isMounted) setIsChecking(false)
      }
    }
    checkRelationship()
    return () => { isMounted = false }
  }, [profile.id])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Prefer server-provided content from API
      if (portfolioProp || experiencesProp || certificationsProp) {
        const mappedProjects: Project[] = (portfolioProp as any[] | undefined)?.map((it: any) => {
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
        }) || []

        const mappedExp: Experience[] = (experiencesProp as any[] | undefined)?.map((ex: any) => {
          const start = ex.start_date ? new Date(ex.start_date) : null
          const end = ex.end_date ? new Date(ex.end_date) : null
          const duration = start ? `${formatSafeDate(start.toISOString())} - ${end ? formatSafeDate(end.toISOString()) : 'Present'}` : ''
          return {
            id: ex.id,
            title: ex.title,
            company: ex.organization || '',
            duration,
            description: ex.description || '',
            skills_used: ex.tags || [],
            featured: false
          }
        }) || []

        const mappedCerts: Certification[] = (certificationsProp as any[] | undefined)?.map((c: any) => ({
          id: c.id,
          name: c.name,
          organization: c.authority || c.organization || '',
          date: c.issue_date || c.created_at || new Date().toISOString(),
          credential_url: c.credential_url,
          verified: false
        })) || []

        setProjects(mappedProjects)
        setExperience(mappedExp)
        setCertifications(mappedCerts)
      } else {
        // Fallback: Fetch portfolio data directly from API
        try {
          console.log('Fetching portfolio data for profile:', profile.id)
          const response = await fetch(`/api/settings/portfolio`)
          if (response.ok) {
            const { items } = await response.json()
            console.log('Portfolio items fetched:', items)
            
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
            console.log('Projects set:', mappedProjects)
          } else {
            console.error('Failed to fetch portfolio data:', response.status)
          }
        } catch (error) {
          console.error('Error fetching portfolio data:', error)
        }

        if (profile.account_type === 'artist') {
          const mockTracks: Track[] = [
            {
              id: "1",
              title: "Midnight Dreams",
              album: "Electric Nights",
              duration: "3:45",
              streams: 1250000,
              release_date: "2023-11-15",
              cover_art: "/track-1.jpg",
              preview_url: "/preview-1.mp3",
              spotify_url: "https://spotify.com/track/example"
            },
            {
              id: "2",
              title: "Neon Lights",
              album: "Electric Nights",
              duration: "4:12",
              streams: 890000,
              release_date: "2023-11-15",
              cover_art: "/track-2.jpg",
              preview_url: "/preview-2.mp3"
            }
          ]
          
          const mockShows: Show[] = [
            {
              id: "1",
              date: "2024-03-15",
              venue: "The Grand Hall",
              city: "Los Angeles, CA",
              status: "upcoming",
              ticket_url: "https://tickets.com/show/1"
            },
            {
              id: "2",
              date: "2024-02-28",
              venue: "Club Nova",
              city: "San Francisco, CA",
              status: "past"
            }
          ]
          
          setTracks(mockTracks)
          setShows(mockShows)
        } else {
          // General user data
          const mockSkills: Skill[] = [
            { name: "Audio Engineering", level: 95, category: "Technical", endorsed_count: 23 },
            { name: "Live Sound", level: 88, category: "Technical", endorsed_count: 19 },
            { name: "Music Production", level: 92, category: "Creative", endorsed_count: 31 },
            { name: "Project Management", level: 85, category: "Management", endorsed_count: 15 },
            { name: "Team Leadership", level: 78, category: "Management", endorsed_count: 12 },
            { name: "Client Relations", level: 90, category: "Business", endorsed_count: 27 }
          ]
          
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
          
          const mockProjects: Project[] = [
            {
              id: "1",
              title: "Electronic Album Production",
              description: "Full production and mixing for indie electronic artist's debut album. Achieved over 1M streams on Spotify.",
              image: "/project-1.jpg",
              category: "Music Production",
              tags: ["Electronic", "Mixing", "Mastering"],
              completion_date: "2023-12-15",
              client_name: "Nova Sounds",
              testimonial: "Exceptional work! The production quality exceeded our expectations.",
              rating: 5,
              url: "https://spotify.com/album/example"
            },
            {
              id: "2",
              title: "Festival Live Sound Setup",
              description: "Managed live sound for 3-day music festival with 50+ artists across multiple stages.",
              image: "/project-2.jpg",
              category: "Live Sound",
              tags: ["Festival", "Live Sound", "Team Management"],
              completion_date: "2023-08-20",
              client_name: "Summer Beats Festival",
              rating: 5
            }
          ]
          
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
        }
      }
      
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

  const handlePlayTrack = (trackId: string) => {
    setCurrentlyPlaying(currentlyPlaying === trackId ? null : trackId)
  }

  const formatStreams = (streams: number) => {
    if (streams >= 1000000) return `${(streams / 1000000).toFixed(1)}M`
    if (streams >= 1000) return `${(streams / 1000).toFixed(1)}K`
    return streams.toString()
  }

  const getDisplayName = () => {
    if (profile.account_type === 'artist') {
      return profile.profile_data?.artist_name || profile.profile_data?.name || profile.username
    } else if (profile.account_type === 'venue') {
      return profile.profile_data?.venue_name || profile.profile_data?.name || profile.username
    }
    return profile.profile_data?.name || profile.username
  }

  const getDisplayTitle = () => {
    if (profile.account_type === 'artist') {
      return profile.profile_data?.genres?.join(', ') || 'Artist'
    } else if (profile.account_type === 'venue') {
      return `${profile.profile_data?.capacity || 500} capacity venue`
    }
    return profile.profile_data?.title || 'Professional'
  }

  const creatorType = typeof profile.profile_data?.creator_type === "string"
    ? profile.profile_data.creator_type
    : null
  const serviceOfferings = parseListValue(profile.profile_data?.service_offerings)
  const productsForSale = parseListValue(profile.profile_data?.products_for_sale)
  const credentials = parseListValue(profile.profile_data?.credentials)
  const workHighlights = parseListValue(profile.profile_data?.work_highlights)
  const hasCapabilityContent =
    Boolean(creatorType) ||
    serviceOfferings.length > 0 ||
    productsForSale.length > 0 ||
    credentials.length > 0 ||
    workHighlights.length > 0

  return (
    <div className={`min-h-screen ${getBackgroundGradient()}`}>
      {/* Hero Section */}
      <div className="relative h-96 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: profile.cover_image ? `url(${profile.cover_image})` : `linear-gradient(135deg, ${profileColors.primary_color} 0%, ${profileColors.secondary_color} 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        <div className="relative h-full flex items-end">
          <div className="container mx-auto px-6 pb-8">
            <div className="flex items-end gap-6">
              <Avatar className="h-48 w-48 border-4 border-white/20 shadow-2xl">
                <AvatarImage src={profile.avatar_url} alt={getDisplayName()} />
                <AvatarFallback className="text-4xl bg-gradient-to-br from-emerald-500 to-teal-500">
                  {getDisplayName().charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{getDisplayName()}</h1>
                  {profile.verified && (
                    <Badge className="bg-blue-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <p className="text-xl mb-2" style={{ color: profileColors.accent_color }}>{getDisplayTitle()}</p>
                
                {profile.profile_data?.company && (
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
                  {profile.stats.streams && (
                    <div className="flex items-center gap-2">
                      <Headphones className="h-4 w-4" />
                      {formatStreams(profile.stats.streams)} streams
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
                  
                  {profile.profile_data?.availability_status && (
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
                      onClick={() => onFollow?.(profile.id)}
                      className={`bg-white text-black hover:bg-white/90 font-semibold ${relationship === 'friends' ? 'opacity-90' : ''}`}
                      disabled={relationship === 'pending' || relationship === 'following' || relationship === 'friends' || isChecking}
                    >
                      {relationship === 'friends' ? 'Friends' : relationship === 'following' ? 'Following' : relationship === 'pending' ? 'Pending Request' : 'Follow'}
                    </Button>
                    <Button 
                      onClick={() => onMessage?.(profile.id)}
                      variant="outline" 
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                {isOwnProfile && (
                  <Button 
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
                {profile.profile_data?.hourly_rate && (
                  <div className="text-center text-white/80 text-sm">
                    ${profile.profile_data.hourly_rate}/hr
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => onShare?.(profile)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-400" />
                  About {getDisplayName()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed mb-6">
                  {profile.bio || "This professional hasn't added a bio yet."}
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

                {/* Social Links */}
                {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Connect</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(profile.social_links as Record<string, string>).map(([platform, url]) => (
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

            {/* Artist Music Section */}
            {profile.account_type === 'artist' && tracks.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Music className="h-5 w-5 text-emerald-400" />
                    Latest Music
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tracks.map((track) => (
                      <div key={track.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                        <div className="relative">
                          <img 
                            src={track.cover_art || '/placeholder-album.jpg'} 
                            alt={track.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <Button
                            size="sm"
                            className="absolute inset-0 bg-black/50 hover:bg-black/70 rounded-lg"
                            onClick={() => handlePlayTrack(track.id)}
                          >
                            {currentlyPlaying === track.id ? (
                              <Pause className="h-4 w-4 text-white" />
                            ) : (
                              <Play className="h-4 w-4 text-white" />
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{track.title}</h4>
                          {track.album && <p className="text-white/70 text-sm">{track.album}</p>}
                          <div className="flex items-center gap-4 text-xs text-white/60 mt-1">
                            <span>{track.duration}</span>
                            <span>{formatStreams(track.streams)} streams</span>
                            <span>{formatSafeDate(track.release_date)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {track.spotify_url && (
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

            {/* Portfolio/Projects Section */}
            {projects.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                    Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {projects.map((project) => (
                      <div key={project.id} className="bg-white/5 rounded-xl overflow-hidden">
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasCapabilityContent && (
              <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                    Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {creatorType ? (
                    <div>
                      <p className="text-xs text-white/60">Primary creator type</p>
                      <p className="mt-1 text-base text-white">{creatorType}</p>
                    </div>
                  ) : null}
                  {serviceOfferings.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/60">Service offerings</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {serviceOfferings.slice(0, 12).map((service) => (
                          <Badge key={service} variant="secondary" className="bg-white/10 text-white/85">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {productsForSale.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/60">Products for sale</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {productsForSale.slice(0, 12).map((product) => (
                          <Badge key={product} variant="secondary" className="bg-purple-500/20 text-purple-100">
                            {product}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {credentials.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/60">Credentials</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {credentials.slice(0, 12).map((credential) => (
                          <Badge key={credential} variant="secondary" className="bg-emerald-500/20 text-emerald-100">
                            {credential}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {workHighlights.length > 0 ? (
                    <div>
                      <p className="text-xs text-white/60">Past work highlights</p>
                      <div className="mt-2 gap-2">
                        {workHighlights.slice(0, 8).map((highlight) => (
                          <p key={highlight} className="text-sm text-white/85">
                            • {highlight}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Experience Section */}
            {experience.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-emerald-400" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {experience.map((exp) => (
                      <div key={exp.id} className="p-6 bg-white/5 rounded-xl">
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts Section */}
            <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProfilePosts 
                  profileId={profile.id}
                  profileUsername={profile.username}
                  isOwnProfile={isOwnProfile}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Skills Section */}
            {skills.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-emerald-400" />
                    Top Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {skills.slice(0, 8).map((skill) => (
                      <div key={skill.name} className="p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{skill.name}</span>
                          <Badge className="text-white text-xs bg-white/10 border-white/20">
                            {skill.endorsed_count || 0} endorsements
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements Section */}
            <ProfileAchievementsSection 
              userId={profile.id}
              isOwnProfile={isOwnProfile}
              className="bg-white/10 backdrop-blur border-0 rounded-3xl"
            />

            {/* Certifications Section */}
            {certifications.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-400" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {certifications.map((cert) => (
                      <div key={cert.id} className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-medium">{cert.name}</h4>
                            <p className="text-white/70 text-sm">{cert.organization}</p>
                            <p className="text-white/60 text-xs">{formatSafeDate(cert.date)}</p>
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
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Artist Shows Section */}
            {profile.account_type === 'artist' && shows.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    Upcoming Shows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {shows.filter(show => show.status === 'upcoming').slice(0, 3).map((show) => (
                      <div key={show.id} className="p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{show.venue}</h4>
                          <Badge className={cn(
                            "text-white",
                            show.status === 'upcoming' ? 'bg-green-500' : 
                            show.status === 'sold_out' ? 'bg-red-500' : 'bg-gray-500'
                          )}>
                            {show.status === 'upcoming' ? 'Upcoming' : 
                             show.status === 'sold_out' ? 'Sold Out' : 'Past'}
                          </Badge>
                        </div>
                        <p className="text-white/70 text-sm">{show.city}</p>
                        <p className="text-white/60 text-xs">{formatSafeDate(show.date)}</p>
                        {show.ticket_url && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full mt-3 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            asChild
                          >
                            <a href={show.ticket_url} target="_blank" rel="noopener noreferrer">
                              Get Tickets
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}