'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CompactPostCreator } from './compact-post-creator'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Heart, MessageCircle, Share2, Clock, MapPin, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useArtist } from '@/contexts/artist-context'
import { normalizeMediaData, renderMediaContent } from '@/utils/media-utils'
import { LinkPreview, extractUrls, hasUrls } from '@/components/ui/link-preview'
import Link from 'next/link'

interface Post {
  id: string
  user_id: string
  content: string
  type: string
  visibility: string
  location: string | null
  hashtags: string[] | null
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  updated_at?: string
  media_urls?: string[]
  profiles?: {
    id?: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean
    account_context?: {
      type: string
      profile_id: string
      display_name: string
    }
  } | null
  user?: {
    id?: string
    username?: string | null
    full_name?: string | null
    avatar_url?: string | null
    is_verified?: boolean
    account_context?: {
      type: string
      profile_id: string
      display_name: string
    }
  } | null
  // Flag for demo posts
  isDemoPost?: boolean
  posted_as_account_type?: string
  posted_as_profile_id?: string
  account_type?: string
  is_liked?: boolean
}

// Helper function to generate profile URL based on account type and username
function getProfileUrl(profile: Post['profiles']) {
  if (!profile?.username) return '/profile/user'
  
  // For now, all profiles use the same route structure
  // In the future, we might want different routes for different account types
  // e.g., /artist/username, /venue/username, etc.
  return `/profile/${profile.username}`
}

export function StreamlinedFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [databaseConnected, setDatabaseConnected] = useState(false)
  
  // Use artist context instead of basic auth
  const { user, profile, isLoading: artistLoading, displayName, avatarInitial } = useArtist()
  

  const loadPosts = async () => {
    try {
      console.log('�� Loading posts from API...')
      
      // Use the API endpoint instead of direct Supabase calls
      const response = await fetch('/api/feed/posts?type=all&limit=20', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        console.error('❌ API Error:', result.error)
        throw new Error(result.error)
      }
      
      console.log('✅ API response received:', result.data?.length || 0, 'posts')
      setDatabaseConnected(true)
      
      const postsData = result.data || []
      
      // Transform posts to match our interface
      const transformedPosts = postsData.map((post: any) => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        type: post.type || 'text',
        visibility: post.visibility || 'public',
        location: post.location || null,
        hashtags: post.hashtags || [],
        likes_count: post.likes_count || post.like_count || 0,
        comments_count: post.comments_count || 0,
        shares_count: post.shares_count || 0,
        media_urls: post.media_urls || post.images || [],
        created_at: post.created_at,
        updated_at: post.updated_at,
        // Use the profile data from the API (which includes account context)
        profiles: post.profiles || post.user || {
          username: 'user',
          full_name: 'User',
          avatar_url: null,
          is_verified: false
        },
        user: post.user || post.profiles,
        // Preserve account context fields
        posted_as_account_type: post.posted_as_account_type,
        posted_as_profile_id: post.posted_as_profile_id,
        account_type: post.account_type,
        is_liked: post.is_liked || false
      }))
      
      console.log('📊 Transformed posts:', transformedPosts.length)
      setPosts(transformedPosts)
      
    } catch (error) {
      console.error('💥 Error loading posts:', error)
      
      // Fallback to demo mode on error
      console.log('🔌 API failed, entering demo mode')
      setDatabaseConnected(false)
      
      // Show demo post if no posts available
      if (posts.length === 0) {
        const demoPost: Post = {
          id: 'demo-1',
          user_id: 'demo-user',
          content: '🎵 Welcome to your feed! This is a demo post. Try creating your own post above! #music #tourify',
          type: 'text',
          visibility: 'public',
          location: 'Demo Location',
          hashtags: ['music', 'tourify'],
          likes_count: 5,
          comments_count: 2,
          shares_count: 1,
          created_at: new Date().toISOString(),
          profiles: {
            username: 'demo_user',
            full_name: 'Demo User',
            avatar_url: null,
            is_verified: false
          },
          isDemoPost: true,
          is_liked: false
        }
        setPosts([demoPost])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load profile information for posts that don't have it
  const loadProfilesForPosts = async (posts: Post[]) => {
    console.log('👥 Loading profile information for posts...')
    
    // Group posts by account type and user ID to avoid duplicate queries
    const postsNeedingProfiles: { [key: string]: Post[] } = {}
    
    for (const post of posts) {
      // Skip posts that already have proper profile info with account context
      if (post.profiles?.account_context?.type || post.user?.account_context?.type) {
        console.log(`✅ Post ${post.id} already has account context, skipping profile lookup`)
        continue
      }
      
      // Skip posts that have complete profile info
      if (post.profiles?.full_name && post.profiles?.full_name !== 'Anonymous User' && post.profiles?.full_name !== 'User') {
        console.log(`✅ Post ${post.id} already has complete profile info: ${post.profiles.full_name}`)
        continue
      }
      
      const key = `${post.user_id}`
      if (!postsNeedingProfiles[key]) {
        postsNeedingProfiles[key] = []
      }
      postsNeedingProfiles[key].push(post)
    }
    
    // Load profiles for posts that need them
    for (const [userId, userPosts] of Object.entries(postsNeedingProfiles)) {
      console.log(`👤 Loading profile for user ${userId}`)
      
      // Check if any of these posts have account context info
      const samplePost = userPosts[0]
      const accountType = samplePost.posted_as_account_type || samplePost.account_type
      const profileId = samplePost.posted_as_profile_id
      
      let profileInfo: any = null
      
      if (accountType === 'artist' && profileId) {
        console.log('🎨 Loading artist profile for post display')
        const { data: artistProfile } = await supabase
          .from('artist_profiles')
          .select('id, stage_name, artist_name, profile_image_url, is_verified')
          .eq('id', profileId)
          .single()
        
        if (artistProfile) {
          profileInfo = {
            id: artistProfile.id,
            username: artistProfile.stage_name?.toLowerCase().replace(/\s+/g, '') || 'artist',
            full_name: artistProfile.stage_name || artistProfile.artist_name || 'Artist',
            avatar_url: artistProfile.profile_image_url || '',
            is_verified: artistProfile.is_verified || false,
            account_type: 'artist',
            account_context: {
              type: 'artist',
              profile_id: artistProfile.id,
              display_name: artistProfile.stage_name || artistProfile.artist_name
            }
          }
        }
      } else if (accountType === 'venue' && profileId) {
        console.log('🏢 Loading venue profile for post display')
        const { data: venueProfile } = await supabase
          .from('venue_profiles')
          .select('id, name, logo_url, is_verified')
          .eq('id', profileId)
          .single()
        
        if (venueProfile) {
          profileInfo = {
            id: venueProfile.id,
            username: venueProfile.name?.toLowerCase().replace(/\s+/g, '') || 'venue',
            full_name: venueProfile.name || 'Venue',
            avatar_url: venueProfile.logo_url || '',
            is_verified: venueProfile.is_verified || false,
            account_type: 'venue',
            account_context: {
              type: 'venue',
              profile_id: venueProfile.id,
              display_name: venueProfile.name
            }
          }
        }
      } else if (accountType === 'business' && profileId) {
        console.log('🏬 Loading business profile for post display')
        const { data: businessProfile } = await supabase
          .from('business_profiles')
          .select('id, name, logo_url, is_verified')
          .eq('id', profileId)
          .single()
        
        if (businessProfile) {
          profileInfo = {
            id: businessProfile.id,
            username: businessProfile.name?.toLowerCase().replace(/\s+/g, '') || 'business',
            full_name: businessProfile.name || 'Business',
            avatar_url: businessProfile.logo_url || '',
            is_verified: businessProfile.is_verified || false,
            account_type: 'business',
            account_context: {
              type: 'business',
              profile_id: businessProfile.id,
              display_name: businessProfile.name
            }
          }
        }
      } else {
        // Primary account - load general profile
        console.log('👤 Loading primary account profile for post display')
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified, metadata')
          .eq('id', userId)
          .single()
        
        if (profile) {
          profileInfo = {
            id: profile.id,
            username: profile.metadata?.username || profile.username || 'user',
            full_name: profile.metadata?.full_name || profile.full_name || 'User',
            avatar_url: profile.avatar_url || '',
            is_verified: profile.is_verified || false,
            account_type: 'primary',
            account_context: {
              type: 'primary',
              profile_id: profile.id,
              display_name: profile.metadata?.full_name || profile.full_name
            }
          }
        }
      }
      
      if (profileInfo) {
        console.log(`✅ Loaded profile info for ${userId}:`, profileInfo.full_name)
        
        // Update all posts for this user
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.user_id === userId ? {
              ...post,
              profiles: profileInfo,
              user: profileInfo
            } : post
          )
        )
      }
    }
  }

  const handlePostCreated = (newPost: Post) => {
    console.log('New post created:', newPost)
    
    // Add the new post to the beginning of the feed
    setPosts(prev => [newPost, ...prev])
    
    // Remove demo posts if we're now getting real posts
    if (!newPost.isDemoPost) {
      setPosts(prev => prev.filter(post => !post.isDemoPost))
    }
    
    // If the new post doesn't have proper profile info, load it
    if (newPost.profiles?.full_name === 'Anonymous User' || newPost.profiles?.full_name === 'User' || !newPost.profiles?.full_name) {
      setTimeout(() => {
        loadProfilesForPosts([newPost]).then(() => {
          console.log('✅ Updated profile info for new post')
        })
      }, 100)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPosts()
  }

  const handleLike = async (postId: string) => {
    if (!user) return

    try {
      const currentPost = posts.find(p => p.id === postId)
      if (!currentPost) return

      const isCurrentlyLiked = currentPost.is_liked
      const action = isCurrentlyLiked ? 'unlike' : 'like'

      // Optimistic update
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !post.is_liked,
              likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ))

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
      // Revert on error
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !post.is_liked,
              likes_count: post.is_liked ? post.likes_count + 1 : post.likes_count - 1
            }
          : post
      ))
      console.error('Error toggling like:', error)
    }
  }

  useEffect(() => {
    if (!artistLoading) {
      loadPosts()
    }
  }, [artistLoading])

  // Subscribe to real-time updates if database is connected
  useEffect(() => {
    if (!databaseConnected) return

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, (payload) => {
        console.log('Real-time post received:', payload.new)
        setPosts(prev => {
          const exists = prev.find(post => post.id === payload.new.id)
          if (!exists && payload.new.visibility === 'public') {
            return [payload.new as Post, ...prev]
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [databaseConnected])

  if (loading || artistLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading feed...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Compact Post Creator - Pass artist context */}
      <CompactPostCreator 
        onPostCreated={handlePostCreated}
        artistUser={user}
        artistProfile={profile}
        displayName={displayName}
        avatarInitial={avatarInitial}
      />

      {/* Database Status */}
      {!databaseConnected && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <div className="text-amber-400 text-sm">
            <strong>Demo Mode:</strong> Database tables not found. Posts will be simulated until database is set up.
          </div>
        </div>
      )}

      {/* Authentication Status for Artist */}
      {!user && !artistLoading && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="text-blue-400 text-sm">
            <strong>Artist Account Required:</strong> Please complete your artist profile setup to start posting.
          </div>
        </div>
      )}

      {/* Debug Info for Multi-Account */}
      {user && profile && process.env.NODE_ENV === 'development' && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
          <div className="text-purple-400 text-xs">
            <strong>Debug:</strong> Authenticated as {displayName} (Artist ID: {profile.id})
          </div>
        </div>
      )}

      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Recent Posts</h2>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Posts */}
      <AnimatePresence mode="popLayout">
        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
              <div className="text-slate-400 space-y-2">
                <p className="text-lg font-medium">No posts yet</p>
                <p className="text-sm">Share your first post above to get started!</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 rounded-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Link href={getProfileUrl(post.profiles)} className="flex-shrink-0">
                        <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all duration-200">
                          <AvatarImage src={post.profiles?.avatar_url || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                            {post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                            <h4 className="font-semibold text-white">
                              {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                            </h4>
                          </Link>
                          {post.profiles?.username && (
                            <Link href={getProfileUrl(post.profiles)} className="hover:underline">
                              <span className="text-slate-400 text-sm">@{post.profiles.username}</span>
                            </Link>
                          )}
                          {post.isDemoPost && (
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                              Demo
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                          {post.location && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{post.location}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Content */}
                    <p className="text-slate-200 leading-relaxed">
                      {post.content}
                    </p>

                    {/* Link Preview for URLs in content */}
                    {hasUrls(post.content) && (
                      <LinkPreview 
                        url={extractUrls(post.content)[0]} 
                        className="mt-2"
                      />
                    )}

                    {/* Media display */}
                    {(() => {
                      const mediaItems = normalizeMediaData(post)
                      return renderMediaContent(mediaItems)
                    })()}

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.hashtags.map((hashtag) => (
                          <Badge
                            key={hashtag}
                            variant="secondary"
                            className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer text-xs"
                          >
                            #{hashtag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Engagement Stats & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {post.likes_count > 0 && (
                          <span>{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</span>
                        )}
                        {post.comments_count > 0 && (
                          <span>{post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}</span>
                        )}
                        {post.shares_count > 0 && (
                          <span>{post.shares_count} {post.shares_count === 1 ? 'share' : 'shares'}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-7 px-2"
                          onClick={() => handleLike(post.id)}
                        >
                          <Heart className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 h-7 px-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-green-400 hover:bg-green-500/10 h-7 px-2"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
} 