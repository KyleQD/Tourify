import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface RSSNewsItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  author?: string
  category?: string
  image?: string
  source: string
}

interface RSSNewsResponse {
  success: boolean
  news: RSSNewsItem[]
  total: number
  sources: string[]
  error?: string
}

interface UseRSSNewsOptions {
  limit?: number
  category?: string
  source?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useRSSNews(options: UseRSSNewsOptions = {}) {
  const {
    limit = 20,
    category,
    source,
    autoRefresh = false,
    refreshInterval = 15 * 60 * 1000 // 15 minutes
  } = options

  const [news, setNews] = useState<RSSNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { user } = useAuth()

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: limit.toString()
      })

      if (category) {
        params.append('category', category)
      }

      if (source) {
        params.append('source', source)
      }

      const response = await fetch(`/api/feed/rss-news?${params}`)
      const data: RSSNewsResponse = await response.json()

      if (data.success) {
        setNews(data.news)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch news')
      }
    } catch (err) {
      console.error('Error fetching RSS news:', err)
      setError('Failed to fetch news')
    } finally {
      setLoading(false)
    }
  }

  const refreshNews = () => {
    fetchNews()
  }

  const getNewsBySource = (sourceName: string) => {
    return news.filter(item => item.source.toLowerCase() === sourceName.toLowerCase())
  }

  const getNewsByCategory = (categoryName: string) => {
    return news.filter(item => 
      item.category?.toLowerCase().includes(categoryName.toLowerCase()) ||
      item.title.toLowerCase().includes(categoryName.toLowerCase()) ||
      item.description.toLowerCase().includes(categoryName.toLowerCase())
    )
  }

  const searchNews = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return news.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.author?.toLowerCase().includes(lowerQuery) ||
      item.category?.toLowerCase().includes(lowerQuery)
    )
  }

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNews()
    }
  }, [user, limit, category, source])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !user) return

    const interval = setInterval(() => {
      fetchNews()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, user])

  return {
    news,
    loading,
    error,
    lastUpdated,
    refreshNews,
    getNewsBySource,
    getNewsByCategory,
    searchNews,
    total: news.length
  }
}

// Hook for getting news sources
export function useNewsSources() {
  const [sources, setSources] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/feed/rss-news?limit=1')
        const data = await response.json()
        
        if (data.success && data.sources) {
          setSources(data.sources)
        }
      } catch (error) {
        console.error('Error fetching news sources:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSources()
  }, [])

  return { sources, loading }
} 