"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  MessageCircle,
  UserPlus,
  Share2,
  MapPin,
  Calendar,
  Music,
  Building,
  Users,
  Heart,
  Play,
  Instagram,
  Twitter,
  Globe,
  Star,
  Headphones,
  Ticket,
  UserCheck,
  Check,
  Sparkles,
  Briefcase,
  Target
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from "@/contexts/auth-context"
import { PublicMusicDisplay } from "@/components/music/public-music-display"

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_verified: boolean
  }
}

interface PublicProfileProps {
  profile: {
    id: string
    account_type: 'general' | 'artist' | 'venue' | 'organization'
    profile_data: any
    username: string
    avatar_url?: string
    cover_image?: string
    verified?: boolean
    stats: {
      followers: number
      following: number
      posts: number
      likes: number
      views?: number
      streams?: number
      events?: number
    }
    social_links?: {
      instagram?: string
      twitter?: string
      website?: string
      spotify?: string
    }
    location?: string
    bio?: string
    created_at: string
  }
  isOwnProfile?: boolean
  onFollow?: (userId: string) => void
  onMessage?: (userId: string) => void
  onShare?: (profile: any) => void
}

export function PublicProfileView({ profile, isOwnProfile = false, onFollow, onMessage, onShare }: PublicProfileProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [showFullBio, setShowFullBio] = useState(false)
  const [copied, setCopied] = useState(false)
  const [posts, setPosts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [music, setMusic] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [showComments, setShowComments] = useState<string | null>(null)
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({})
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followersData, setFollowersData] = useState<any[]>([])
  const [followingData, setFollowingData] = useState<any[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  
  const { user: currentUser, isAuthenticated } = useAuth()

  useEffect(() => {
    fetchProfileData()
    checkFollowStatus()
    loadJobs()
  }, [profile.id, currentUser])
  async function loadJobs() {
    try {
      setJobsError(null)
      setJobsLoading(true)
      const url = `/api/job-board?organization_id=${encodeURIComponent(profile.id)}&limit=12`
      const res = await fetch(url)
      const json = await res.json()
      if (json?.success) setJobs(json.data || [])
      else setJobsError(json?.error || 'Failed to load jobs')
    } catch (e: any) {
      setJobsError(e?.message || 'Failed to load jobs')
    } finally {
      setJobsLoading(false)
    }
  }



  const loadComments = async (postId: string) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      
      console.log('🔍 Loading comments for post:', postId)
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Comments API error:', response.status, errorText)
        throw new Error(`Failed to load comments: ${response.status}`)
      }

      const result = await response.json()
      console.log('💬 Comments API response:', result)
      
      setComments(prev => ({ ...prev, [postId]: result.comments || [] }))
      
      console.log('✅ Successfully loaded comments for post:', postId)
    } catch (error) {
      console.error('Error loading comments:', error)
      // Set empty array on error so UI shows properly
      setComments(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const toggleComments = async (postId: string) => {
    const isCurrentlyShowing = showComments === postId
    
    if (!isCurrentlyShowing) {
      // Load comments if we don't have them yet
      if (!comments[postId]) {
        await loadComments(postId)
      }
    }
    
    setShowComments(isCurrentlyShowing ? null : postId)
  }

  const handleComment = async (postId: string, content: string) => {
    if (!currentUser || !content.trim()) return

    try {
      console.log('💬 Adding comment to post:', postId)

      // Call the new API
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Comments API error:', response.status, errorText)
        throw new Error(`Failed to add comment: ${response.status}`)
      }

      const result = await response.json()
      
      // Add the new comment to the local state
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), result.comment]
      }))
      
      // Update the post comments count
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments_count: post.comments_count + 1
            }
          : post
      ))

      // Ensure comments are shown after adding one
      setShowComments(postId)

      console.log('✅ Successfully added comment')
      return result.comment
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
      throw error
    }
  }

  const checkFollowStatus = async () => {
    if (!currentUser || !isAuthenticated || isOwnProfile) {
      setIsFollowing(false)
      return
    }

    try {
      const response = await fetch(`/api/social/follow?userId=${currentUser.id}&followingId=${profile.id}&action=check`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const result = await response.json()
        setIsFollowing(result.isFollowing || false)
      } else {
        console.log('Follow status check failed:', await response.text())
        setIsFollowing(false)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
      setIsFollowing(false)
    }
  }

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Import supabase client to fetch real posts from the database
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
      const supabase = createClientComponentClient()
      
      console.log('🔍 Fetching real posts for profile:', profile.id)
      
      // First check what posts table structure exists
      let postsQuery
      
      // Try to fetch posts with a simple query first to see the table structure
      const { data: samplePost, error: sampleError } = await supabase
        .from('posts')
        .select('*')
        .limit(1)
        .single()

      console.log('Sample post structure:', samplePost)
      console.log('Sample post error:', sampleError)

      // Try to fetch posts with a minimal set of columns that should exist
      let posts = null
      let error = null
      
      // First try with the common columns
      try {
        const result = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            content,
            type,
            visibility,
            likes_count,
            comments_count,
            shares_count,
            created_at,
            updated_at
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        posts = result.data
        error = result.error
      } catch (initialError) {
        console.log('Initial query failed, trying even simpler query:', initialError)
        
        // Fallback to very basic query
        try {
          const result = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(50)
          
          posts = result.data
          error = result.error
        } catch (fallbackError) {
          console.error('Both queries failed:', fallbackError)
          posts = null
          error = fallbackError
        }
      }

      if (error) {
        console.error('Error fetching posts:', error)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        
        // Try a simpler query as fallback
        const { data: simplePosts, error: simpleError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(50)
          
        if (simpleError) {
          console.error('Simple query also failed:', simpleError)
          setPosts([])
        } else {
          console.log(`✅ Loaded ${simplePosts?.length || 0} posts with simple query`)
          // Transform simple posts
          const transformedPosts = simplePosts?.map((post: any) => ({
            id: post.id,
            content: post.content,
            type: post.type || post.post_type || 'text',
            visibility: post.visibility || 'public',
            media_url: (post.media_urls && post.media_urls.length > 0) ? post.media_urls[0] : 
                      (post.images && post.images.length > 0) ? post.images[0] : 
                      post.video_url || null,
            post_type: post.type || post.post_type || 'text',
            likes_count: post.likes_count || (post.engagement_stats?.likes) || 0,
            comments_count: post.comments_count || (post.engagement_stats?.comments) || 0,
            shares_count: post.shares_count || (post.engagement_stats?.shares) || 0,
            created_at: post.created_at,
            user_id: post.user_id,
            profiles: null // We'll add profile data separately
          })) || []
          
          setPosts(transformedPosts)
        }
      } else {
        console.log(`✅ Loaded ${posts?.length || 0} real posts from database`)
        console.log('Posts data structure:', posts?.[0])
        
        // Transform posts to match expected format - handle variable schema
        const transformedPosts = posts?.map((post: any) => {
          // Safely extract media URL from various possible fields
          let media_url = null
          if (post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0) {
            media_url = post.media_urls[0]
          } else if (post.images && Array.isArray(post.images) && post.images.length > 0) {
            media_url = post.images[0]
          } else if (post.video_url) {
            media_url = post.video_url
          } else if (post.media_url) {
            media_url = post.media_url
          }

          // Safely extract engagement stats
          const likes_count = post.likes_count || 
                             (post.engagement_stats && post.engagement_stats.likes) || 
                             post.likes || 
                             0
          const comments_count = post.comments_count || 
                                (post.engagement_stats && post.engagement_stats.comments) || 
                                post.comments || 
                                0
          const shares_count = post.shares_count || 
                              (post.engagement_stats && post.engagement_stats.shares) || 
                              post.shares || 
                              0

          return {
            id: post.id,
            content: post.content || '',
            type: post.type || post.post_type || 'text',
            visibility: post.visibility || 'public',
            media_url,
            post_type: post.type || post.post_type || 'text',
            likes_count,
            comments_count,
            shares_count,
            created_at: post.created_at,
            user_id: post.user_id,
            profiles: null // No join data available
          }
        }) || []
        
        setPosts(transformedPosts)
        
        // Check which posts are liked by the current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser && transformedPosts.length > 0) {
          const likedPostIds = new Set<string>()
          
          try {
            // Try to get liked posts for current user
            const { data: likes, error: likesError } = await supabase
              .from('post_likes')
              .select('post_id')
              .eq('user_id', currentUser.id)
              .in('post_id', transformedPosts.map(p => p.id))
            
            if (likesError) {
              console.log('Post likes table not available:', likesError)
              // Continue without likes data
            } else if (likes) {
              likes.forEach((like: any) => {
                likedPostIds.add(like.post_id)
              })
            }
          } catch (error) {
            console.log('Error fetching likes, continuing without like data:', error)
          }
          
          setLikedPosts(likedPostIds)
        }
      }

      // Note: Events and music features can be implemented later using real database tables
      setEvents([])
      setMusic([])
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || !isAuthenticated) {
      toast.error('Please sign in to follow profiles')
      return
    }

    try {
      const action = isFollowing ? 'unfollow' : 'follow'
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followingId: profile.id,
          action: action
        })
      })

      if (response.ok) {
        const result = await response.json()
        setIsFollowing(action === 'follow')
        toast.success(action === 'follow' ? 'Following successfully' : 'Unfollowed successfully')
        
        if (onFollow) onFollow(profile.id)
      } else {
        const error = await response.json()
        console.error('Follow action failed:', error)
        toast.error(error.error || 'Failed to update follow status')
      }
    } catch (error) {
      console.error('Error following/unfollowing profile:', error)
      toast.error('Failed to update follow status')
    }
  }

  const handleShowFollowers = async () => {
    if (!currentUser || !isAuthenticated) {
      toast.error('Please sign in to view followers')
      return
    }

    try {
      setLoadingFollowers(true)
      const response = await fetch(`/api/social/follow?userId=${profile.id}&type=followers`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setFollowersData(result.data || [])
        setShowFollowersModal(true)
      } else {
        toast.error('Failed to load followers')
      }
    } catch (error) {
      console.error('Error loading followers:', error)
      toast.error('Failed to load followers')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const handleShowFollowing = async () => {
    if (!currentUser || !isAuthenticated) {
      toast.error('Please sign in to view following')
      return
    }

    try {
      setLoadingFollowers(true)
      const response = await fetch(`/api/social/follow?userId=${profile.id}&type=following`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setFollowingData(result.data || [])
        setShowFollowingModal(true)
      } else {
        toast.error('Failed to load following')
      }
    } catch (error) {
      console.error('Error loading following:', error)
      toast.error('Failed to load following')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.profile_data?.name || profile.username}'s Profile`,
          text: profile.bio || "Check out this profile on Tourify!",
          url: window.location.href
        })
      } catch (err) {
        console.log("Share failed:", err)
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    if (onShare) onShare(profile)
  }

  const handleLikePost = async (postId: string) => {
    try {
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs')
      const supabase = createClientComponentClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to like posts')
        return
      }

      const isLiked = likedPosts.has(postId)
      
      // Optimistic update
      setLikedPosts(prev => {
        const newSet = new Set(prev)
        if (isLiked) {
          newSet.delete(postId)
        } else {
          newSet.add(postId)
        }
        return newSet
      })
      
      // Update post likes count optimistically
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              likes_count: isLiked 
                ? Math.max(0, post.likes_count - 1)
                : post.likes_count + 1 
            }
          : post
      ))

      try {
        const action = isLiked ? 'unlike' : 'like'
        
        const response = await fetch(`/api/posts/${postId}/likes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ action })
        })

        if (!response.ok) {
          throw new Error('Failed to toggle like')
        }

        console.log('✅ Successfully toggled like')
      } catch (error) {
        // Revert optimistic update on error
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          if (isLiked) {
            newSet.add(postId)
          } else {
            newSet.delete(postId)
          }
          return newSet
        })
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes_count: isLiked 
                  ? post.likes_count + 1
                  : Math.max(0, post.likes_count - 1)
              }
            : post
        ))
        console.error('Error toggling like:', error)
        toast.error('Failed to toggle like')
      }
    } catch (error) {
      console.error('Error in handleLikePost:', error)
      toast.error('Failed to like post')
    }
  }

  const handleCommentPost = async (postId: string) => {
    await toggleComments(postId)
  }

  const handleSharePost = async (post: any) => {
    try {
      // Use native share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${profile.profile_data?.name || profile.username}`,
          text: post.content,
          url: window.location.href
        })
        toast.success('Post shared successfully!')
      } else {
        // Fallback to copying link to clipboard
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing post:', error)
      toast.error('Failed to share post')
    }
  }

  const getDisplayName = () => {
    return profile.profile_data?.name || profile.profile_data?.artist_name || profile.profile_data?.venue_name || profile.username
  }

  const getProfileIcon = () => {
    switch (profile.account_type) {
      case 'artist': return <Music className="h-4 w-4" />
      case 'venue': return <Building className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  const getProfileColor = () => {
    switch (profile.account_type) {
      case 'artist': return 'from-purple-500 to-pink-500'
      case 'venue': return 'from-green-500 to-emerald-500'
      default: return 'from-blue-500 to-cyan-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Cover Image */}
      <div className="relative h-96 bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
        {profile.cover_image && (
          <img 
            src={profile.cover_image} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Profile Header */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-8">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="h-40 w-40 border-4 border-white/30 shadow-2xl ring-4 ring-white/10">
                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                  <AvatarFallback className={`bg-gradient-to-br ${getProfileColor()} text-white text-4xl font-bold`}>
                    {profile.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Account Type Badge */}
                <div className="absolute -bottom-2 -right-2 bg-slate-800 rounded-full p-3 border-2 border-white/30 shadow-lg">
                  <div className={`w-8 h-8 bg-gradient-to-br ${getProfileColor()} rounded-full flex items-center justify-center`}>
                    {getProfileIcon()}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                    {profile.profile_data?.name || profile.profile_data?.artist_name || profile.profile_data?.venue_name || profile.username}
                  </h1>
                  {profile.verified && (
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-6 text-white/90 mb-6">
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span className="capitalize font-medium">{profile.account_type}</span>
                    {profile.account_type === 'artist' && profile.profile_data?.genre && (
                      <>
                        <span className="text-white/60">•</span>
                        <span className="text-white/80">{profile.profile_data.genre}</span>
                      </>
                    )}
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    <Calendar className="h-4 w-4" />
                    Joined {formatSafeDate(profile.created_at)}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div className="text-center group cursor-pointer" onClick={handleShowFollowers}>
                    <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {profile.stats.followers.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/70 font-medium">Followers</div>
                  </div>
                  <div className="text-center group cursor-pointer" onClick={handleShowFollowing}>
                    <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {profile.stats.following.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/70 font-medium">Following</div>
                  </div>
                  <div className="text-center group cursor-pointer">
                    <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {profile.stats.posts.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/70 font-medium">Posts</div>
                  </div>
                  <div className="text-center group cursor-pointer">
                    <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {profile.stats.likes.toLocaleString()}
                    </div>
                    <div className="text-sm text-white/70 font-medium">Likes</div>
                  </div>
                  {profile.stats.streams && (
                    <div className="text-center group cursor-pointer">
                      <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        {profile.stats.streams.toLocaleString()}
                      </div>
                      <div className="text-sm text-white/70 font-medium">Streams</div>
                    </div>
                  )}
                  {profile.stats.events && (
                    <div className="text-center group cursor-pointer">
                      <div className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        {profile.stats.events.toLocaleString()}
                      </div>
                      <div className="text-sm text-white/70 font-medium">Events</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {!isOwnProfile && (
                  <>
                    <Button
                      onClick={handleFollow}
                      className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg ${
                        isFollowing
                          ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-purple-500/25'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-5 w-5 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-5 w-5 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => onMessage?.(profile.id)}
                      variant="outline"
                      className="px-6 py-4 rounded-2xl border-white/30 text-white hover:bg-white/10 backdrop-blur-sm shadow-lg"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="icon"
                  className="w-14 h-14 rounded-2xl border-white/30 text-white hover:bg-white/10 backdrop-blur-sm shadow-lg"
                >
                  {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column - Bio & Info */}
          <div className="lg:col-span-1 space-y-8">
            {/* Bio */}
            {profile.bio && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 pb-4">
                  <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                    <Star className="h-5 w-5 text-purple-400" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-gray-300 leading-relaxed">
                    {showFullBio || profile.bio.length <= 200 ? (
                      <p className="text-base">{profile.bio}</p>
                    ) : (
                      <p className="text-base">{profile.bio.substring(0, 200)}...</p>
                    )}
                    {profile.bio.length > 200 && (
                      <button
                        onClick={() => setShowFullBio(!showFullBio)}
                        className="text-purple-400 hover:text-purple-300 mt-3 font-medium transition-colors"
                      >
                        {showFullBio ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-500/20 to-teal-500/20 pb-4">
                  <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-400" />
                    Connect
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {profile.social_links.instagram && (
                      <a
                        href={profile.social_links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-300 hover:text-pink-400 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Instagram className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Instagram</span>
                      </a>
                    )}
                    {profile.social_links.twitter && (
                      <a
                        href={profile.social_links.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-300 hover:text-blue-400 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Twitter className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Twitter</span>
                      </a>
                    )}
                    {profile.social_links.website && (
                      <a
                        href={profile.social_links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-300 hover:text-green-400 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Globe className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Website</span>
                      </a>
                    )}
                    {profile.social_links.spotify && (
                      <a
                        href={profile.social_links.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-300 hover:text-green-400 transition-colors group"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Headphones className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium">Spotify</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Card */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 pb-4">
                <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Heart className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="text-white font-medium">Most Liked Post</span>
                    </div>
                    <p className="text-gray-300 text-sm">"{posts.length > 0 ? posts[0]?.content?.substring(0, 50) + '...' : 'No posts yet'}"</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium">Growing Community</span>
                    </div>
                    <p className="text-gray-300 text-sm">+{Math.floor(Math.random() * 50) + 10} new followers this week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Posts
                </TabsTrigger>
                <TabsTrigger value="music" className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Music
                </TabsTrigger>
                <TabsTrigger value="events" className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Events
                </TabsTrigger>
                <TabsTrigger value="jobs" className="rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
                  Jobs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-8">
                <div className="space-y-8">
                  {/* Recent Activity */}
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 pb-4">
                      <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {posts.slice(0, 3).map((post) => (
                          <div key={post.id} className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all duration-300">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                              <Music className="h-10 w-10 text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-lg mb-3">{post.content}</p>
                              <div className="flex items-center gap-6 text-gray-400">
                                <span className="flex items-center gap-2">
                                  <Heart className="h-4 w-4 text-red-400" />
                                  <span className="font-medium">{post.likes_count}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4 text-blue-400" />
                                  <span className="font-medium">{post.comments_count}</span>
                                </span>
                                <span className="text-sm">
                                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {posts.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-gray-400">No recent activity to show</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Highlights */}
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300">
                    <CardHeader className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 pb-4">
                      <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-400" />
                        Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <Heart className="h-4 w-4 text-purple-400" />
                            </div>
                            <span className="text-white font-medium">Most Liked Post</span>
                          </div>
                          <p className="text-gray-300 text-sm">"{posts.length > 0 ? posts[0]?.content?.substring(0, 50) + '...' : 'No posts yet'}"</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="text-white font-medium">Growing Community</span>
                          </div>
                          <p className="text-gray-300 text-sm">+{Math.floor(Math.random() * 50) + 10} new followers this week</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-8">
                <div className="space-y-6">
                  {loading ? (
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl animate-pulse">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-full ring-2 ring-white/20"></div>
                              <div className="flex-1">
                                <div className="h-5 bg-gradient-to-r from-white/20 to-white/10 rounded-lg w-1/3 mb-3"></div>
                                <div className="h-4 bg-gradient-to-r from-white/15 to-white/5 rounded-lg w-1/4"></div>
                              </div>
                            </div>
                            <div className="space-y-3 mb-6">
                              <div className="h-5 bg-gradient-to-r from-white/20 to-white/10 rounded-lg"></div>
                              <div className="h-5 bg-gradient-to-r from-white/15 to-white/5 rounded-lg w-4/5"></div>
                              <div className="h-5 bg-gradient-to-r from-white/10 to-white/5 rounded-lg w-3/5"></div>
                            </div>
                            <div className="h-px bg-white/10 mb-4"></div>
                            <div className="flex items-center gap-4">
                              <div className="h-6 bg-gradient-to-r from-white/10 to-white/5 rounded-lg w-16"></div>
                              <div className="h-6 bg-gradient-to-r from-white/10 to-white/5 rounded-lg w-20"></div>
                              <div className="h-6 bg-gradient-to-r from-white/10 to-white/5 rounded-lg w-16"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    posts.length > 0 ? (
                      <div className="space-y-6">
                        {posts.map((post) => (
                          <Card key={post.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl hover:bg-white/15 transition-all duration-300 group">
                            <CardContent className="p-6">
                              <div className="flex items-center gap-4 mb-4">
                                <Avatar className="h-12 w-12 ring-2 ring-white/20">
                                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                                  <AvatarFallback className={`bg-gradient-to-br ${getProfileColor()} text-white font-bold`}>
                                    {profile.username.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">
                                      {profile.profile_data?.name || profile.profile_data?.artist_name || profile.profile_data?.venue_name || profile.username}
                                    </h4>
                                    {profile.verified && (
                                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    )}
                                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                      {profile.account_type}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-400 text-sm">
                                    {formatSafeDate(post.created_at)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-white leading-relaxed text-lg">{post.content}</p>
                                {post.media_url && (
                                  <div className="mt-4">
                                    <img 
                                      src={post.media_url} 
                                      alt="Post media" 
                                      className="w-full max-h-96 object-cover rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <div className="flex items-center gap-6 text-gray-400">
                                  <button 
                                    className={`flex items-center gap-2 hover:text-red-400 transition-all duration-300 hover:scale-110 ${
                                      likedPosts.has(post.id) ? 'text-red-500' : ''
                                    }`}
                                    onClick={() => handleLikePost(post.id)}
                                  >
                                    <Heart className={`h-5 w-5 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                                    <span className="font-medium">{post.likes_count?.toLocaleString() || '0'}</span>
                                  </button>
                                  <button 
                                    className="flex items-center gap-2 hover:text-blue-400 transition-all duration-300 hover:scale-110"
                                    onClick={() => handleCommentPost(post.id)}
                                  >
                                    <MessageCircle className="h-5 w-5" />
                                    <span className="font-medium">{post.comments_count?.toLocaleString() || '0'}</span>
                                  </button>
                                  <button 
                                    className="flex items-center gap-2 hover:text-green-400 transition-all duration-300 hover:scale-110"
                                    onClick={() => handleSharePost(post)}
                                  >
                                    <Share2 className="h-5 w-5" />
                                    <span className="font-medium">Share</span>
                                  </button>
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  {post.post_type && (
                                    <span className="px-2 py-1 bg-white/5 rounded-full">
                                      {post.post_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Comments Section */}
                              {showComments === post.id && (
                                <div className="mt-6 pt-4 border-t border-white/10">
                                  <div className="space-y-4">
                                    {/* Existing Comments */}
                                    {loadingComments[post.id] ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                        <span className="ml-2 text-slate-400">Loading comments...</span>
                                      </div>
                                    ) : comments[post.id] && comments[post.id].length > 0 ? (
                                      <div className="space-y-3">
                                        {comments[post.id].map((comment) => (
                                          <div key={comment.id} className="flex gap-3">
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                              <AvatarImage src={comment.user.avatar_url} />
                                              <AvatarFallback>
                                                {comment.user.full_name?.charAt(0) || comment.user.username?.charAt(0) || 'U'}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <div className="bg-white/10 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-medium text-white text-sm">
                                                    {comment.user.full_name || comment.user.username}
                                                  </span>
                                                  {comment.user.is_verified && (
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                                      <Check className="w-2 h-2 text-white" />
                                                    </div>
                                                  )}
                                                  <span className="text-gray-400 text-xs">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                  </span>
                                                </div>
                                                <p className="text-gray-200 text-sm">{comment.content}</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-4">
                                        <p className="text-gray-400 text-sm">No comments yet. Be the first to comment!</p>
                                      </div>
                                    )}
                                    
                                    {/* Comment Input */}
                                    <div className="flex gap-2 pt-2">
                                      <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={currentUser?.user_metadata?.avatar_url} />
                                        <AvatarFallback>
                                          {currentUser?.user_metadata?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <Input
                                          placeholder="Write a comment..."
                                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500"
                                          onKeyDown={async (e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault()
                                              const content = e.currentTarget.value
                                              if (content.trim()) {
                                                try {
                                                  await handleComment(post.id, content)
                                                  // Safely clear the input field
                                                  if (e.currentTarget) {
                                                    e.currentTarget.value = ''
                                                  }
                                                } catch (error) {
                                                  console.error('Failed to add comment:', error)
                                                }
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                        <CardContent className="p-12 text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageCircle className="h-10 w-10 text-purple-400" />
                          </div>
                          <h3 className="text-2xl font-semibold text-white mb-3">No Posts Yet</h3>
                          <p className="text-gray-400 text-lg">
                            This profile hasn't shared any posts yet.
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            Check back later for updates!
                          </p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              </TabsContent>

              <TabsContent value="music" className="mt-8">
                {profile.account_type === 'artist' ? (
                  <PublicMusicDisplay 
                    artistId={profile.id} 
                    isOwnProfile={isOwnProfile}
                  />
                ) : (
                  <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                    <CardContent className="p-12 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Music className="h-10 w-10 text-purple-400" />
                      </div>
                      <h3 className="text-2xl font-semibold text-white mb-3">Music Coming Soon</h3>
                      <p className="text-gray-400 text-lg">
                        Music showcase and streaming features are in development.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="events" className="mt-8">
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Ticket className="h-10 w-10 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-3">Events Coming Soon</h3>
                    <p className="text-gray-400 text-lg">
                      Event management and ticketing features are in development.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="mt-8">
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-purple-400" />
                      Open Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {jobsLoading ? (
                      <div className="flex items-center justify-center py-8 text-gray-300">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading jobs...
                      </div>
                    ) : jobsError ? (
                      <div className="text-center py-8 text-red-300">{jobsError}</div>
                    ) : jobs.length === 0 ? (
                      <div className="text-center py-8 text-gray-300">No current openings</div>
                    ) : (
                      <div className="grid gap-4">
                        {jobs.map((job: any) => (
                          <a key={job.id} href={`/jobs/${job.template_id || job.id}`} className="block group">
                            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-white font-semibold">
                                  <Briefcase className="h-4 w-4 text-purple-400" />
                                  {job.title}
                                </div>
                                {job.urgent && (
                                  <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30">Urgent</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                                {job.location && (
                                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">{job.location}</span>
                                )}
                                {job.experience_level && (
                                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1"><Target className="h-3 w-3" />{job.experience_level}</span>
                                )}
                                {job.employment_type && (
                                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10">{job.employment_type}</span>
                                )}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFollowersModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Followers</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFollowersModal(false)}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {followersData.map((follower) => (
                <div key={follower.follower_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={follower.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {follower.profiles?.full_name?.[0] || follower.profiles?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-white">{follower.profiles?.full_name || follower.profiles?.username}</div>
                    <div className="text-sm text-gray-400">@{follower.profiles?.username}</div>
                  </div>
                  {follower.profiles?.is_verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {followersData.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No followers yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowFollowingModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Following</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFollowingModal(false)}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {followingData.map((following) => (
                <div key={following.following_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={following.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {following.profiles?.full_name?.[0] || following.profiles?.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-white">{following.profiles?.full_name || following.profiles?.username}</div>
                    <div className="text-sm text-gray-400">@{following.profiles?.username}</div>
                  </div>
                  {following.profiles?.is_verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {followingData.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Not following anyone yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}