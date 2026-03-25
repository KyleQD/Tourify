"use client"

// Prevent pre-rendering since this page requires profile context
export const dynamic = 'force-dynamic'

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useProfile } from "../context/profile-context"
import Link from "next/link"
import { PhotoViewer } from '@/components/photos/photo-viewer'
import { usePhotoViewer } from '@/hooks/use-photo-viewer'
import { TestPhotoViewer } from '@/components/photos/test-photo-viewer'
import {
  Music,
  Calendar,
  Users,
  MessageSquare,
  Bell,
  ThumbsUp,
  TrendingUp,
  ImageIcon,
  Loader2,
  MapPin,
  Mic,
  ShoppingBag,
  Briefcase,
  Home,
  FileText,
} from "lucide-react"

export default function HomePage() {
  const { profile } = useProfile()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("feed")
  const photoViewer = usePhotoViewer()

  // Mock posts data for fallback
  const mockPosts = [
    {
      id: 1,
      author: {
        name: "Sarah Williams",
        username: "sarahw",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content:
        "Just wrapped up an amazing tour with @alexj! Three months, 42 cities, and countless memories. The sound team was incredible throughout. #TourLife #ElectronicMusic",
      timestamp: "2 hours ago",
      likes: 89,
      comments: 14,
      shares: 5,
      media: ["/placeholder.svg?height=300&width=500"],
      isLiked: false,
    },
    {
      id: 2,
      author: {
        name: "Mike Chen",
        username: "mikec",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content:
        "Looking for recommendations on portable synths that work well in challenging environments. Need something robust for an upcoming outdoor festival series.",
      timestamp: "5 hours ago",
      likes: 32,
      comments: 28,
      shares: 2,
      isLiked: false,
    },
    {
      id: 3,
      author: {
        name: "Taylor Reed",
        username: "taylorreed",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content:
        "Excited to announce I'll be joining the lineup for the Summer Sounds Festival! Looking forward to sharing the stage with some amazing artists. #FestivalSeason #ElectronicMusic",
      timestamp: "Yesterday",
      likes: 156,
      comments: 42,
      shares: 23,
      isLiked: false,
    },
  ]

  // Fetch real posts from the API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setPostsLoading(true)
        const response = await fetch('/api/feed/posts?type=all&limit=20')
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts')
        }
        
        const data = await response.json()
        
        if (data.data && Array.isArray(data.data)) {
          // Transform API data to match the expected format
          const transformedPosts = data.data.map((post: any) => ({
            id: post.id,
            author: {
              name: post.profiles?.full_name || post.profiles?.username || 'Unknown User',
              username: post.profiles?.username || 'unknown',
              avatar: post.profiles?.avatar_url || '/placeholder.svg?height=40&width=40',
            },
            content: post.content,
            timestamp: new Date(post.created_at).toLocaleDateString(),
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            shares: post.shares_count || 0,
            media: post.media_urls || [],
            isLiked: false, // TODO: Check if current user liked this post
          }))
          
          // Debug: Log posts with media
          const postsWithMedia = transformedPosts.filter((post: any) => post.media && post.media.length > 0)
          if (postsWithMedia.length > 0) {
            console.log('Posts with media found:', postsWithMedia.length)
            postsWithMedia.forEach((post: any) => {
              console.log(`Post ${post.id}:`, post.media)
            })
          } else {
            console.log('No posts with media found')
          }
          
          setPosts(transformedPosts)
        } else {
          // Fallback to mock data if API returns no data
          setPosts(mockPosts)
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
        setPostsError(error)
        // Fallback to mock data on error
        setPosts(mockPosts)
      } finally {
        setPostsLoading(false)
      }
    }

    fetchPosts()
  }, [])
  const [postType, setPostType] = useState("text")
  const [postContent, setPostContent] = useState("")
  const [postImage, setPostImage] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [isPostingContent, setIsPostingContent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const [darkMode, setDarkMode] = useState(true)

  // Mock user data
  const [user, setUser] = useState({
    fullName: "Alex Johnson",
    username: "alexj",
    avatar: "/images/alex-profile.jpeg",
    title: "Electronic Music Artist & Producer",
    location: "Los Angeles, CA",
    bio: "Electronic music producer with 5+ years of experience. Creating immersive soundscapes and high-energy performances for festivals and clubs worldwide.",
    skills: ["Music Production", "DJing", "Sound Design", "Live Performance", "Mixing & Mastering"],
    stats: {
      posts: 128,
      followers: 12430,
      following: 567,
    },
  })

  // Real posts data
  const [posts, setPosts] = useState<any[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState<any>(null)

  // Mock notifications
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      content: "Sarah Williams liked your post",
      timestamp: "10 min ago",
      read: false,
    },
    {
      id: 2,
      content: "New connection request from Mike Chen",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: 3,
      content: "You were mentioned in a post by Taylor Reed",
      timestamp: "Yesterday",
      read: true,
    },
  ])

  // Mock trending topics
  const trendingTopics = [
    { tag: "ElectronicMusic", posts: 1245 },
    { tag: "SummerFestivals", posts: 982 },
    { tag: "MusicProduction", posts: 756 },
    { tag: "DJLife", posts: 621 },
    { tag: "StudioTips", posts: 543 },
  ]

  // Mock upcoming events
  const upcomingEvents = [
    {
      id: 1,
      title: "Electronic Horizons Festival",
      date: "Aug 15-17, 2023",
      location: "Los Angeles, CA",
    },
    {
      id: 2,
      title: "Club Neon Night",
      date: "May 20, 2023",
      location: "New York, NY",
    },
    {
      id: 3,
      title: "Summer Vibes Tour",
      date: "Jun 1 - Jul 15, 2023",
      location: "Multiple Cities",
    },
  ]

  // Mock suggested connections
  const suggestedConnections = [
    {
      id: 1,
      name: "Jamie Smith",
      role: "Visual Artist",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 2,
      name: "Alex Rodriguez",
      role: "Tour Manager",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 3,
      name: "Jordan Taylor",
      role: "Sound Engineer",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  // Handle post creation
  const handleCreatePost = () => {
    if (!postContent.trim() && !postImage && postType !== "event") return
    if (postType === "event" && (!eventTitle.trim() || !eventDate || !eventLocation.trim())) return

    setIsPostingContent(true)

    // Simulate API call
    setTimeout(() => {
      const newPost = {
        id: Date.now(),
        author: {
          name: user.fullName,
          username: user.username,
          avatar: user.avatar,
        },
        content: postContent,
        timestamp: "Just now",
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        media: postImage ? [postImage] : [],
      }

      if (postType === "event") {
        Object.assign(newPost, {
          eventDetails: {
            title: eventTitle,
            date: eventDate,
            location: eventLocation,
          },
        })
      }

      setPosts((prev) => [newPost, ...prev])
      setPostContent("")
      setPostImage(null)
      setEventTitle("")
      setEventDate("")
      setEventLocation("")
      setIsPostingContent(false)

      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      })
    }, 1000)
  }

  // Handle post like
  const handleLikePost = (postId: number) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked
          return {
            ...post,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
            isLiked,
          }
        }
        return post
      }),
    )
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)

    // Simulate search API call
    setTimeout(() => {
      setIsSearching(false)
      toast({
        title: "Search results",
        description: `Found results for "${searchQuery}"`,
      })
    }, 800)
  }

  // Handle mark notification as read
  const handleMarkNotificationAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    )
  }

  // Handle mark all notifications as read
  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
    toast({
      title: "Notifications cleared",
      description: "All notifications have been marked as read.",
    })
  }

  // Handle image upload
  const handleImageUpload = () => {
    // In a real app, this would open a file picker
    // For demo purposes, we'll just set a random image
    const randomId = Math.floor(Math.random() * 1000)
    setPostImage(`/placeholder.svg?height=300&width=500&text=Image+${randomId}`)
    toast({
      title: "Image uploaded",
      description: "Your image has been added to the post.",
    })
  }

  // Filter posts based on active filter
  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "all") return true
    if (activeFilter === "media") return post.media && post.media.length > 0
    if (activeFilter === "events") return "eventDetails" in post
    if (activeFilter === "trending") return post.likes > 50
    return true
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Left Sidebar */}
      <div className="md:col-span-3 space-y-6">
        {/* Profile Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex flex-col items-center">
                <div className="mb-2 h-6">
                  <div className="flex items-center">
                    <Music className="h-5 w-5 text-purple-500 mr-1" />
                    <span className="text-lg font-bold">Tourify</span>
                  </div>
                </div>
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.avatar} alt={user.fullName} />
                  <AvatarFallback>
                    {user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-2 text-lg font-bold">{user.fullName}</h2>
                <p className="text-sm text-gray-500">@{user.username}</p>
              </div>
              <Link href="/edit">
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-3">{user.title}</p>
            <div className="flex justify-between text-center">
              <div>
                <p className="font-bold">{user.stats.posts}</p>
                <p className="text-xs text-gray-500">Posts</p>
              </div>
              <div>
                <p className="font-bold">{user.stats.followers}</p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
              <div>
                <p className="font-bold">{user.stats.following}</p>
                <p className="text-xs text-gray-500">Following</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-0">
            <nav className="flex flex-col">
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "feed" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("feed")}
              >
                <Home className="h-5 w-5 mr-3" />
                Feed
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "music" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("music")}
              >
                <Music className="h-5 w-5 mr-3" />
                Music
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "events" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("events")}
              >
                <Calendar className="h-5 w-5 mr-3" />
                Events
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "epk" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("epk")}
              >
                <FileText className="h-5 w-5 mr-3" />
                EPK
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "community" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("community")}
              >
                <Users className="h-5 w-5 mr-3" />
                Community
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "jobs" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("jobs")}
              >
                <Briefcase className="h-5 w-5 mr-3" />
                Jobs
              </Button>
              <Button
                variant="ghost"
                className={`justify-start rounded-none px-4 py-3 ${
                  activeTab === "store" ? "bg-purple-900/20 text-purple-400" : ""
                }`}
                onClick={() => setActiveTab("store")}
              >
                <ShoppingBag className="h-5 w-5 mr-3" />
                Store
              </Button>
            </nav>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <Bell className="h-4 w-4 mr-2 text-purple-400" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 ${notification.read ? "" : "bg-purple-900/10"}`}
                  onClick={() => handleMarkNotificationAsRead(notification.id)}
                >
                  <div className="flex justify-between">
                    <p className="text-sm">{notification.content}</p>
                    {!notification.read && (
                      <Badge variant="outline" className="bg-purple-500 text-white border-0 h-5 px-1.5">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                </div>
              ))}
            </div>
            <div className="p-3">
              <Button
                variant="link"
                className="text-purple-400 p-0 h-auto w-full text-center"
                onClick={handleMarkAllNotificationsAsRead}
              >
                Mark all as read
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Feed */}
      <div className="md:col-span-6 space-y-6">
        {activeTab === "feed" && (
          <>
            {/* Post Creation */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <Tabs defaultValue="text" onValueChange={(value) => setPostType(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text">Post</TabsTrigger>
                    <TabsTrigger value="media">Media</TabsTrigger>
                    <TabsTrigger value="event">Event</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.fullName} />
                    <AvatarFallback>
                      {user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="What's happening in your music career?"
                      className="bg-gray-700 border-gray-600"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                    />
                    {postType === "media" && (
                      <div className="space-y-3">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={handleImageUpload}>
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setPostType("event")}>
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Mic className="h-4 w-4" />
                          </Button>
                        </div>
                        {postImage && (
                          <div className="relative rounded-md overflow-hidden">
                            <img src={postImage || "/placeholder.svg"} alt="Uploaded media" className="w-full h-auto" />
                          </div>
                        )}
                      </div>
                    )}
                    {postType === "event" && (
                      <div className="space-y-3">
                        <Input
                          placeholder="Event title"
                          className="bg-gray-700 border-gray-600"
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="date"
                            placeholder="Date"
                            className="bg-gray-700 border-gray-600"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                          />
                          <Input
                            placeholder="Location"
                            className="bg-gray-700 border-gray-600"
                            value={eventLocation}
                            onChange={(e) => setEventLocation(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={handleImageUpload}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setPostType("event")}>
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleCreatePost}
                        disabled={isPostingContent}
                      >
                        {isPostingContent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          "Post"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed Filters */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <Button
                variant="outline"
                className={`rounded-full ${activeFilter === "all" ? "bg-purple-900/20 text-purple-400 border-purple-500/30" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                All
              </Button>
              <Button
                variant="outline"
                className={`rounded-full ${activeFilter === "trending" ? "bg-purple-900/20 text-purple-400 border-purple-500/30" : ""}`}
                onClick={() => setActiveFilter("trending")}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </Button>
              <Button
                variant="outline"
                className={`rounded-full ${activeFilter === "media" ? "bg-purple-900/20 text-purple-400 border-purple-500/30" : ""}`}
                onClick={() => setActiveFilter("media")}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Media
              </Button>
              <Button
                variant="outline"
                className={`rounded-full ${activeFilter === "events" ? "bg-purple-900/20 text-purple-400 border-purple-500/30" : ""}`}
                onClick={() => setActiveFilter("events")}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Events
              </Button>
            </div>

            {/* Posts */}
            <div className="space-y-4">
              {postsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                    <span>Loading posts...</span>
                  </div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No posts yet. Be the first to share something!</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                <Card key={post.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex space-x-3">
                      <Avatar>
                        <AvatarImage src={post.author.avatar} alt={post.author.name} />
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{post.author.name}</p>
                            <p className="text-xs text-gray-500">
                              @{post.author.username} · {post.timestamp}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="19" cy="12" r="1" />
                              <circle cx="5" cy="12" r="1" />
                            </svg>
                          </Button>
                        </div>
                        <p className="mt-2 text-sm">{post.content}</p>
                        {post.media && post.media.length > 0 && (
                          <div className="mt-3">
                            {post.media.length === 1 ? (
                              // Single image - full width with natural aspect ratio
                              <div 
                                className="relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => photoViewer.openPhotoViewer(post.media, 0, post)}
                              >
                                <img 
                                  src={post.media[0]} 
                                  alt="Post media"
                                  className="w-full h-auto max-h-96 object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error('Failed to load image:', post.media[0])
                                    e.currentTarget.style.display = 'none'
                                  }}
                                  onLoad={() => {
                                    console.log('Successfully loaded image:', post.media[0])
                                  }}
                                />
                              </div>
                            ) : (
                              // Multiple images - grid layout
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {post.media.slice(0, 4).map((url: any, index: number) => (
                                  <div 
                                    key={index} 
                                    className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => photoViewer.openPhotoViewer(post.media, index, post)}
                                  >
                                    <img 
                                      src={url} 
                                      alt={`Post media ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        console.error('Failed to load image:', url)
                                        e.currentTarget.style.display = 'none'
                                      }}
                                      onLoad={() => {
                                        console.log('Successfully loaded image:', url)
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {post.media.length > 4 && (
                              <p className="text-gray-400 text-xs mt-2">
                                +{post.media.length - 4} more photos
                              </p>
                            )}
                          </div>
                        )}
                        {"eventDetails" in post && (
                          <div className="mt-3 p-3 bg-gray-700 rounded-md">
                            <p className="font-medium">{(post as any).eventDetails.title}</p>
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>{(post as any).eventDetails.date}</span>
                            </div>
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{(post as any).eventDetails.location}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 flex space-x-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`flex items-center ${post.isLiked ? "text-purple-400" : "text-gray-500"}`}
                            onClick={() => handleLikePost(post.id)}
                          >
                            <ThumbsUp className={`h-4 w-4 mr-1 ${post.isLiked ? "fill-purple-400" : ""}`} />
                            {post.likes}
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center text-gray-500">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {post.comments}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>

            <div className="text-center">
              <Button variant="outline">Load More</Button>
            </div>
            {/* Test Photo Viewer */}
            <TestPhotoViewer />
          </>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="md:col-span-3 space-y-6">
        {/* Trending Topics */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-400" />
              Trending Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingTopics.map((topic) => (
                <div key={topic.tag} className="flex justify-between items-center">
                  <Badge
                    variant="outline"
                    className="bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border-purple-500/20 cursor-pointer"
                  >
                    #{topic.tag}
                  </Badge>
                  <span className="text-xs text-gray-500">{topic.posts} posts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-400" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="space-y-1">
                  <p className="font-medium">{event.title}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{event.location}</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("events")}>
                View All Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photo Viewer Modal */}
      <PhotoViewer
        isOpen={photoViewer.isOpen}
        onClose={photoViewer.closePhotoViewer}
        photos={photoViewer.photos}
        initialIndex={photoViewer.initialIndex}
        post={photoViewer.post}
      />
    </div>
  )
}
