'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, MessageCircle, User, CheckCircle, X, RefreshCw } from 'lucide-react'

interface Post {
  id: string
  content: string
  likes_count: number
  comments_count: number
  is_liked: boolean
  created_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  user: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  }
}

export default function LikesCommentsTestPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/feed/posts?limit=5', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to load posts')
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      setPosts(result.data || [])
      console.log('✅ Loaded posts:', result.data)
    } catch (error) {
      console.error('Error loading posts:', error)
      setError('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const testLikePost = async (postId: string) => {
    try {
      const currentPost = posts.find(p => p.id === postId)
      if (!currentPost) return

      const action = currentPost.is_liked ? 'unlike' : 'like'
      
      console.log(`🧪 Testing ${action} for post:`, postId)
      
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

      const result = await response.json()
      console.log('✅ Like result:', result)
      
      // Update the post state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !post.is_liked,
              likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1
            }
          : post
      ))
      
      setTestResults(prev => ({ ...prev, [`like_${postId}`]: true }))
      console.log('✅ Like test passed')
    } catch (error) {
      console.error('❌ Like test failed:', error)
      setTestResults(prev => ({ ...prev, [`like_${postId}`]: false }))
    }
  }

  const testAddComment = async (postId: string) => {
    try {
      const testComment = `Test comment from likes-comments-test at ${new Date().toISOString()}`
      
      console.log('🧪 Testing comment for post:', postId)
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: testComment })
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      const result = await response.json()
      console.log('✅ Comment result:', result)
      
      // Update the post state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments_count: post.comments_count + 1
            }
          : post
      ))
      
      setTestResults(prev => ({ ...prev, [`comment_${postId}`]: true }))
      console.log('✅ Comment test passed')
    } catch (error) {
      console.error('❌ Comment test failed:', error)
      setTestResults(prev => ({ ...prev, [`comment_${postId}`]: false }))
    }
  }

  const testGetComments = async (postId: string) => {
    try {
      console.log('🧪 Testing get comments for post:', postId)
      
      const response = await fetch(`/api/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to get comments')
      }

      const result = await response.json()
      console.log('✅ Comments result:', result)
      
      setComments(prev => ({ ...prev, [postId]: result.comments || [] }))
      setTestResults(prev => ({ ...prev, [`get_comments_${postId}`]: true }))
      console.log('✅ Get comments test passed')
    } catch (error) {
      console.error('❌ Get comments test failed:', error)
      setTestResults(prev => ({ ...prev, [`get_comments_${postId}`]: false }))
    }
  }

  const testGetLikeStatus = async (postId: string) => {
    try {
      console.log('🧪 Testing get like status for post:', postId)
      
      const response = await fetch(`/api/posts/${postId}/likes`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to get like status')
      }

      const result = await response.json()
      console.log('✅ Like status result:', result)
      
      setTestResults(prev => ({ ...prev, [`like_status_${postId}`]: true }))
      console.log('✅ Get like status test passed')
    } catch (error) {
      console.error('❌ Get like status test failed:', error)
      setTestResults(prev => ({ ...prev, [`like_status_${postId}`]: false }))
    }
  }

  const runAllTests = async () => {
    setTestResults({})
    
    for (const post of posts) {
      await testGetLikeStatus(post.id)
      await testLikePost(post.id)
      await testAddComment(post.id)
      await testGetComments(post.id)
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('🎯 All tests completed!')
  }

  const getTestIcon = (testKey: string) => {
    if (!(testKey in testResults)) return null
    return testResults[testKey] ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-red-500" />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Likes & Comments API Test
          </h1>
          <p className="text-gray-300 text-lg">
            Testing the new likes and comments functionality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Controls */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-white">Test Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={loadPosts}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {loading ? 'Loading...' : 'Reload Posts'}
                </Button>
                
                <Button
                  onClick={runAllTests}
                  disabled={loading || posts.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Run All Tests
                </Button>
                
                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Posts */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-300 mt-4">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-300 text-lg">No posts found</p>
                  </CardContent>
                </Card>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{post.user.full_name}</h3>
                          <p className="text-gray-400 text-sm">@{post.user.username}</p>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-4">{post.content}</p>
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Heart className={`h-5 w-5 ${post.is_liked ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                          <span className="text-white">{post.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-gray-400" />
                          <span className="text-white">{post.comments_count}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-white font-medium mb-2">Like Tests</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                onClick={() => testGetLikeStatus(post.id)}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                              >
                                Get Status
                              </Button>
                              {getTestIcon(`like_status_${post.id}`)}
                            </div>
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                onClick={() => testLikePost(post.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                              >
                                Toggle Like
                              </Button>
                              {getTestIcon(`like_${post.id}`)}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-white font-medium mb-2">Comment Tests</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                onClick={() => testGetComments(post.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                              >
                                Get Comments
                              </Button>
                              {getTestIcon(`get_comments_${post.id}`)}
                            </div>
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                onClick={() => testAddComment(post.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                Add Comment
                              </Button>
                              {getTestIcon(`comment_${post.id}`)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Show comments if loaded */}
                      {comments[post.id] && comments[post.id].length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/10">
                          <h4 className="text-white font-medium mb-3">
                            Comments ({comments[post.id].length})
                          </h4>
                          <div className="space-y-3">
                            {comments[post.id].map((comment) => (
                              <div key={comment.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-medium text-sm">{comment.user.full_name}</span>
                                    <span className="text-gray-400 text-xs">
                                      {new Intl.DateTimeFormat("en-US", {
                                        year: "numeric",
                                        month: "numeric",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      }).format(new Date(comment.created_at))}
                                    </span>
                                  </div>
                                  <p className="text-gray-300 text-sm">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 