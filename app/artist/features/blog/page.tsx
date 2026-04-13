"use client"

import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Plus, 
  FileText, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar, 
  MoreHorizontal,
  TrendingUp,
  Clock,
  Heart
} from "lucide-react"
import { format } from "date-fns"
import { TrackEmbed } from "@/components/blog/renderers/track-embed"
import BlogEditor from "./blog-editor"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Image from "next/image"

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url?: string
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  published_at?: string
  scheduled_for?: string
  tags: string[]
  categories: string[]
  stats: {
    views: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  updated_at: string
}

export default function BlogPage() {
  const { user, profile } = useArtist()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPosts()
    }
  }, [user])

  const loadPosts = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('artist_blog_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error loading posts:', error)
      toast.error('Failed to load blog posts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('artist_blog_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast.success('Blog post deleted successfully')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete blog post')
    } finally {
      setDeletePostId(null)
    }
  }

  const handleStatusChange = async (postId: string, newStatus: string) => {
    if (!user) return

    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('artist_blog_posts')
        .update(updateData)
        .eq('id', postId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, status: newStatus as any, ...updateData }
          : p
      ))
      
      toast.success(`Post ${newStatus === 'published' ? 'published' : 'updated'} successfully`)
    } catch (error) {
      console.error('Error updating post status:', error)
      toast.error('Failed to update post status')
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || 
                           post.categories.includes(categoryFilter)
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getUniqueCategories = () => {
    const categories = new Set<string>()
    posts.forEach(post => {
      post.categories.forEach(cat => categories.add(cat))
    })
    return Array.from(categories)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-600/20 text-green-300'
      case 'draft': return 'bg-gray-600/20 text-gray-300'
      case 'scheduled': return 'bg-blue-600/20 text-blue-300'
      case 'archived': return 'bg-orange-600/20 text-orange-300'
      default: return 'bg-gray-600/20 text-gray-300'
    }
  }

  const getTotalStats = () => {
    return posts.reduce((acc, post) => ({
      totalPosts: acc.totalPosts + 1,
      totalViews: acc.totalViews + (post.stats?.views || 0),
      totalLikes: acc.totalLikes + (post.stats?.likes || 0),
      publishedPosts: acc.publishedPosts + (post.status === 'published' ? 1 : 0)
    }), { totalPosts: 0, totalViews: 0, totalLikes: 0, publishedPosts: 0 })
  }

  if (showEditor) {
    return (
      <BlogEditor
        postId={editingPostId || undefined}
        onBack={() => {
          setShowEditor(false)
          setEditingPostId(null)
          loadPosts() // Refresh posts after editing
        }}
      />
    )
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Blog</h1>
            <p className="text-gray-400">Share your thoughts and connect with your audience</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowEditor(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Posts</p>
                <p className="text-2xl font-bold text-white">{stats.totalPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Published</p>
                <p className="text-2xl font-bold text-white">{stats.publishedPosts}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Likes</p>
                <p className="text-2xl font-bold text-white">{stats.totalLikes.toLocaleString()}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="bg-slate-900/50 border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-full mb-4"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {posts.length === 0 ? 'No blog posts yet' : 'No posts match your filters'}
            </h3>
            <p className="text-gray-400 mb-6">
              {posts.length === 0 
                ? 'Start sharing your thoughts and connect with your audience by creating your first blog post.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {posts.length === 0 && (
              <Button 
                onClick={() => setShowEditor(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="bg-slate-900/50 border-slate-700/50 group hover:border-purple-500/50 transition-all duration-200">
              <CardContent className="p-0">
                {post.featured_image_url && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.featured_image_url}
                      alt={post.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {post.excerpt || post.content.replace(/\[track:[^\]]+\]/g, '').slice(0, 100) + '...'}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem 
                          onClick={() => {
                            setEditingPostId(post.id)
                            setShowEditor(true)
                          }}
                          className="text-gray-300 hover:text-white"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {post.status === 'draft' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(post.id, 'published')}
                            className="text-gray-300 hover:text-white"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        {post.status === 'published' && (
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(post.id, 'draft')}
                            className="text-gray-300 hover:text-white"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Unpublish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem 
                          onClick={() => setDeletePostId(post.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Inline track embed if token present at top */}
                  {post.content.includes('[track:') && (
                    <div className="mt-3">
                      {post.content.match(/\[track:([^\]]+)\]/g)?.slice(0,1).map((tok) => {
                        const id = tok.replace('[track:', '').replace(']','')
                        return <TrackEmbed key={id} id={id} />
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(post.published_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.stats?.views || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.stats?.likes || 0}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.updated_at), 'MMM d')}
                    </span>
                  </div>

                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs border-purple-500/30 text-purple-300"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs border-gray-500/30 text-gray-400">
                          +{post.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this blog post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && handleDeletePost(deletePostId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 