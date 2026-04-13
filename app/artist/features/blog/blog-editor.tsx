"use client"

import { supabase } from '@/lib/supabase/client'
import { useState, useEffect } from "react"
import { useArtist } from "@/contexts/artist-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Save, ArrowLeft, Eye, Calendar, Tag, Image as ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface BlogPost {
  id?: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url?: string
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  published_at?: string
  scheduled_for?: string
  seo_title?: string
  seo_description?: string
  tags: string[]
  categories: string[]
}

interface BlogEditorProps {
  postId?: string
  onBack: () => void
}

export default function BlogEditor({ postId, onBack }: BlogEditorProps) {
  const { user, profile } = useArtist()
  const router = useRouter()
  const [post, setPost] = useState<BlogPost>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'draft',
    tags: [],
    categories: []
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(!!postId)
  const [newTag, setNewTag] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [attachMusic, setAttachMusic] = useState<{ id: string; title: string } | null>(null)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    if (postId) {
      loadPost()
    }
  }, [postId])

  const loadPost = async () => {
    if (!postId || !user) return
    
    try {
      setIsLoadingPost(true)
      const { data, error } = await supabase
        .from('artist_blog_posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      
      if (data) {
        setPost(data)
        if (data.featured_image_url) {
          setImagePreview(data.featured_image_url)
        }
      }
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error('Failed to load blog post')
    } finally {
      setIsLoadingPost(false)
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setPost(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }))
  }

  const uploadFeaturedImage = async () => {
    if (!imageFile || !user) return null

    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('artist-content')
        .upload(`blog-images/${fileName}`, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('artist-content')
        .getPublicUrl(`blog-images/${fileName}`)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload featured image')
      return null
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !post.tags.includes(newTag.trim())) {
      setPost(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setPost(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addCategory = () => {
    if (newCategory.trim() && !post.categories.includes(newCategory.trim())) {
      setPost(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }))
      setNewCategory('')
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setPost(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat !== categoryToRemove)
    }))
  }

  const handleSave = async (status: 'draft' | 'published' | 'scheduled' = 'draft') => {
    if (!user || !post.title.trim() || !post.content.trim()) {
      toast.error('Please fill in title and content')
      return
    }

    try {
      setIsLoading(true)
      
      // Upload featured image if there's a new one
      let featuredImageUrl = post.featured_image_url
      if (imageFile) {
        const uploadedUrl = await uploadFeaturedImage()
        if (uploadedUrl) {
          featuredImageUrl = uploadedUrl
        }
      }

      const postData = {
        ...post,
        user_id: user.id,
        featured_image_url: featuredImageUrl,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      if (postId) {
        // Update existing post
        const { error } = await supabase
          .from('artist_blog_posts')
          .update(postData)
          .eq('id', postId)
          .eq('user_id', user.id)

        if (error) throw error
        toast.success('Blog post updated successfully!')
      } else {
        // Create new post
        const { data, error } = await supabase
          .from('artist_blog_posts')
          .insert(postData)
          .select()
          .single()

        if (error) throw error
        if (data) {
          setPost(prev => ({ ...prev, id: data.id }))
        }
        toast.success('Blog post created successfully!')
      }
      
      // Navigate back to blog list
      setTimeout(() => {
        onBack()
      }, 1000)
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save blog post')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingPost) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
          <h1 className="text-2xl font-bold text-white">
            {postId ? 'Edit Blog Post' : 'Create Blog Post'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isLoading}
            className="border-gray-700 text-gray-300"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">Title</Label>
                <Input
                  id="title"
                  value={post.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter post title..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-gray-300">Slug</Label>
                <Input
                  id="slug"
                  value={post.slug}
                  onChange={(e) => setPost(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="post-url-slug"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt" className="text-gray-300">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={post.excerpt}
                  onChange={(e) => setPost(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description of your post..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-gray-300">Content</Label>
                <Textarea
                  id="content"
                  value={post.content}
                  onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your blog post content..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[400px]"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-purple-500/30 text-purple-300"
                    onClick={async () => {
                      const id = prompt('Paste a track ID to attach')
                      if (!id) return
                      try {
                        const res = await fetch('/api/music/share', buildNoStoreInit({
                          method: 'POST',
                          body: JSON.stringify({ musicId: id })
                        }))
                        if (res.ok) {
                          const { payload } = await res.json()
                          setAttachMusic({ id: payload.id, title: payload.title })
                          setPost(prev => ({ ...prev, content: `${prev.content}\n\n[track:${payload.id}]` }))
                          toast.success('Track attached to post')
                        } else toast.error('Track not found')
                      } catch {
                        toast.error('Failed to fetch track')
                      }
                    }}
                  >
                    Attach Music
                  </Button>
                  {attachMusic && (
                    <span className="text-xs text-gray-400">Attached: {attachMusic.title}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Featured Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image" className="text-gray-300">Upload Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              {imagePreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-800">
                  <Image
                    src={imagePreview}
                    alt="Featured image preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Post Settings */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select
                  value={post.status}
                  onValueChange={(value) => setPost(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {post.status === 'scheduled' && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_for" className="text-gray-300">Schedule For</Label>
                  <Input
                    id="scheduled_for"
                    type="datetime-local"
                    value={post.scheduled_for?.slice(0, 16) || ''}
                    onChange={(e) => setPost(prev => ({ ...prev, scheduled_for: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  className="bg-slate-800 border-slate-700 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button onClick={addTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add category..."
                  className="bg-slate-800 border-slate-700 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
                <Button onClick={addCategory} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.categories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 cursor-pointer"
                    onClick={() => removeCategory(category)}
                  >
                    {category} ×
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title" className="text-gray-300">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={post.seo_title || ''}
                  onChange={(e) => setPost(prev => ({ ...prev, seo_title: e.target.value }))}
                  placeholder="SEO optimized title..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description" className="text-gray-300">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={post.seo_description || ''}
                  onChange={(e) => setPost(prev => ({ ...prev, seo_description: e.target.value }))}
                  placeholder="SEO meta description..."
                  className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 