"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, ImageIcon, Loader2, MessageSquare, ThumbsUp, TrendingUp, Users, Video } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { normalizeMediaData, renderMediaContent } from '@/utils/media-utils'
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

export default function FeedPage() {
  const [postType, setPostType] = useState("text")
  const [postContent, setPostContent] = useState("")
  const [postImage, setPostImage] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [eventLocation, setEventLocation] = useState("")
  const [isPostingContent, setIsPostingContent] = useState(false)
  const [activeFilter, setActiveFilter] = useState("all")
  const { toast } = useToast()

  // Mock user data
  const user = {
    fullName: "Alex Johnson",
    username: "alexj",
    avatar: "/images/alex-profile.jpeg",
  }

  // Mock posts data
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: {
        name: "Sarah Williams",
        username: "sarahw",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      content:
        "Just wrapped up an amazing tour with @bandname! Three months, 42 cities, and countless memories. The sound team was incredible throughout. #TourLife #SoundEngineer",
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
        "Looking for recommendations on portable audio interfaces that work well in challenging environments. Need something robust for an upcoming outdoor festival series.",
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
        "Excited to announce I'll be joining the production team for the Summer Sounds Festival! Looking forward to working with some amazing artists. #FestivalSeason #Production",
      timestamp: "Yesterday",
      likes: 156,
      comments: 42,
      shares: 23,
      isLiked: false,
    },
  ])

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

  // Handle video upload
  const handleVideoUpload = () => {
    // In a real app, this would open a file picker
    // For demo purposes, we'll just set a random video placeholder
    const randomId = Math.floor(Math.random() * 1000)
    setPostImage(`/placeholder.svg?height=300&width=500&text=Video+${randomId}`)
    toast({
      title: "Video uploaded",
      description: "Your video has been added to the post.",
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
    <div className="space-y-6">
      {/* Post Creation */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <Tabs defaultValue="text" onValueChange={(value) => setPostType(value as any)}>
            <TabsList className={venueDashboardTabListClass}>
              <TabsTrigger value="text">Post</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="event">Event</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-3">
            <Avatar>
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.fullName} />
              <AvatarFallback>
                {user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's happening in your tour life?"
                className="bg-gray-700 border-gray-600"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
              {postType === "media" && (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button variant="outline" className="flex items-center" onClick={handleImageUpload}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Add Image
                    </Button>
                    <Button variant="outline" className="flex items-center" onClick={handleVideoUpload}>
                      <Video className="h-4 w-4 mr-2" />
                      Add Video
                    </Button>
                  </div>
                  {postImage && (
                    <div className="relative rounded-md overflow-hidden">
                      <img src={postImage || "/placeholder.svg"} alt="Uploaded media" className="w-full h-auto" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setPostImage(null)}
                      >
                        Remove
                      </Button>
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
                    <Users className="h-4 w-4" />
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
        {filteredPosts.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No posts found matching your filter.</p>
              <Button variant="link" className="text-purple-400 mt-2" onClick={() => setActiveFilter("all")}>
                View all posts
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex space-x-3">
                  <Avatar>
                    <AvatarImage src={post.author.avatar || "/placeholder.svg"} alt={post.author.name} />
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
                    {(() => {
                      const mediaItems = normalizeMediaData(post)
                      return renderMediaContent(mediaItems)
                    })()}
                    {"eventDetails" in post && (
                      <div className="mt-3 p-3 bg-gray-700 rounded-md">
                        <p className="font-medium">{(post as any).eventDetails.title}</p>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{(post as any).eventDetails.date}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-1">
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
                            className="h-3 w-3 mr-1"
                          >
                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center text-gray-500"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://tourify.com/posts/${post.id}`)
                          toast({
                            title: "Link copied",
                            description: "Post link has been copied to clipboard.",
                          })
                        }}
                      >
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
                          className="h-4 w-4 mr-1"
                        >
                          <path d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-7.5a1 1 0 0 0-.3-.7l-5-5a1 1 0 0 0-1.4 0l-5 5a1 1 0 0 0-.3.7V19a1 1 0 0 0 1 1h2z" />
                        </svg>
                        {post.shares}
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
    </div>
  )
}
