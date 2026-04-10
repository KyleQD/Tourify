"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, Video, Users, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"
import type { PostFormData } from "@/types/post"

interface PostFormProps {
  user: {
    id: string
    display_name: string
    username: string
    profile_picture_url: string
  }
  onPostCreated: () => void
}

export function PostForm({ user, onPostCreated }: PostFormProps) {
  const [content, setContent] = React.useState("")
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [isPosting, setIsPosting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const handleFileSelect = (type: "image" | "video") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === "image" ? "image/*" : "video/*"
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setSelectedFiles(Array.from(files))
    }
  }

  const handleMediaUpload = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.username}/posts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && selectedFiles.length === 0) return

    setIsPosting(true)
    try {
      // Upload media files
      const mediaUrls = await Promise.all(
        selectedFiles.map((file: File) => handleMediaUpload(file))
      )

      // Create post
      const { error } = await supabase.from('posts').insert({
        content,
        media_urls: mediaUrls,
        user_id: user.id
      })

      if (error) {
        console.error('Post creation error:', error)
        throw error
      }

      // Reset form
      setContent('')
      setSelectedFiles([])
      onPostCreated()
      
      toast({
        title: "Success",
        description: "Post created successfully",
      })
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 bg-[#13151c] rounded-lg border border-gray-800 p-6 shadow-lg hover:border-purple-500/50 transition-colors">
      <div className="flex gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.profile_picture_url} alt={user.display_name} />
          <AvatarFallback>{user.display_name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            placeholder="What's happening in your tour life?"
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            className="w-full min-h-[120px] bg-[#1a1d26] border-gray-800 rounded-lg p-4 text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow text-lg"
          />
          {selectedFiles.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {selectedFiles.map((file: File, index: number) => (
                <div key={index} className="relative flex-shrink-0">
                  <div className="h-24 w-24 bg-gray-800 rounded-lg flex items-center justify-center">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    ) : (
                      <Video className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles((files: File[]) => files.filter((_, i: number) => i !== index))}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 text-white text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleFileSelect("image")}
                className="bg-[#1a1d26] border-gray-800 hover:bg-gray-800 hover:text-purple-500 transition-colors"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleFileSelect("video")}
                className="bg-[#1a1d26] border-gray-800 hover:bg-gray-800 hover:text-purple-500 transition-colors"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="bg-[#1a1d26] border-gray-800 hover:bg-gray-800 hover:text-purple-500 transition-colors"
              >
                <Users className="h-5 w-5" />
              </Button>
            </div>
            <Button
              type="submit"
              disabled={!content.trim() && selectedFiles.length === 0}
              className="bg-purple-600 hover:bg-purple-700 transition-colors px-6"
            >
              {isPosting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
} 