"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, Video, Calendar, MapPin, Music, AtSign, X, Smile } from "lucide-react"
import { useAuth } from "@/context/auth"
import { useSocial } from "@/contexts/social-context"
import { useToast } from "@/hooks/venue/use-toast"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { MediaUploader } from "./media-uploader"
import { EmojiPicker } from "./emoji-picker"
import { motion, AnimatePresence } from "framer-motion"

interface PostCreatorProps {
  onPostCreated?: () => void
  defaultTab?: string
  placeholder?: string
  showTabs?: boolean
}

interface Media {
  type: "image" | "video"
  url: string
}

export function PostCreator({
  onPostCreated,
  defaultTab = "post",
  placeholder = "What's happening in your tour life?",
  showTabs = true,
}: PostCreatorProps) {
  const { user } = useAuth()
  const { createPost } = useSocial()
  const { toast } = useToast()

  const [content, setContent] = useState("")
  const [media, setMedia] = useState<Media[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visibility, setVisibility] = useState<"public" | "private" | "followers">("public")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(defaultTab)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle media upload
  const handleMediaUpload = useCallback(
    (file: File) => {
      // In a real app, you would upload to a server and get a URL back
      // For now, we'll create a placeholder URL
      const reader = new FileReader()

      reader.onload = (e) => {
        const newMedia: Media = {
          type: file.type.startsWith("image/") ? "image" : "video",
          url: e.target?.result as string,
        }

        setMedia((prev) => [...prev, newMedia])

        toast({
          title: "Media added",
          description: "Your media has been added to the post.",
        })
      }

      reader.readAsDataURL(file)
    },
    [toast],
  )

  // Remove media item
  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => prev.filter((_, index) => index.toString() !== id))
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart
      const end = textareaRef.current.selectionEnd

      const newContent = content.substring(0, start) + emoji + content.substring(end)

      setContent(newContent)

      // Focus back on textarea and set cursor position after emoji
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.selectionStart = start + emoji.length
          textareaRef.current.selectionEnd = start + emoji.length
        }
      }, 10)
    } else {
      setContent((prev) => prev + emoji)
    }

    setShowEmojiPicker(false)
  }

  // Handle text input including mentions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)

    // Check for mention
    const lastWord = newContent.split(/\s/).pop() || ""
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.substring(1))
      // In a real app, you would search for users here
      setMentionResults(
        [
          { id: "1", name: "Alex Martinez", username: "alexbeats" },
          { id: "2", name: "Sarah Johnson", username: "sarahsound" },
          { id: "3", name: "Mike Williams", username: "mikeproducer" },
        ].filter(
          (user) =>
            user.name.toLowerCase().includes(mentionQuery?.toLowerCase() || "") ||
            user.username.toLowerCase().includes(mentionQuery?.toLowerCase() || ""),
        ),
      )
    } else {
      setMentionQuery(null)
      setMentionResults([])
    }
  }

  // Handle mention selection
  const handleMentionSelect = (username: string) => {
    if (textareaRef.current && mentionQuery) {
      const currentContent = content
      const lastAtSymbolIndex = currentContent.lastIndexOf("@" + mentionQuery)

      if (lastAtSymbolIndex !== -1) {
        const newContent =
          currentContent.substring(0, lastAtSymbolIndex) +
          `@${username} ` +
          currentContent.substring(lastAtSymbolIndex + mentionQuery.length + 1)

        setContent(newContent)

        // Focus back on textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.selectionStart = newContent.length
            textareaRef.current.selectionEnd = newContent.length
          }
        }, 10)
      }
    }

    setMentionQuery(null)
    setMentionResults([])
  }

  // Submit post
  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) {
      toast({
        title: "Cannot create empty post",
        description: "Please add some text or media to your post.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await createPost({
        content,
        media,
        visibility,
        userId: user?.id || "",
      })

      setContent("")
      setMedia([])

      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      })

      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error creating post",
        description: "There was an error creating your post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <Card className="bg-gray-900 text-white border-gray-800">
        <CardContent className="p-4">
          <div className="text-center py-4">
            <p>Please log in to create posts.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      {showTabs && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
            <TabsTrigger value="poll">Poll</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <CardContent className="p-4">
        <TabsContent value="post" className={!showTabs ? "mt-0" : undefined}>
                     <div className="flex space-x-3">
             <Avatar className="h-10 w-10">
               <AvatarImage src="/placeholder.svg" alt="User" />
               <AvatarFallback>
                 {"User"
                   .split(" ")
                   .map((n) => n[0])
                   .join("")}
               </AvatarFallback>
             </Avatar>

            <div className="flex-1 space-y-3">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder={placeholder}
                  value={content}
                  onChange={handleTextChange}
                  className="w-full min-h-[120px] bg-gray-800 border-gray-700 text-white rounded-md p-3 resize-none"
                />

                {/* Mention suggestions */}
                <AnimatePresence>
                  {mentionQuery && mentionResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute bottom-full left-0 mb-1 w-full max-h-[200px] overflow-y-auto bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10"
                    >
                      {mentionResults.map((user) => (
                        <div
                          key={user.id}
                          className="p-2 hover:bg-gray-700 cursor-pointer flex items-center"
                          onClick={() => handleMentionSelect(user.username)}
                        >
                          <span className="font-medium">{user.name}</span>
                          <span className="ml-2 text-sm text-gray-400">@{user.username}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Media preview */}
              <AnimatePresence>
                {media.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {media.map((item) => (
                      <div key={item.type} className="relative rounded-md overflow-hidden">
                        {item.type === "image" ? (
                          <img src={item.url || "/placeholder.svg"} alt="Uploaded media" className="w-full h-auto" />
                        ) : (
                          <video src={item.url} controls className="w-full h-auto" />
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full"
                          onClick={() => handleRemoveMedia(item.type)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center">
                <div className="flex space-x-1">
                  <MediaUploader
                    onUpload={handleMediaUpload}
                    accept="image/*,video/*"
                    maxSize={10 * 1024 * 1024} // 10MB
                    trigger={
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                    }
                  />

                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Video className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Music className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Calendar className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <MapPin className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <AtSign className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="bg-gray-800 border-gray-700 text-white rounded-md text-sm p-1"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="followers">Followers</option>
                  </select>

                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting || (!content.trim() && media.length === 0)}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Posting...</span>
                      </>
                    ) : (
                      "Post"
                    )}
                  </Button>
                </div>
              </div>

              {/* Emoji picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative z-10"
                  >
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="event">
          <div className="py-4 text-center">
            <h3 className="text-lg font-medium mb-2">Create an Event</h3>
            <p className="text-gray-400">Event creation coming soon!</p>
          </div>
        </TabsContent>

        <TabsContent value="poll">
          <div className="py-4 text-center">
            <h3 className="text-lg font-medium mb-2">Create a Poll</h3>
            <p className="text-gray-400">Poll creation coming soon!</p>
          </div>
        </TabsContent>
      </CardContent>
    </Card>
  )
}
