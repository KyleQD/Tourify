"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

import { PublicMusicDisplay } from "@/components/music/public-music-display"
import { ArtistEPKSection } from "@/components/epk/artist-epk-section"
import { ArtistPostsFeed } from "@/components/profile/artist-posts-feed"
import {
  Play,
  Pause,
  Music,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  Eye,
  Heart,
  Share2,
  Download,
  Star,
  Disc3,
  Radio,
  Headphones,
  Volume2,
  MessageCircle,
  Instagram,
  Twitter,
  Youtube,
  Apple,
  Globe,
  Mail,
  Phone,
  Award,
  TrendingUp,
  DollarSign,
  Clock,
  Ticket,
  Mic,
  Guitar,
  FileText,
  Sparkles,
  Zap,
  Building,
  CheckCircle,
  ArrowUpRight,
  Music2,
  Album,
  User,
  Plus
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ComprehensiveArtistProfileProps {
  profile: {
    id: string
    username: string
    artist_name?: string
    account_type: 'artist'
    profile_data: {
      artist_name?: string
      stage_name?: string
      bio?: string
      genre?: string
      genres?: string[]
      location?: string
      website?: string
      instagram?: string
      twitter?: string
      youtube?: string
      spotify?: string
      contact_email?: string
      phone?: string
      booking_rate?: string
      availability?: string
      equipment?: string
      music_style?: string
      experience_years?: string
      notable_performances?: string
      record_label?: string
      awards?: string
      upcoming_releases?: string
      collaboration_interest?: boolean
      available_for_hire?: boolean
    }
    avatar_url?: string
    cover_image?: string
    verified: boolean
    social_links?: any
    stats: {
      followers: number
      following: number
      posts: number
      likes: number
      views: number
      streams?: number
      events?: number
      monthly_listeners?: number
      total_revenue?: number
      engagement_rate?: number
    }
    settings?: any
    created_at: string
  }
  isOwnProfile?: boolean
  onFollow?: (userId: string) => void
  onMessage?: (userId: string) => void
  onShare?: (profile: any) => void
  portfolio?: Array<{ id: string; title: string; description?: string; media?: any[]; links?: any[]; type?: string }>
  experiences?: Array<{ id: string; title: string; organization?: string; description?: string; start_date?: string; end_date?: string }>
  certifications?: Array<{ id: string; name: string; authority?: string; issue_date?: string; credential_url?: string }>
}

export function ComprehensiveArtistProfile({ 
  profile, 
  isOwnProfile = false, 
  onFollow, 
  onMessage, 
  onShare,
  portfolio,
  experiences,
  certifications: certs
}: ComprehensiveArtistProfileProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<string | null>(null)

  const artistName = profile.profile_data?.artist_name || profile.artist_name || 'Artist'
  const bio = profile.profile_data?.bio || 'No bio available'
  const location = profile.profile_data?.location || 'Location not specified'
  const genres = profile.profile_data?.genres || (profile.profile_data?.genre ? [profile.profile_data.genre] : [])

  // Social media icons mapping
  const socialIcons = {
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    spotify: Music,
    apple_music: Apple,
    soundcloud: ExternalLink,
    website: Globe
  }

  const handlePlayPause = (trackId?: string) => {
    if (trackId && trackId !== currentTrack) {
      setCurrentTrack(trackId)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/3 to-teal-500/3 rounded-full blur-3xl"
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-80 bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-pink-900/30 relative overflow-hidden border-b border-white/10">
          {profile.cover_image && (
            <motion.img 
              src={profile.cover_image} 
              alt="Cover" 
              className="w-full h-full object-cover opacity-40"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.4 }}
              transition={{ duration: 1.5 }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          
          {/* Floating orbs for visual interest */}
          <motion.div
            className="absolute top-16 right-16 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-xl"
            animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-16 left-16 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl"
            animate={{ y: [0, -8, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />
        </div>

        {/* Profile Header */}
        <div className="relative -mt-20 px-6 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
              className="relative"
            >
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-gradient-to-r from-purple-500/50 to-blue-500/50 shadow-2xl shadow-purple-500/25">
                  <AvatarImage src={profile.avatar_url} alt={artistName} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-600 to-blue-600 font-bold">
                    {artistName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Glowing ring around avatar */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400/30"
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(139, 92, 246, 0.3)',
                      '0 0 40px rgba(139, 92, 246, 0.6)',
                      '0 0 20px rgba(139, 92, 246, 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {profile.verified && (
                  <motion.div 
                    className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-1 shadow-lg shadow-blue-500/50"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring", bounce: 0.6 }}
                  >
                    <CheckCircle className="h-6 w-6 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Artist Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <motion.h1 
                    className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  >
                    {artistName}
                  </motion.h1>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                      <Music className="h-3 w-3 mr-1" />
                      Artist
                    </Badge>
                    {genres.map((genre, index) => (
                      <Badge key={index} variant="outline" className="border-white/30 text-white/80">
                        {genre}
                      </Badge>
                    ))}
                    {location && (
                      <div className="flex items-center text-white/60 text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        {location}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-6 text-white/80">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{profile.stats.followers}</div>
                      <div className="text-sm">Followers</div>
                    </div>
                    {profile.stats.streams && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{profile.stats.streams.toLocaleString()}</div>
                        <div className="text-sm">Streams</div>
                      </div>
                    )}
                    {profile.stats.monthly_listeners && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{profile.stats.monthly_listeners.toLocaleString()}</div>
                        <div className="text-sm">Monthly Listeners</div>
                      </div>
                    )}
                    {profile.stats.events && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{profile.stats.events}</div>
                        <div className="text-sm">Events</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isOwnProfile && (
                    <>
                      <Button 
                        onClick={() => onFollow?.(profile.id)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Follow
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => onMessage?.(profile.id)}
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => onShare?.(profile)}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  {isOwnProfile && (
                    <Button 
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Music */}
            <div className="lg:col-span-1 space-y-6">
              {/* Music Player Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-purple-500/20 sticky top-6 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="p-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      >
                        <Music className="h-4 w-4 text-white" />
                      </motion.div>
                      Music
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PublicMusicDisplay 
                      artistId={profile.id} 
                      isOwnProfile={isOwnProfile}
                      className="bg-transparent border-none"
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* About Section - Condensed */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/15 transition-all duration-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <div className="p-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 leading-relaxed text-sm mb-4">
                      {bio}
                    </p>
                    
                    {/* Key Info */}
                    <div className="space-y-3">
                      {profile.profile_data?.record_label && (
                        <motion.div 
                          className="flex items-center gap-2 text-white/70 text-sm p-2 rounded-lg bg-white/5 border border-white/10"
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                          transition={{ duration: 0.2 }}
                        >
                          <Building className="h-3 w-3 text-blue-400" />
                          <span>{profile.profile_data.record_label}</span>
                        </motion.div>
                      )}
                      {profile.profile_data?.experience_years && (
                        <motion.div 
                          className="flex items-center gap-2 text-white/70 text-sm p-2 rounded-lg bg-white/5 border border-white/10"
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                          transition={{ duration: 0.2 }}
                        >
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span>{profile.profile_data.experience_years} years</span>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Center Column - Posts & Activity Feed */}
            <div className="lg:col-span-2 space-y-6">
              {/* Posts Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                <motion.h2 
                  className="text-xl font-bold mb-6 flex items-center gap-3 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 10px rgba(168, 85, 247, 0.5)',
                        '0 0 20px rgba(168, 85, 247, 0.8)',
                        '0 0 10px rgba(168, 85, 247, 0.5)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    <MessageCircle className="h-5 w-5 text-white" />
                  </motion.div>
                  Posts & Activity
                </motion.h2>
                <ArtistPostsFeed
                  artistId={profile.id}
                  artistName={artistName}
                  artistAvatar={profile.avatar_url}
                  isOwnProfile={isOwnProfile}
                />
              </motion.div>

              {/* Activity Section */}
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <Music className="h-4 w-4 text-purple-400" />
                      <span className="text-white/80 text-sm">Joined Tourify</span>
                      <span className="text-white/50 text-xs ml-auto">
                        {formatSafeDate(profile.created_at)}
                      </span>
                    </div>
                    {profile.stats.streams && profile.stats.streams > 0 && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                        <Headphones className="h-4 w-4 text-green-400" />
                        <span className="text-white/80 text-sm">
                          Reached {profile.stats.streams.toLocaleString()} total streams
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notable Performances */}
              {profile.profile_data?.notable_performances && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Mic className="h-5 w-5" />
                      Notable Performances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 leading-relaxed">
                      {profile.profile_data.notable_performances}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Awards & Recognition */}
              {profile.profile_data?.awards && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Awards & Recognition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 leading-relaxed">
                      {profile.profile_data.awards}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Portfolio (Music/Video emphasis) */}
              {portfolio && portfolio.length > 0 && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Featured Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {portfolio.map(item => (
                        <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-semibold">{item.title}</h4>
                              {item.description && (
                                <p className="text-white/70 text-sm mt-1">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experiences */}
              {experiences && experiences.length > 0 && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {experiences.map(exp => (
                        <div key={exp.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-white font-medium">{exp.title}</div>
                          {exp.organization && <div className="text-white/70 text-sm">{exp.organization}</div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Certifications */}
              {certs && certs.length > 0 && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {certs.map(c => (
                        <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-white font-medium">{c.name}</div>
                          {c.authority && <div className="text-white/70 text-sm">{c.authority}</div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Electronic Press Kit */}
              <ArtistEPKSection profile={{
                ...profile,
                artist_name: profile.artist_name || profile.profile_data?.artist_name || 'Artist'
              }} />
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Social Links */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-green-500/20 shadow-xl shadow-green-500/5 hover:shadow-green-500/15 transition-all duration-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <motion.div
                        animate={{ 
                          rotate: [0, 180, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="p-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Globe className="h-4 w-4 text-white" />
                      </motion.div>
                      Connect
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.social_links && Object.entries(profile.social_links).length > 0 ? (
                        <AnimatePresence>
                          {Object.entries(profile.social_links).map(([platform, url], index) => {
                            if (!url) return null
                            const IconComponent = socialIcons[platform as keyof typeof socialIcons] || ExternalLink
                            return (
                              <motion.a
                                key={platform}
                                href={url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-green-500/30 transition-all duration-300 group"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                                whileHover={{ 
                                  scale: 1.02, 
                                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                                  borderColor: "rgba(34, 197, 94, 0.3)"
                                }}
                              >
                                <motion.div
                                  whileHover={{ rotate: 360 }}
                                  transition={{ duration: 0.5 }}
                                  className="p-1 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                                >
                                  <IconComponent className="h-4 w-4 text-green-400 group-hover:text-green-300" />
                                </motion.div>
                                <span className="text-white/80 group-hover:text-white transition-colors font-medium capitalize">
                                  {platform.replace('_', ' ')}
                                </span>
                                <motion.div
                                  whileHover={{ x: 2, y: -2 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ArrowUpRight className="h-3 w-3 text-white/40 ml-auto group-hover:text-green-400 transition-colors" />
                                </motion.div>
                              </motion.a>
                            )
                          })}
                        </AnimatePresence>
                      ) : (
                        <div className="text-center py-6">
                          <Globe className="h-8 w-8 text-white/40 mx-auto mb-2" />
                          <p className="text-white/60 text-sm">No social links added</p>
                          {isOwnProfile && (
                            <p className="text-white/40 text-xs mt-1">
                              Add your social media links in settings
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Contact & Booking */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-blue-500/20 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/15 transition-all duration-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="p-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      >
                        <Mail className="h-4 w-4 text-white" />
                      </motion.div>
                      Contact & Booking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profile.profile_data?.contact_email && (
                      <motion.a
                        href={`mailto:${profile.profile_data.contact_email}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-blue-500/30 transition-all duration-300 group"
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                      >
                        <Mail className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                        <span className="text-white/80 group-hover:text-white transition-colors text-sm">
                          {profile.profile_data.contact_email}
                        </span>
                      </motion.a>
                    )}
                    {profile.profile_data?.phone && (
                      <motion.a
                        href={`tel:${profile.profile_data.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-white/10 hover:border-blue-500/30 transition-all duration-300 group"
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                      >
                        <Phone className="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
                        <span className="text-white/80 group-hover:text-white transition-colors text-sm">
                          {profile.profile_data.phone}
                        </span>
                      </motion.a>
                    )}
                    {profile.profile_data?.booking_rate && (
                      <motion.div
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-white/10"
                        whileHover={{ scale: 1.02 }}
                      >
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-white/80 text-sm">Starting at {profile.profile_data.booking_rate}</span>
                      </motion.div>
                    )}
                    {profile.profile_data?.availability && (
                      <motion.div
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-white/10"
                        whileHover={{ scale: 1.02 }}
                      >
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span className="text-white/80 text-sm">{profile.profile_data.availability}</span>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Upcoming Events */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
              >
                <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-orange-500/20 shadow-xl shadow-orange-500/5 hover:shadow-orange-500/15 transition-all duration-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="p-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                      >
                        <Calendar className="h-4 w-4 text-white" />
                      </motion.div>
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.stats.events && profile.stats.events > 0 ? (
                      <div className="space-y-3">
                        {/* Placeholder for actual events */}
                        <motion.div 
                          className="p-3 rounded-lg bg-gradient-to-r from-white/5 to-white/10 border border-orange-500/20"
                          whileHover={{ scale: 1.02, borderColor: "rgba(249, 115, 22, 0.4)" }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-white font-medium text-sm">Live Performance</h4>
                              <p className="text-white/60 text-xs">Coming Soon</p>
                              <p className="text-white/50 text-xs mt-1">Location TBA</p>
                            </div>
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Badge variant="outline" className="border-orange-500/30 text-orange-300 text-xs">
                                TBA
                              </Badge>
                            </motion.div>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Calendar className="h-8 w-8 text-white/40 mx-auto mb-2" />
                        </motion.div>
                        <p className="text-white/60 text-sm">No upcoming events</p>
                        <p className="text-white/40 text-xs mt-1">
                          {isOwnProfile ? "Schedule your next performance!" : "Check back for updates!"}
                        </p>
                        {isOwnProfile && (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button size="sm" variant="outline" className="mt-3 border-orange-500/30 text-orange-300 hover:bg-orange-500/10 hover:border-orange-500/50">
                              <Plus className="h-3 w-3 mr-1" />
                              Add Event
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Equipment */}
              {profile.profile_data?.equipment && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Guitar className="h-5 w-5" />
                      Equipment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {profile.profile_data.equipment}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Releases */}
              {profile.profile_data?.upcoming_releases && (
                <Card className="bg-white/5 backdrop-blur border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Album className="h-5 w-5" />
                      Upcoming Releases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {profile.profile_data.upcoming_releases}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Stats Card */}
              <Card className="bg-white/5 backdrop-blur border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Profile Views</span>
                    <span className="text-white font-medium">{profile.stats.views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Total Likes</span>
                    <span className="text-white font-medium">{profile.stats.likes.toLocaleString()}</span>
                  </div>
                  {profile.stats.engagement_rate && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Engagement Rate</span>
                      <span className="text-white font-medium">{profile.stats.engagement_rate}%</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Member Since</span>
                    <span className="text-white font-medium">
                      {formatSafeDate(profile.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
