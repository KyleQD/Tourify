"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/context/auth"
import { ProfileAchievementsSection } from "@/components/achievements/profile-achievements-section"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  UserPlus,
  Share2,
  MapPin,
  Calendar,
  Music,
  Mic,
  Award,
  Star,
  Briefcase,
  ImageIcon,
  Users,
  UserCheck,
  UserMinus,
  ExternalLink,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Globe,
  Headphones,
  User as UserIcon,
  Mail,
} from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

type User = {
  id: string
  fullName: string
  username: string
  avatar?: string
  title?: string
  location?: string
  status?: "online" | "offline" | "away"
  email?: string
  connections?: string[]
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { users, fetchUserById, loadingUsers, sendConnectionRequest, removeConnection } = useSocial()

  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [activeTab, setActiveTab] = useState("about")

  // Mock data for the profile sections
  const [profileData, setProfileData] = useState({
    bio: "Award-winning artist with a passion for creating immersive musical experiences. Touring internationally since 2018.",
    genres: ["Electronic", "Ambient", "Experimental"],
    skills: ["Vocals", "Production", "Composition", "Live Performance", "Synthesizers"],
    experience: [
      {
        id: "1",
        role: "Solo Artist",
        years: "2018 - Present",
        description: "Released 3 studio albums and performed at major festivals worldwide.",
      },
      {
        id: "2",
        role: "Session Musician",
        years: "2015 - 2018",
        description: "Worked with various artists on studio recordings and live performances.",
      },
    ],
    releases: [
      {
        id: "1",
        title: "Neon Dreams",
        year: "2022",
        type: "Album",
        image: "/placeholder.svg?height=80&width=80&text=ND",
      },
      {
        id: "2",
        title: "Midnight Echo",
        year: "2020",
        type: "Album",
        image: "/placeholder.svg?height=80&width=80&text=ME",
      },
      {
        id: "3",
        title: "Pulse",
        year: "2019",
        type: "EP",
        image: "/placeholder.svg?height=80&width=80&text=P",
      },
    ],
    upcomingShows: [
      {
        id: "1",
        venue: "The Echo Lounge",
        location: "Los Angeles, CA",
        date: "June 15, 2023",
        ticketLink: "#",
      },
      {
        id: "2",
        venue: "Soundwave Festival",
        location: "Miami, FL",
        date: "July 8-10, 2023",
        ticketLink: "#",
      },
    ],
    gallery: [
      { id: "1", url: "/placeholder.svg?height=200&width=300&text=Live+Performance", alt: "Live performance" },
      { id: "2", url: "/placeholder.svg?height=200&width=300&text=Studio+Session", alt: "Studio session" },
      { id: "3", url: "/placeholder.svg?height=200&width=300&text=Festival+Stage", alt: "Festival stage" },
      { id: "4", url: "/placeholder.svg?height=200&width=300&text=Album+Cover", alt: "Album cover" },
    ],
    socialLinks: {
      website: "https://example.com",
      instagram: "artist_name",
      twitter: "artist_name",
      youtube: "ArtistChannel",
      facebook: "ArtistPage",
    },
    stats: {
      followers: 12500,
      monthlyListeners: 45000,
      shows: 120,
    },
  })

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true)

      if (!params.username) {
        router.push("/discover")
        return
      }

      const username = params.username as string

      // Find user by username
      const user = users.find((u) => u.username === username)

      if (user) {
        setProfileUser(user)

        // In a real app, we would check if the current user is connected to this user
        // For now, we'll just simulate this with a random value
        setIsConnected(Math.random() > 0.5)
        setIsPending(Math.random() > 0.7)
      } else {
        // If user not found in the loaded users, try to fetch directly
        try {
          // This is a placeholder - in a real app we would fetch by username
          // For now, we'll just use the first user as a fallback
          const fallbackUser = users[0]
          if (fallbackUser) {
            setProfileUser(fallbackUser)
          } else {
            router.push("/discover")
          }
        } catch (error) {
          console.error("Error fetching user:", error)
          router.push("/discover")
        }
      }

      setLoading(false)
    }

    loadUserProfile()
  }, [params.username, users, router, fetchUserById])

  const handleConnect = async () => {
    if (!profileUser || !currentUser) return

    if (isConnected) {
      await removeConnection(profileUser.id)
      setIsConnected(false)
    } else {
      await sendConnectionRequest(profileUser.id)
      setIsPending(true)
    }
  }

  const handleMessage = () => {
    if (!profileUser) return
    router.push(`/messages?user=${profileUser.id}`)
  }

  const handleShare = () => {
    if (!profileUser) return

    // In a real app, this would use the Web Share API or copy to clipboard
    navigator.clipboard.writeText(`https://tourify.com/profile/${profileUser.username}`)
    alert("Profile link copied to clipboard!")
  }

  if (loading || !profileUser) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Skeleton className="h-12 w-full" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-purple-900 to-blue-900"></div>
          <CardContent className="p-6 relative">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32 border-4 border-gray-900 absolute -top-16 left-6 md:relative md:top-0 md:left-0">
                <AvatarImage src={profileUser.avatar} alt={profileUser.fullName} />
                <AvatarFallback className="text-2xl">
                  {profileUser.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-16 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{profileUser.fullName}</h1>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Badge variant="secondary" className="bg-purple-900 hover:bg-purple-800">
                        {profileUser.title}
                      </Badge>
                      <span>@{profileUser.username}</span>
                    </div>
                    <div className="flex items-center mt-1 text-gray-400 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {profileUser.location}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {currentUser && currentUser.id !== profileUser.id && (
                      <>
                        <Button
                          variant={isConnected ? "destructive" : "default"}
                          className={isConnected ? "" : "bg-purple-600 hover:bg-purple-700"}
                          onClick={handleConnect}
                          disabled={isPending}
                        >
                          {isConnected ? (
                            <>
                              <UserMinus className="mr-2 h-4 w-4" /> Disconnect
                            </>
                          ) : isPending ? (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" /> Pending
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" /> Connect
                            </>
                          )}
                        </Button>

                        <Button variant="outline" onClick={handleMessage}>
                          <MessageCircle className="mr-2 h-4 w-4" /> Message
                        </Button>
                      </>
                    )}

                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <p className="mt-4 text-gray-300">{profileData.bio}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {profileData.genres.map((genre) => (
                    <Badge key={genre} variant="outline" className="border-purple-500 text-purple-400">
                      {genre}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{profileData.stats.followers.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Followers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {profileData.stats.monthlyListeners.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Monthly Listeners</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{profileData.stats.shows}</p>
                    <p className="text-xs text-gray-500">Shows</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Content */}
      <div className="mt-6">
        <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={venueDashboardTabListClass}>
            <TabsTrigger value="about" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> About
            </TabsTrigger>
            <TabsTrigger value="music" className="flex items-center gap-1">
              <Music className="h-4 w-4" /> Music
            </TabsTrigger>
            <TabsTrigger value="shows" className="flex items-center gap-1">
              <Mic className="h-4 w-4" /> Shows
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-1">
              <Award className="h-4 w-4" /> Achievements
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Gallery
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            {/* About Tab */}
            <TabsContent value="about" className="mt-6">
              <motion.div
                key="about"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-400" /> Skills & Expertise
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profileData.skills.map((skill) => (
                        <Badge key={skill} className="bg-gray-800 hover:bg-gray-700">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-purple-400" /> Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileData.experience.map((exp) => (
                      <div key={exp.id} className="border-l-2 border-purple-500 pl-4 py-1">
                        <h3 className="font-medium text-white">{exp.role}</h3>
                        <p className="text-sm text-gray-400">{exp.years}</p>
                        <p className="text-sm text-gray-300 mt-1">{exp.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-purple-400" /> Connect
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {profileData.socialLinks.website && (
                        <a
                          href={profileData.socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Globe className="h-6 w-6 mb-2 text-purple-400" />
                          <span className="text-xs">Website</span>
                        </a>
                      )}

                      {profileData.socialLinks.instagram && (
                        <a
                          href={`https://instagram.com/${profileData.socialLinks.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Instagram className="h-6 w-6 mb-2 text-purple-400" />
                          <span className="text-xs">Instagram</span>
                        </a>
                      )}

                      {profileData.socialLinks.twitter && (
                        <a
                          href={`https://twitter.com/${profileData.socialLinks.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Twitter className="h-6 w-6 mb-2 text-purple-400" />
                          <span className="text-xs">Twitter</span>
                        </a>
                      )}

                      {profileData.socialLinks.youtube && (
                        <a
                          href={`https://youtube.com/${profileData.socialLinks.youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Youtube className="h-6 w-6 mb-2 text-purple-400" />
                          <span className="text-xs">YouTube</span>
                        </a>
                      )}

                      {profileData.socialLinks.facebook && (
                        <a
                          href={`https://facebook.com/${profileData.socialLinks.facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Facebook className="h-6 w-6 mb-2 text-purple-400" />
                          <span className="text-xs">Facebook</span>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Music Tab */}
            <TabsContent value="music" className="mt-6">
              <motion.div
                key="music"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-purple-400" /> Releases
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profileData.releases.map((release) => (
                        <div key={release.id} className="flex items-center gap-4">
                          <img
                            src={release.image || "/placeholder.svg"}
                            alt={release.title}
                            className="h-16 w-16 object-cover rounded-md"
                          />
                          <div>
                            <h3 className="font-medium text-white">{release.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span>{release.year}</span>
                              <span>•</span>
                              <span>{release.type}</span>
                            </div>
                            <div className="mt-2">
                              <Button variant="outline" size="sm" className="h-8 gap-1">
                                <Headphones className="h-3 w-3" /> Listen
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-purple-400" /> Popular Tracks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded-md">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 w-5 text-center">{i}</span>
                            <div>
                              <p className="font-medium text-white">Track {i}</p>
                              <p className="text-xs text-gray-400">From Album Name</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>3:45</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Headphones className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Shows Tab */}
            <TabsContent value="shows" className="mt-6">
              <motion.div
                key="shows"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-400" /> Upcoming Shows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profileData.upcomingShows.length === 0 ? (
                      <p className="text-center py-6 text-gray-500">No upcoming shows scheduled.</p>
                    ) : (
                      <div className="space-y-4">
                        {profileData.upcomingShows.map((show) => (
                          <div key={show.id} className="border border-gray-800 rounded-lg p-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h3 className="font-medium text-white">{show.venue}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{show.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{show.date}</span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Calendar className="h-3 w-3" /> Add to Calendar
                                </Button>
                                <Button className="bg-purple-600 hover:bg-purple-700 gap-1">
                                  <ExternalLink className="h-3 w-3" /> Tickets
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-400" /> Past Tour Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Tour map visualization would go here</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-6">
              <motion.div
                key="achievements"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProfileAchievementsSection 
                  userId={profileUser?.id || ''}
                  isOwnProfile={profileUser?.id === currentUser?.id}
                  className="bg-gray-900 border-gray-800"
                />
              </motion.div>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="mt-6">
              <motion.div
                key="gallery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-400" /> Photo Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {profileData.gallery.map((item) => (
                        <motion.div key={item.id} whileHover={{ scale: 1.03 }} className="overflow-hidden rounded-lg">
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={item.alt}
                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  )
}
