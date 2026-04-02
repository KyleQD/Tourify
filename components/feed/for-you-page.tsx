'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Music2,
  Calendar,
  Video,
  MapPin,
  FileText,
  Play,
  Heart,
  Share2,
  MessageCircle,
  Clock,
  Star,
  Eye,
  ExternalLink,
  Bookmark,
  BookmarkPlus,
  X,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Search,
  Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import { ThreadCardV2 } from '@/components/forums/thread-card-v2'
import { ThreadComposerV2 } from '@/components/forums/thread-composer-v2'
import { FeedMusicPlayer } from '@/components/feed/feed-music-player'
import { FeedVideoPlayer } from '@/components/feed/feed-video-player'
import { StartConversationButton } from '@/components/feed/start-conversation-button'


interface ContentItem {
  id: string
  type: 'music' | 'event' | 'video' | 'tour' | 'news' | 'blog' | 'forum'
  title: string
  description?: string
  author?: {
    id: string
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
  cover_image?: string
  created_at: string
  engagement: {
    likes: number
    views: number
    shares: number
    comments: number
  }
  metadata?: {
    genre?: string
    duration?: number
    location?: string
    date?: string
    venue?: string
    capacity?: number
    ticket_price?: number
    url?: string
    tags?: string[]
    forum?: {
      id: string
      name: string
      slug: string
    }
    user_vote?: number
  }
  is_liked?: boolean
  is_following?: boolean
  relevance_score?: number
  positiveScore?: number
  is_bookmarked?: boolean
}

export function ForYouPage() {
  const [content, setContent] = useState<ContentItem[]>([
    // Add a hardcoded blog post for testing
    {
      id: 'test-blog-1',
      type: 'blog',
      title: 'The Future of Independent Music',
      description: 'Exploring how independent artists are reshaping the music industry through digital platforms and direct fan engagement.',
      author: {
        id: 'test-author-1',
        name: 'Sarah Johnson',
        username: 'sarahjohnson',
        avatar_url: 'https://dummyimage.com/150x150/8b5cf6/ffffff?text=SJ',
        is_verified: false
      },
      cover_image: 'https://dummyimage.com/800x400/8b5cf6/ffffff?text=The+Future+of+Independent+Music',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      engagement: { likes: 89, views: 1247, shares: 45, comments: 23 },
      metadata: {
        url: '/blog/the-future-of-independent-music',
        tags: ['Independent Music', 'Digital Age', 'Music Industry']
        // reading_time: 14
      },
      relevance_score: 0.95
    }
  ])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [sortBy, setSortBy] = useState<'relevant' | 'recent' | 'popular' | 'positive' | 'trending' | 'local' | 'following'>('recent')
  const [bookmarkedContent, setBookmarkedContent] = useState<Set<string>>(new Set())
  const { user } = useAuth()

  // Search suggestions for autocomplete
  const searchSuggestions = useMemo(() => {
    const suggestions = [
      // Artists
      'Blood Orange', 'Lorde', 'Zadie Smith', 'Dev Hynes', 'Luna Echo', 'Central Park Arena',
      // Genres
      'Indie Pop', 'Hip-Hop', 'Electronic', 'Jazz', 'Rock', 'Indie Rock',
      // Events
      'Music Festival', 'Concert', 'Live Performance', 'Summer Music Festival',
      // Topics
      'Album Review', 'New Release', 'Tour Dates', 'Music News', 'Independent Music',
      // Content Types
      'Music', 'Videos', 'News', 'Blogs', 'Forums'
    ]
    
    if (!searchQuery) return suggestions.slice(0, 8)
    
    return suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 8)
  }, [searchQuery])

  // Dynamic trending topics based on active tab
  const getTrendingTopics = (tab: string) => {
    const topics = {
      all: [
        { label: 'Electronic Music', count: '2.3k' },
        { label: 'Indie Rock', count: '1.8k' },
        { label: 'Hip Hop', count: '3.1k' },
        { label: 'Live Events', count: '1.2k' },
        { label: 'New Releases', count: '2.7k' },
        { label: 'Music News', count: '1.9k' }
      ],
      music: [
        { label: 'Electronic', count: '2.3k' },
        { label: 'Indie Rock', count: '1.8k' },
        { label: 'Hip Hop', count: '3.1k' },
        { label: 'Jazz', count: '1.5k' },
        { label: 'Pop', count: '2.1k' },
        { label: 'Alternative', count: '1.7k' }
      ],
      videos: [
        { label: 'Music Videos', count: '2.8k' },
        { label: 'Live Performances', count: '2.1k' },
        { label: 'Behind the Scenes', count: '1.6k' },
        { label: 'Tutorials', count: '1.9k' },
        { label: 'Interviews', count: '1.4k' },
        { label: 'Concert Footage', count: '2.3k' }
      ],
      news: [
        { label: 'Music Industry', count: '2.5k' },
        { label: 'Artist News', count: '3.2k' },
        { label: 'Album Releases', count: '2.1k' },
        { label: 'Festival Updates', count: '1.8k' },
        { label: 'Award Shows', count: '1.6k' },
        { label: 'Music Technology', count: '1.3k' }
      ],
      blogs: [
        { label: 'Music Reviews', count: '2.4k' },
        { label: 'Artist Stories', count: '1.9k' },
        { label: 'Music Production', count: '1.7k' },
        { label: 'Industry Insights', count: '1.5k' },
        { label: 'Fan Experiences', count: '2.1k' },
        { label: 'Music History', count: '1.2k' }
      ],
      forums: [
        { label: 'General Discussion', count: '3.5k' },
        { label: 'Music Production', count: '2.2k' },
        { label: 'Gear Talk', count: '1.8k' },
        { label: 'Local Scene', count: '1.6k' },
        { label: 'New Music', count: '2.7k' },
        { label: 'Collaboration', count: '1.4k' }
      ]
    }
    return topics[tab as keyof typeof topics] || topics.all
  }

  const contentTypes = [
    { value: 'all', label: 'All', icon: Sparkles },
    { value: 'music', label: 'Music', icon: Music2 },
    { value: 'videos', label: 'Videos', icon: Video },
    { value: 'news', label: 'News', icon: FileText },
    { value: 'blogs', label: 'Blogs', icon: FileText },
    { value: 'forums', label: 'Forums', icon: Users },
    { value: 'indie', label: 'Indie', icon: Music2 },
    { value: 'hiphop', label: 'Hip-Hop', icon: Music2 },
    { value: 'electronic', label: 'Electronic', icon: Music2 },
    { value: 'metal', label: 'Metal', icon: Music2 },
    { value: 'jazz', label: 'Jazz', icon: Music2 },
    { value: 'underground', label: 'Underground', icon: Music2 },
    { value: 'local', label: 'Local', icon: MapPin }
  ]

  // Helper function to get placeholder images
  const getPlaceholderImage = (type: string, width: number = 400, height: number = 300) => {
    const colors = {
      music: '6366f1', // Indigo
      event: '10b981', // Emerald
      video: '3b82f6', // Blue
      tour: 'f59e0b', // Amber
      news: 'ef4444', // Red
      blog: '8b5cf6',  // Violet
      forum: '64748b' // Slate
    }
    
    const color = colors[type as keyof typeof colors] || '6b7280'
    const text = type.toUpperCase()
    
    // Use a different placeholder service that doesn't require domain configuration
    return `https://dummyimage.com/${width}x${height}/${color}/ffffff&text=${text}`
  }

  const loadPersonalizedContent = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '20',
        sortBy: sortBy
      })
      
      console.log('[NewsFeed] Loading content for tab:', activeTab)
      
      // Fetch content based on active tab
      if (activeTab === 'all') {
        // Hybrid content: mix of everything
        const [postsResponse, threadsResponse, musicResponse, videosResponse, blogsResponse, newsResponse] = await Promise.all([
          fetch(`/api/feed/for-you?${params}`),
          fetch(`/api/forums/threads?${params}`),
          fetch(`/api/feed/music?${params}`),
          fetch(`/api/feed/videos?${params}`),
          fetch(`/api/feed/blogs?${params}`),
          fetch(`/api/feed/rss-news?${params}`)
        ])
        
        const postsData = await postsResponse.json()
        const threadsData = await threadsResponse.json()
        const musicData = await musicResponse.json()
        const videosData = await videosResponse.json()
        const blogsData = await blogsResponse.json()
        const newsData = await newsResponse.json()
        
        let hybridContent = [
          ...(postsData.content || []),
          ...(threadsData.threads || []),
          ...(musicData.content || []),
          ...(videosData.content || []),
          ...(blogsData.content || [])
        ]
        
        // Add RSS news to hybrid content
        if (newsData.success && newsData.news && newsData.news.length > 0) {
          console.log('[NewsFeed] Successfully fetched RSS news:', newsData.news.length, 'items')
          
          // Convert RSS items to ContentItem format
          const rssContent = newsData.news.map((item: any, index: number) => ({
            id: `rss_${item.id}`,
            type: 'news' as const,
            title: item.title,
            description: item.description,
            author: {
              id: `rss_${item.source}`,
              name: item.author || item.source,
              username: item.source.toLowerCase().replace(/\s+/g, ''),
              avatar_url: item.image || `https://dummyimage.com/40x40/ef4444/ffffff?text=${item.source.charAt(0)}`,
              is_verified: true
            },
            cover_image: item.image || getPlaceholderImage('news', 400, 250),
            created_at: item.pubDate,
            engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
            metadata: {
              url: item.link,
              tags: [item.category, item.source].filter(Boolean)
            },
            relevance_score: 0.8 + (index * 0.05)
          }))
          
          hybridContent = [...rssContent, ...hybridContent]
          console.log('[NewsFeed] Hybrid content created with RSS news:', hybridContent.length, 'total items')
        }
        
        // Ensure we always have some content
        if (hybridContent.length === 0) {
          hybridContent = generateMockContent()
        }
        
        setContent(hybridContent)
      } else if (activeTab === 'music') {
        // Fetch music tracks
        const response = await fetch(`/api/feed/music?${params}`)
        const data = await response.json()
        setContent(data.content || [])
      } else if (activeTab === 'videos') {
        // Fetch videos
        const response = await fetch(`/api/feed/videos?${params}`)
        const data = await response.json()
        setContent(data.content || [])
      } else if (activeTab === 'blogs') {
        // Fetch blog posts
        const response = await fetch(`/api/feed/blogs?${params}`)
        const data = await response.json()
        setContent(data.content || [])
      } else if (activeTab === 'news') {
        // Fetch RSS news
        const response = await fetch(`/api/feed/rss-news?${params}`)
        const data = await response.json()
        if (data.success && data.news) {
          // Convert RSS items to ContentItem format
          const newsContent = data.news.map((item: any, index: number) => ({
            id: `rss_${item.id}`,
            type: 'news' as const,
            title: item.title,
            description: item.description,
            author: {
              id: `rss_${item.source}`,
              name: item.author || item.source,
              username: item.source.toLowerCase().replace(/\s+/g, ''),
              avatar_url: item.image || `https://dummyimage.com/40x40/ef4444/ffffff?text=${item.source.charAt(0)}`,
              is_verified: true
            },
            cover_image: item.image || getPlaceholderImage('news', 400, 250),
            created_at: item.pubDate,
            engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
            metadata: {
              url: item.link,
              tags: [item.category, item.source].filter(Boolean)
            },
            relevance_score: 0.8 + (index * 0.05)
          }))
          setContent(newsContent)
        } else {
          setContent([])
        }
      } else if (activeTab === 'forums') {
        // Fetch forum threads
        const response = await fetch(`/api/forums/threads?${params}`)
        const data = await response.json()
        setContent(data.threads || [])
      } else {
        // For other tabs, use the existing API
        const response = await fetch(`/api/feed/for-you?${params}`)
        const data = await response.json()
        setContent(data.content || [])
      }
    } catch (error) {
      console.error('Error loading content:', error)
      setContent(generateMockContent())
    } finally {
      setLoading(false)
    }
  }

  const generateMockContent = (): ContentItem[] => {
    return [
      // Add a hardcoded blog post for testing
      {
        id: 'test-blog-1',
        type: 'blog',
        title: 'The Future of Independent Music',
        description: 'Exploring how independent artists are reshaping the music industry through digital platforms and direct fan engagement.',
        author: {
          id: 'test-author-1',
          name: 'Sarah Johnson',
          username: 'sarahjohnson',
          avatar_url: 'https://dummyimage.com/150x150/8b5cf6/ffffff?text=SJ',
          is_verified: false
        },
        cover_image: 'https://dummyimage.com/800x400/8b5cf6/ffffff?text=The+Future+of+Independent+Music',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 89, views: 1247, shares: 45, comments: 23 },
        metadata: {
          url: '/blog/the-future-of-independent-music',
          tags: ['Independent Music', 'Digital Age', 'Music Industry'],
          // reading_time: 14
        },
        relevance_score: 0.95
      },
      {
        id: '1',
        type: 'music',
        title: 'Midnight Dreams - New Single',
        description: 'Fresh indie rock vibes with haunting vocals and atmospheric production that will transport you to another dimension.',
        author: {
          id: '1',
          name: 'Luna Echo',
          username: 'lunaecho',
          avatar_url: getPlaceholderImage('music', 40, 40),
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 400),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { genre: 'Indie Rock', duration: 180 },
        relevance_score: 0.95
      },
      {
        id: '2',
        type: 'event',
        title: 'Summer Music Festival 2024',
        description: 'Join us for an incredible day of live music featuring top indie artists from around the country. Food trucks, craft beer, and amazing vibes!',
        author: {
          id: '2',
          name: 'Central Park Arena',
          username: 'centralparkarena',
          avatar_url: getPlaceholderImage('event', 40, 40),
          is_verified: true
        },
        cover_image: getPlaceholderImage('event', 400, 300),
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { date: '2024-07-15', location: 'Central Park Arena', venue: 'Central Park Arena', capacity: 5000, ticket_price: 75 },
        relevance_score: 0.88
      },
      {
        id: '3',
        type: 'video',
        title: 'Behind the Scenes: Studio Session',
        description: 'Exclusive look at the recording process for our latest album. See how the magic happens in the studio.',
        author: {
          id: '3',
          name: 'The Midnight Collective',
          username: 'midnightcollective',
          avatar_url: getPlaceholderImage('video', 40, 40),
          is_verified: false
        },
        cover_image: getPlaceholderImage('video', 400, 225),
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { duration: 480 },
        relevance_score: 0.92
      },
      {
        id: '4',
        type: 'tour',
        title: 'Luna Echo World Tour 2024',
        description: 'Luna Echo embarks on their first world tour, bringing their ethereal sound to fans across the globe.',
        author: {
          id: '4',
          name: 'Echo & The Bunnymen',
          username: 'echoandbunnymen',
          avatar_url: getPlaceholderImage('tour', 40, 40),
          is_verified: true
        },
        cover_image: getPlaceholderImage('tour', 400, 300),
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { date: '2024-06-01', location: 'Worldwide' },
        relevance_score: 0.87
      },
      {
        id: '5',
        type: 'news',
        title: 'New Album Release: Industry Insights',
        description: 'Breaking news in the music industry as top artists announce groundbreaking new albums and innovative collaborations.',
        author: {
          id: '5',
          name: 'Music Industry Weekly',
          username: 'musicindustryweekly',
          avatar_url: getPlaceholderImage('news', 40, 40),
          is_verified: true
        },
        cover_image: getPlaceholderImage('news', 400, 250),
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { tags: ['#MusicIndustry', '#NewReleases'] },
        relevance_score: 0.85
      },
      {
        id: '6',
        type: 'blog',
        title: 'The Future of Independent Music',
        description: 'Exploring how independent artists are reshaping the music industry through digital platforms and direct fan engagement.',
        author: {
          id: '6',
          name: 'Sarah Johnson',
          username: 'sarahjohnson',
          avatar_url: getPlaceholderImage('blog', 40, 40),
          is_verified: false
        },
        cover_image: getPlaceholderImage('blog', 400, 250),
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { tags: ['#IndependentMusic', '#DigitalAge'] },
        relevance_score: 0.83
      },
      // Additional RSS-style news items for testing
      {
        id: 'rss_1',
        type: 'news',
        title: 'Anti-Flag\'s Justin Sane Ordered to Pay Nearly $2 Million in Damages',
        description: 'A federal judge handed down a default judgment after the punk singer never acknowledged the sexual assault lawsuit filed against him.',
        author: {
          id: 'rss_pitchfork',
          name: 'Matthew Strauss',
          username: 'pitchfork',
          avatar_url: 'https://dummyimage.com/40x40/ef4444/ffffff?text=P',
          is_verified: true
        },
        cover_image: getPlaceholderImage('news', 400, 250),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: 'https://pitchfork.com/news/anti-flags-justin-sane-ordered-to-pay-nearly-2-million-in-damages-in-sexual-assault-lawsuit',
          tags: ['News', 'Pitchfork', 'Legal']
        },
        relevance_score: 0.8
      },
      {
        id: 'rss_2',
        type: 'news',
        title: 'King Gizzard & the Lizard Wizard Leave Spotify',
        description: 'The Australian band opposes military investments made by Daniel Ek, following in the footsteps of Deerhoof and Xiu Xiu.',
        author: {
          id: 'rss_pitchfork',
          name: 'Matthew Strauss',
          username: 'pitchfork',
          avatar_url: 'https://dummyimage.com/40x40/ef4444/ffffff?text=P',
          is_verified: true
        },
        cover_image: getPlaceholderImage('news', 400, 250),
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: 'https://pitchfork.com/news/king-gizzard-and-the-lizard-wizard-leave-spotify',
          tags: ['News', 'Pitchfork', 'Streaming']
        },
        relevance_score: 0.85
      },
      {
        id: 'rss_3',
        type: 'news',
        title: 'Amaarae Shares Video for New Song "Girlie-Pop!": Watch',
        description: 'The Ghanaian American singer releases a new music video showcasing her unique blend of Afropop and alternative sounds.',
        author: {
          id: 'rss_pitchfork',
          name: 'Jazz Monroe',
          username: 'pitchfork',
          avatar_url: 'https://dummyimage.com/40x40/ef4444/ffffff?text=P',
          is_verified: true
        },
        cover_image: getPlaceholderImage('news', 400, 250),
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: 'https://pitchfork.com/news/amaarae-shares-video-for-new-song-girlie-pop-watch',
          tags: ['News', 'Pitchfork', 'New Music']
        },
        relevance_score: 0.9
      },
      // Additional genre-specific content
      {
        id: 'indie_1',
        type: 'news',
        title: 'Indie Rock Revolution: New Bands Shaping the Scene',
        description: 'Discover the latest wave of independent artists who are redefining the indie rock landscape with innovative sounds and DIY ethics.',
        author: {
          id: 'stereogum',
          name: 'Stereogum',
          username: 'stereogum',
          avatar_url: 'https://dummyimage.com/40x40/10b981/ffffff?text=S',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Indie Music', 'Rock', 'New Artists']
        },
        relevance_score: 0.95
      },
      {
        id: 'hiphop_1',
        type: 'news',
        title: 'Hip-Hop\'s Evolution: From the Streets to Global Dominance',
        description: 'Exploring how hip-hop culture continues to influence music, fashion, and society worldwide.',
        author: {
          id: 'complex',
          name: 'Complex',
          username: 'complex',
          avatar_url: 'https://dummyimage.com/40x40/f59e0b/ffffff?text=C',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Hip-Hop', 'Culture', 'Music History']
        },
        relevance_score: 0.92
      },
      {
        id: 'electronic_1',
        type: 'news',
        title: 'Electronic Music Festival Season: What to Expect in 2024',
        description: 'A comprehensive guide to the biggest electronic music festivals and events happening around the world this year.',
        author: {
          id: 'resident_advisor',
          name: 'Resident Advisor',
          username: 'residentadvisor',
          avatar_url: 'https://dummyimage.com/40x40/3b82f6/ffffff?text=R',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Electronic Music', 'Festivals', 'Events']
        },
        relevance_score: 0.88
      },
      {
        id: 'metal_1',
        type: 'news',
        title: 'Metal Scene Report: Underground Bands Breaking Through',
        description: 'Discover the most promising underground metal bands that are pushing the boundaries of the genre.',
        author: {
          id: 'metal_injection',
          name: 'Metal Injection',
          username: 'metalinjection',
          avatar_url: 'https://dummyimage.com/40x40/64748b/ffffff?text=M',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Metal Music', 'Underground', 'New Bands']
        },
        relevance_score: 0.85
      },
      {
        id: 'jazz_1',
        type: 'news',
        title: 'Jazz Fusion: Modern Artists Bridging Traditional and Contemporary',
        description: 'Meet the jazz musicians who are creating innovative sounds by blending traditional jazz with modern influences.',
        author: {
          id: 'jazz_times',
          name: 'JazzTimes',
          username: 'jazztimes',
          avatar_url: 'https://dummyimage.com/40x40/8b5cf6/ffffff?text=J',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Jazz Music', 'Fusion', 'Modern Jazz']
        },
        relevance_score: 0.87
      },
      {
        id: 'underground_1',
        type: 'news',
        title: 'Underground Scene Explosion: DIY Venues and Independent Artists',
        description: 'The underground music scene is thriving with DIY venues, independent labels, and artists creating innovative sounds outside the mainstream.',
        author: {
          id: 'tiny_mix_tapes',
          name: 'Tiny Mix Tapes',
          username: 'tinymixtapes',
          avatar_url: 'https://dummyimage.com/40x40/7c3aed/ffffff?text=T',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Underground Music', 'DIY', 'Independent']
        },
        relevance_score: 0.92
      },
      {
        id: 'local_1',
        type: 'news',
        title: 'Local Music Scenes: Community-Driven Music Movements',
        description: 'How local music scenes are fostering community connections and supporting emerging artists in cities across the country.',
        author: {
          id: 'chicago_reader',
          name: 'Chicago Reader',
          username: 'chicagoreader',
          avatar_url: 'https://dummyimage.com/40x40/059669/ffffff?text=C',
          is_verified: true
        },
        cover_image: getPlaceholderImage('music', 400, 250),
        created_at: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 0, views: 0, shares: 0, comments: 0 },
        metadata: { 
          url: '#',
          tags: ['Local Music', 'Community', 'Emerging Artists']
        },
        relevance_score: 0.85
      }
    ]
  }

  // Positive sentiment scoring system
  const calculatePositiveScore = (text: string): number => {
    const positiveWords = [
      'awesome', 'amazing', 'incredible', 'fantastic', 'brilliant', 'outstanding',
      'cool', 'epic', 'best', 'super', 'funny', 'elegant', 'beautiful', 'stunning',
      'wonderful', 'excellent', 'perfect', 'great', 'amazing', 'incredible',
      'fantastic', 'brilliant', 'outstanding', 'phenomenal', 'spectacular',
      'magnificent', 'gorgeous', 'stunning', 'breathtaking', 'mind-blowing',
      'revolutionary', 'groundbreaking', 'innovative', 'creative', 'inspiring',
      'uplifting', 'energizing', 'exciting', 'thrilling', 'captivating',
      'mesmerizing', 'enchanting', 'magical', 'extraordinary', 'remarkable',
      'exceptional', 'superb', 'marvelous', 'splendid', 'glorious', 'divine',
      'heavenly', 'celestial', 'cosmic', 'stellar', 'stellar', 'stellar',
      'legendary', 'iconic', 'memorable', 'unforgettable', 'timeless',
      'classic', 'masterpiece', 'genius', 'prodigy', 'virtuoso', 'maestro'
    ]
    
    const lowerText = text.toLowerCase()
    let score = 0
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) {
        score += matches.length * 2 // Weight positive words more heavily
      }
    })
    
    // Bonus for exclamation marks and positive punctuation
    const exclamationCount = (text.match(/!/g) || []).length
    score += exclamationCount * 0.5
    
    // Bonus for positive emojis and symbols
    const positiveEmojis = (text.match(/[😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠💪👈👉☝️👆🖕👇✌️🤞🤟🤘🤙👌👈👉☝️👆🖕👇✌️🤞🤟🤘🤙👌]/g) || []).length
    score += positiveEmojis * 1
    
    return score
  }

  const filteredContent = useMemo(() => {
    let filtered = content

    console.log('[NewsFeed] Filtering content:', {
      totalContent: content.length,
      activeTab,
      searchQuery,
      contentTypes: content.map(item => item.type)
    })

    // Apply search filtering first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => {
        const searchableText = [
          item.title,
          item.description,
          item.author?.name,
          item.author?.username,
          ...(item.metadata?.tags || []),
          item.metadata?.genre,
          item.type
        ].join(' ').toLowerCase()
        
        return searchableText.includes(query)
      })
      console.log('[NewsFeed] Search filtering applied, remaining items:', filtered.length)
    }

    // Apply tab filtering
    if (activeTab !== 'all') {
      filtered = filtered.filter(item => item.type === activeTab)
      console.log('[NewsFeed] Tab filtering applied for', activeTab, 'remaining items:', filtered.length)
    }

    // Apply sorting based on selected option
    if (sortBy === 'positive') {
      filtered = [...filtered].map(item => ({
        ...item,
        positiveScore: calculatePositiveScore(`${item.title} ${item.description || ''}`)
      })).sort((a, b) => {
        // Sort by positive score (highest first), then by relevance score
        const scoreDiff = (b.positiveScore || 0) - (a.positiveScore || 0)
        if (scoreDiff !== 0) return scoreDiff
        return (b.relevance_score || 0) - (a.relevance_score || 0)
      })
      
      console.log('[NewsFeed] Positive sentiment sorting applied:', 
        filtered.map(item => ({
          title: item.title,
          positiveScore: item.positiveScore,
          relevance_score: item.relevance_score
        }))
      )
    } else if (sortBy === 'relevant') {
      // Sort by relevance score (highest first)
      filtered = [...filtered].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      console.log('[NewsFeed] Relevance sorting applied')
    } else if (sortBy === 'recent') {
      // Sort by creation date (newest first)
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      console.log('[NewsFeed] Recent sorting applied')
    } else if (sortBy === 'popular') {
      // Sort by engagement (likes + views + shares + comments)
      filtered = [...filtered].sort((a, b) => {
        const aEngagement = (a.engagement?.likes || 0) + (a.engagement?.views || 0) + (a.engagement?.shares || 0) + (a.engagement?.comments || 0)
        const bEngagement = (b.engagement?.likes || 0) + (b.engagement?.views || 0) + (b.engagement?.shares || 0) + (b.engagement?.comments || 0)
        return bEngagement - aEngagement
      })
      console.log('[NewsFeed] Popular sorting applied')
    } else {
      // Default: sort by recent
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      console.log('[NewsFeed] Default recent sorting applied')
    }

    return filtered
  }, [content, searchQuery, activeTab, sortBy])

  const handleLike = (contentId: string) => {
    setContent(prev => prev.map(item =>
      item.id === contentId
        ? { ...item, is_liked: !item.is_liked, engagement: { ...item.engagement, likes: item.is_liked ? item.engagement.likes - 1 : item.engagement.likes + 1 } }
        : item
    ))
  }

  const handleFollow = (authorId: string) => {
    setContent(prev => prev.map(item =>
      item.author?.id === authorId
        ? { ...item, is_following: !item.is_following }
        : item
    ))
  }

  const handleBookmark = (contentId: string) => {
    setBookmarkedContent(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contentId)) {
        newSet.delete(contentId)
      } else {
        newSet.add(contentId)
      }
      return newSet
    })
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music2 className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'tour': return <MapPin className="h-4 w-4" />
      case 'news': return <FileText className="h-4 w-4" />
      case 'blog': return <FileText className="h-4 w-4" />
      case 'forum': return <Users className="h-4 w-4" />
      default: return <Sparkles className="h-4 w-4" />
    }
  }

  // Enhanced color coding system for different content types
  const getContentColor = (type: string) => {
    switch (type) {
      case 'music': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'event': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'video': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      case 'tour': return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
      case 'news': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
      case 'blog': return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
      case 'forum': return 'bg-gradient-to-r from-slate-600 to-slate-500 text-white'
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
    }
  }

  // Color coding for content cards - subtle border colors
  const getContentCardBorder = (type: string) => {
    switch (type) {
      case 'music': return 'hover:border-purple-500/50 group-hover:shadow-purple-500/10'
      case 'event': return 'hover:border-green-500/50 group-hover:shadow-green-500/10'
      case 'video': return 'hover:border-blue-500/50 group-hover:shadow-blue-500/10'
      case 'tour': return 'hover:border-orange-500/50 group-hover:shadow-orange-500/10'
      case 'news': return 'hover:border-red-500/50 group-hover:shadow-red-500/10'
      case 'blog': return 'hover:border-indigo-500/50 group-hover:shadow-indigo-500/10'
      case 'forum': return 'hover:border-slate-500/50 group-hover:shadow-slate-500/10'
      default: return 'hover:border-purple-500/50 group-hover:shadow-purple-500/10'
    }
  }

  // Color coding for content type indicators
  const getContentTypeIndicator = (type: string) => {
    switch (type) {
      case 'music': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'event': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'video': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'tour': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'news': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'blog': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
      case 'forum': return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRelevanceBadge = (score?: number) => {
    if (!score) return null
    
    let color = 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/30'
    let text = 'Relevant'
    let iconColor = 'text-gray-300'
    
    if (score >= 0.9) {
      color = 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30'
      text = 'Highly Relevant'
      iconColor = 'text-green-300'
    } else if (score >= 0.7) {
      color = 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30'
      text = 'Very Relevant'
      iconColor = 'text-blue-300'
    } else if (score >= 0.5) {
      color = 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border-yellow-500/30'
      text = 'Relevant'
      iconColor = 'text-yellow-300'
    }
    
    return (
      <Badge className={`${color} border px-4 py-2 rounded-2xl font-semibold shadow-lg`}>
        <Star className={`h-4 w-4 mr-2 ${iconColor}`} />
        {text}
      </Badge>
    )
  }

  useEffect(() => {
    console.log('[NewsFeed] useEffect triggered, calling loadPersonalizedContent')
    loadPersonalizedContent()
  }, [sortBy, activeTab])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 relative overflow-hidden">

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Compact Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            News <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">Feed</span>
          </h1>
          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto">
            Discover music, events, and discussions tailored to your taste
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Main Content Area */}
          <div className="space-y-6">
                        {/* Enhanced Search and Filter Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {/* Enhanced Search Bar with Autocomplete */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                  <Input
                    placeholder="Search artists, genres, events, or topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSearchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    className="pl-16 pr-16 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-16 rounded-3xl focus:border-purple-400/50 focus:ring-purple-400/20 backdrop-blur-sm text-lg"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-12 w-12 p-0 text-gray-400 hover:text-white rounded-2xl"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                  
                  {/* Search Suggestions */}
                  <AnimatePresence>
                    {showSearchSuggestions && searchSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden z-50"
                      >
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(suggestion)
                              setShowSearchSuggestions(false)
                            }}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                          >
                            <Search className="h-4 w-4 text-gray-400" />
                            <span>{suggestion}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Simplified Filter Row */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Content Type Toggle */}
                <div className="flex-1 flex justify-center">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                    <TabsList className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-1 gap-1">
                      {contentTypes.slice(0, 6).map((type) => {
                        const Icon = type.icon
                        return (
                          <TabsTrigger
                            key={type.value}
                            value={type.value}
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 transition-all duration-300 whitespace-nowrap text-sm font-medium rounded-2xl h-12 px-4 touch-manipulation flex items-center justify-center text-gray-300 hover:text-white data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-purple-600 data-[state=active]:!to-pink-600 data-[state=active]:!text-white"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {type.label}
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </Tabs>
                </div>

                {/* Sort Dropdown */}
                <div className="lg:w-48">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full h-12 border-white/20 text-gray-300 hover:text-white hover:border-purple-400/50 transition-all rounded-2xl bg-white/5 backdrop-blur-sm hover:bg-white/10"
                  >
                    <SlidersHorizontal className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">
                      {sortBy === 'positive' ? 'Most Positive' : sortBy === 'relevant' ? 'Most Relevant' : sortBy === 'recent' ? 'Most Recent' : sortBy === 'popular' ? 'Most Popular' : 'Sort'}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Sort Options */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4"
                  >
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { value: 'recent', label: 'Latest', icon: Clock },
                        { value: 'trending', label: 'Trending', icon: TrendingUp },
                        { value: 'local', label: 'Local', icon: MapPin },
                        { value: 'following', label: 'Following', icon: Users },
                        { value: 'relevant', label: 'Relevant', icon: Star },
                        { value: 'positive', label: 'Positive', icon: Sparkles }
                      ].map((option) => {
                        const Icon = option.icon
                        return (
                          <Button
                            key={option.value}
                            variant={sortBy === option.value ? "default" : "outline"}
                            onClick={() => setSortBy(option.value as any)}
                            className={`h-10 whitespace-nowrap rounded-2xl text-sm font-medium ${
                              sortBy === option.value 
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25' 
                                : 'border-white/20 text-gray-300 hover:text-white hover:border-purple-400/50 bg-white/5 backdrop-blur-sm hover:bg-white/10'
                            } transition-all duration-300`}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {option.label}
                          </Button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Genre Pills (Conditional) */}
              {activeTab === 'music' && (
                <div className="flex gap-2 flex-wrap">
                  {contentTypes.slice(6).map((type) => {
                    const Icon = type.icon
                    return (
                      <Button
                        key={type.value}
                        variant="outline"
                        className="h-8 px-4 text-xs font-medium rounded-full border-white/20 text-gray-300 hover:text-white hover:border-purple-400/50 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {type.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Optional News Mix Carousel - Only show when explicitly enabled */}
            {false && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">News Mix</h2>
                  <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                    View All
                  </Button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {filteredContent.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={`carousel-${item.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex-shrink-0 w-80 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 group cursor-pointer"
                    >
                      <div className="h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 relative overflow-hidden">
                        {item.cover_image ? (
                          <img 
                            src={item.cover_image} 
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-6xl text-white/30">
                              {item.type === 'music' ? '🎵' : item.type === 'video' ? '🎬' : item.type === 'news' ? '📰' : '📝'}
                            </div>
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-black/50 text-white border-0">
                            {item.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{item.author?.name || 'Unknown'}</span>
                          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Trending Topics Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Trending Topics</h2>
                <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                  Explore
                </Button>
              </div>
              <div className="flex gap-3 flex-wrap">
                {getTrendingTopics(activeTab).map((topic, index) => (
                  <motion.button
                    key={topic.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-full px-4 py-2 text-white hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300 group"
                  >
                    <span className="text-sm font-medium">{topic.label}</span>
                    <span className="ml-2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {topic.count}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>


            {/* Main Content Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {searchQuery ? `Search Results for "${searchQuery}"` : 'Latest Content'}
                </h2>
                <div className="flex items-center gap-4">
                  {searchQuery && (
                    <>
                      <span className="text-sm text-gray-400">
                        {filteredContent.length} result{filteredContent.length !== 1 ? 's' : ''}
                      </span>
                      <Button 
                        variant="ghost" 
                        onClick={() => setSearchQuery('')}
                        className="text-gray-400 hover:text-white text-sm"
                      >
                        Clear Search
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
                    View All
                  </Button>
                </div>
              </div>
              {/* Start Conversation button for Forums tab */}
              {activeTab === 'forums' && user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <StartConversationButton onConversationCreated={() => loadPersonalizedContent()} />
                </motion.div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 animate-pulse rounded-3xl overflow-hidden">
                      <div className="h-48 bg-white/10"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                        <div className="h-3 bg-white/10 rounded w-1/2"></div>
                        <div className="h-3 bg-white/10 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {item.type === 'forum' ? (
                        <div className="space-y-2">
                          <ThreadCardV2
                            id={item.id.replace('thread_','')}
                            forum={{
                              id: item.metadata?.forum?.slug || '',
                              slug: item.metadata?.forum?.slug || '',
                              title: item.metadata?.forum?.name || ''
                            }}
                            title={item.title}
                            kind={'text'}
                            contentMd={item.description}
                            linkUrl={item.metadata?.url}
                            author={{
                              id: item.author?.id || '',
                              username: item.author?.username || 'Unknown',
                              avatar_url: item.author?.avatar_url,
                              is_verified: item.author?.is_verified
                            }}
                            score={item.engagement?.likes || 0}
                            userVote={item.metadata?.user_vote === 1 ? 'up' : item.metadata?.user_vote === -1 ? 'down' : null}
                            commentsCount={item.engagement?.comments || 0}
                            createdAt={item.created_at}
                            compact={true}
                          />
                        </div>
                      ) : item.type === 'music' ? (
                        <FeedMusicPlayer
                          track={{
                            id: item.id,
                            title: item.title,
                            artist: (item.metadata as any)?.artist || item.author?.name || 'Unknown Artist',
                            album: (item.metadata as any)?.album,
                            genre: (item.metadata as any)?.genre,
                            duration: (item.metadata as any)?.duration,
                            file_url: (item.metadata as any)?.url || '',
                            cover_art_url: item.cover_image,
                            description: item.description,
                            tags: item.metadata?.tags || [],
                            is_featured: false,
                            is_public: true,
                            stats: {
                              plays: item.engagement?.views || 0,
                              likes: item.engagement?.likes || 0,
                              comments: item.engagement?.comments || 0,
                              shares: item.engagement?.shares || 0
                            },
                            created_at: item.created_at,
                            author: item.author
                          }}
                          isLiked={item.is_liked}
                          compact={true}
                        />
                      ) : item.type === 'video' ? (
                        <FeedVideoPlayer
                          video={{
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            video_url: item.metadata?.url || '',
                            thumbnail_url: item.cover_image,
                            duration: (item.metadata as any)?.duration,
                            category: (item.metadata as any)?.category,
                            tags: (item.metadata as any)?.tags || [],
                            created_at: item.created_at,
                            author: item.author,
                            engagement: item.engagement,
                            metadata: {
                              aspect_ratio: (item.metadata as any)?.aspect_ratio,
                              orientation: (item.metadata as any)?.orientation
                            }
                          }}
                          isLiked={item.is_liked}
                          compact={true}
                        />
                      ) : (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer group overflow-hidden">
                          <div className="flex items-center gap-3 mb-3 min-w-0">
                            <div className="text-3xl flex-shrink-0">
                              {item.type === 'news' ? '📰' : item.type === 'blog' ? '📝' : '🎪'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors line-clamp-2 break-words overflow-hidden">
                                {item.title}
                              </h3>
                              {item.description && (
                                <p className="text-gray-400 text-sm line-clamp-2 mt-1 break-words overflow-hidden">
                                  {item.description.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ')}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {item.author?.name && (
                                <span className="text-purple-300 font-medium truncate max-w-[120px]">{item.author.name}</span>
                              )}
                              {item.metadata?.genre && (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-2 py-1 text-xs flex-shrink-0">
                                  {item.metadata.genre}
                                </Badge>
                              )}
                            </div>
                            <span className="text-gray-400 flex-shrink-0 ml-2 whitespace-nowrap">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                          </div>
                          
                          {/* Engagement Metrics */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              <span>{item.engagement?.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              <span>{item.engagement?.comments || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Share2 className="h-3 w-3" />
                              <span>{item.engagement?.shares || 0}</span>
                            </div>
                            {sortBy === 'positive' && item.positiveScore && item.positiveScore > 0 && (
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-2 py-1 text-xs ml-auto">
                                <Sparkles className="h-3 w-3 mr-1" />
                                +{item.positiveScore}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-12 md:p-16 text-center">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl rounded-full"></div>
                      <Search className="relative h-16 w-16 md:h-20 md:w-20 text-gray-400 mx-auto" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">No content found</h3>
                    <p className="text-gray-300 mb-8 text-lg md:text-xl font-light max-w-2xl mx-auto">
                      Try adjusting your search or filters to discover more content.
                    </p>
                    <Button
                      onClick={() => {
                        setSearchQuery('')
                        setActiveTab('all')
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl px-8 py-3 text-lg font-medium shadow-lg shadow-purple-500/25"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
} 