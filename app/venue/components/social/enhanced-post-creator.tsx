"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ImageIcon,
  Video,
  Calendar,
  MapPin,
  Music,
  AtSign,
  X,
  Smile,
  Globe,
  Users,
  Lock,
  AlertCircle,
  Loader2,
  LinkIcon,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useSocial } from "@/contexts/social-context"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { LinkPreview } from "@/components/ui/link-preview"
import { MediaUploader } from "./media-uploader"
import { EmojiPicker } from "./emoji-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { moderateContent } from "@/lib/venue/moderation-service"
import { motion, AnimatePresence } from "framer-motion"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface EnhancedPostCreatorProps {
  onPostCreated?: () => void
  defaultTab?: string
  placeholder?: string
  showTabs?: boolean
  maxMediaItems?: number
  className?: string
}

export function EnhancedPostCreator({
  onPostCreated,
  defaultTab = "post",
  placeholder = "What's happening in your tour life?",
  showTabs = true,
  maxMediaItems = 4,
  className = "",
}: EnhancedPostCreatorProps) {
  const { user } = useAuth()
  const socialContext = useSocial() // Keep for future use but don't destructure non-existent properties
  const { toast } = useToast()

  // Mock implementations since these don't exist in social context
  const createPost = async (postData: any) => {
    // Mock implementation
    console.log("Creating post:", postData)
    return { success: true, postId: "mock-post-id" }
  }
  const users: any[] = []

  const [content, setContent] = useState("")
  const [media, setMedia] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visibility, setVisibility] = useState<"public" | "connections" | "private">("public")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showPreview, setShowPreview] = useState(false)
  const [showModerationWarning, setShowModerationWarning] = useState(false)
  const [moderationResult, setModerationResult] = useState<any>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""])
  const [pollDuration, setPollDuration] = useState("1d")
  const [eventDetails, setEventDetails] = useState({
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  })
  const [linkPreview, setLinkPreview] = useState<any>(null)
  const [isGeneratingLinkPreview, setIsGeneratingLinkPreview] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [schedulePost, setSchedulePost] = useState(false)
  const [scheduledTime, setScheduledTime] = useState("")
  const [charCount, setCharCount] = useState(0)
  const MAX_CHARS = 500

  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Update character count
  useEffect(() => {
    setCharCount(content.length)
  }, [content])

  // Extract links from content for preview
  useEffect(() => {
    const extractLinks = async () => {
      if (!content) {
        setLinkPreview(null)
        return
      }

      // Simple regex to extract URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const matches = content.match(urlRegex)

      if (matches && matches.length > 0 && !linkPreview) {
        setIsGeneratingLinkPreview(true)
        try {
          // Call our link preview API
          const response = await fetch('/api/link-preview', buildNoStoreInit({
            method: 'POST',
            body: JSON.stringify({ url: matches[0] }),
          }))

          if (!response.ok) {
            throw new Error('Failed to fetch link preview')
          }

          const data = await response.json()
          setLinkPreview(data)
        } catch (error) {
          console.error("Error generating link preview:", error)
        } finally {
          setIsGeneratingLinkPreview(false)
        }
      }
    }

    extractLinks()
  }, [content, linkPreview])

  // Handle media upload
  const handleMediaUpload = useCallback(
    (file: File) => {
      if (media.length >= maxMediaItems) {
        toast({
          title: "Maximum media items reached",
          description: `You can only add up to ${maxMediaItems} media items per post.`,
          variant: "destructive",
        })
        return
      }

      // In a real app, you would upload to a server and get a URL back
      const reader = new FileReader()

      reader.onload = (e) => {
        const newMedia = {
          id: `media-${Date.now()}`,
          type: file.type.startsWith("image/") ? "image" : "video",
          url: e.target?.result as string,
          file,
        }

        setMedia((prev) => [...prev, newMedia])

        toast({
          title: "Media added",
          description: "Your media has been added to the post.",
        })
      }

      reader.readAsDataURL(file)
    },
    [toast, media.length, maxMediaItems],
  )

  // Remove media item
  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => prev.filter((item) => item.id !== id))
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

    if (newContent.length <= MAX_CHARS) {
      setContent(newContent)
    }

    // Check for mention
    const lastWord = newContent.split(/\s/).pop() || ""
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.substring(1))
      // Search for users
      const query = lastWord.substring(1).toLowerCase()
      setMentionResults(
        users
          .filter((user) => user.fullName.toLowerCase().includes(query) || user.username.toLowerCase().includes(query))
          .slice(0, 5),
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

  // Add poll option
  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, ""])
    }
  }

  // Remove poll option
  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = [...pollOptions]
      newOptions.splice(index, 1)
      setPollOptions(newOptions)
    }
  }

  // Update poll option
  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions]
    newOptions[index] = value
    setPollOptions(newOptions)
  }

  // Remove link preview
  const handleRemoveLinkPreview = () => {
    setLinkPreview(null)
  }

  // Check content moderation
  const checkContentModeration = async () => {
    if (!content.trim() && media.length === 0) return true

    try {
      const result = await moderateContent(content)
      setModerationResult(result)

      if (!result.isSafe) {
        setShowModerationWarning(true)
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking content moderation:", error)
      return true // Allow post if moderation check fails
    }
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

    // Check content moderation
    const moderationPassed = await checkContentModeration()
    if (!moderationPassed) return

    setIsSubmitting(true)

    try {
      // In a real app, you would upload media files to a server here
      // and get back URLs to use in the post
      const mediaItems = media.map((item) => ({
        type: item.type,
        url: item.url,
        alt: `Media uploaded by User`,
      }))

      // Prepare post metadata
      const metadata = {
        visibility,
        allowComments,
        linkPreview: linkPreview
          ? {
              url: linkPreview.url,
              title: linkPreview.title,
              description: linkPreview.description,
              image: linkPreview.image,
            }
          : undefined,
        scheduledFor: schedulePost ? new Date(scheduledTime).toISOString() : undefined,
      }

      // Create post based on active tab
      if (activeTab === "post") {
        await createPost({
          content,
          media: mediaItems,
          visibility: visibility === "public" ? "public" : visibility,
          metadata
        })
      } else if (activeTab === "poll") {
        // In a real app, you would create a poll post
        const validOptions = pollOptions.filter((opt) => opt.trim().length > 0)
        if (validOptions.length < 2) {
          toast({
            title: "Invalid poll",
            description: "Please add at least two poll options.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        await createPost({
          content,
          media: [],
          visibility: visibility === "public" ? "public" : visibility,
          metadata: {
            ...metadata,
            pollOptions: validOptions,
            pollDuration,
            pollQuestion: content, // Assuming content is the question for a poll
          }
        })
      } else if (activeTab === "event") {
        // In a real app, you would create an event post
        if (!eventDetails.title || !eventDetails.startDate) {
          toast({
            title: "Invalid event",
            description: "Please add at least a title and start date for your event.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }

        await createPost({
          content,
          media: mediaItems,
          visibility: visibility === "public" ? "public" : visibility,
          metadata,
          eventDetails,
        })
      }

      // Reset form
      setContent("")
      setMedia([])
      setLinkPreview(null)
      setPollOptions(["", ""])
      setEventDetails({
        title: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
      })
      setSchedulePost(false)
      setScheduledTime("")

      toast({
        title: "Post created",
        description: schedulePost ? "Your post has been scheduled." : "Your post has been published successfully.",
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
    <Card className={`bg-gray-900 text-white border-gray-800 ${className}`}>
      {showTabs && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="post" className="flex items-center gap-1">
              <Globe className="h-4 w-4" /> Post
            </TabsTrigger>
            <TabsTrigger value="event" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Event
            </TabsTrigger>
            <TabsTrigger value="poll" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Poll
            </TabsTrigger>
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

                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {charCount}/{MAX_CHARS}
                </div>

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
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src="/placeholder.svg" alt="User" />
                            <AvatarFallback>
                              {"User"
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">User</span>
                            <span className="ml-2 text-sm text-gray-400">@user</span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Link preview */}
              <AnimatePresence>
                {linkPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full z-10 z-20"
                      onClick={handleRemoveLinkPreview}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <LinkPreview 
                      url={linkPreview.url}
                      className="pointer-events-none"
                    />
                  </motion.div>
                )}
                {isGeneratingLinkPreview && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2 text-sm text-gray-400"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating link preview...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Media preview */}
              <AnimatePresence>
                {media.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`grid ${media.length === 1 ? "grid-cols-1" : media.length === 2 ? "grid-cols-2" : "grid-cols-2"} gap-2`}
                  >
                    {media.map((item) => (
                      <div key={item.id} className="relative rounded-md overflow-hidden">
                        {item.type === "image" ? (
                          <img src={item.url || "/placeholder.svg"} alt="Uploaded media" className="w-full h-auto" />
                        ) : (
                          <video src={item.url} controls className="w-full h-auto" />
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full"
                          onClick={() => handleRemoveMedia(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Advanced options */}
              <AnimatePresence>
                {showAdvancedOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 bg-gray-800 p-3 rounded-md"
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allow-comments" className="text-sm">
                        Allow comments
                      </Label>
                      <Switch id="allow-comments" checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="schedule-post" className="text-sm">
                        Schedule post
                      </Label>
                      <Switch id="schedule-post" checked={schedulePost} onCheckedChange={setSchedulePost} />
                    </div>

                    {schedulePost && (
                      <div>
                        <Label htmlFor="scheduled-time" className="text-sm">
                          Schedule time
                        </Label>
                        <Input
                          id="scheduled-time"
                          type="datetime-local"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="mt-1 bg-gray-700 border-gray-600"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center">
                <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add image</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <Video className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add video</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <Music className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add music</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <MapPin className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add location</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 hover:text-white"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add emoji</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <AtSign className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mention someone</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                          <LinkIcon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add link</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-gray-300"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions ? "Hide options" : "More options"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        {visibility === "public" ? (
                          <Globe className="h-4 w-4 mr-1" />
                        ) : visibility === "connections" ? (
                          <Users className="h-4 w-4 mr-1" />
                        ) : (
                          <Lock className="h-4 w-4 mr-1" />
                        )}
                        {visibility === "public" ? "Public" : visibility === "connections" ? "Connections" : "Private"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem onClick={() => setVisibility("public")} className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        <div>
                          <p>Public</p>
                          <p className="text-xs text-gray-400">Anyone can see this post</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("connections")} className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <div>
                          <p>Connections only</p>
                          <p className="text-xs text-gray-400">Only your connections can see this post</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("private")} className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        <div>
                          <p>Private</p>
                          <p className="text-xs text-gray-400">Only you can see this post</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting || (!content.trim() && media.length === 0)}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Posting...</span>
                      </>
                    ) : schedulePost ? (
                      "Schedule"
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
          <div className="space-y-4">
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
                <Input
                  placeholder="Event title"
                  value={eventDetails.title}
                  onChange={(e) => setEventDetails({ ...eventDetails, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start-date" className="text-sm">
                      Start date
                    </Label>
                    <Input
                      id="start-date"
                      type="datetime-local"
                      value={eventDetails.startDate}
                      onChange={(e) => setEventDetails({ ...eventDetails, startDate: e.target.value })}
                      className="mt-1 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm">
                      End date
                    </Label>
                    <Input
                      id="end-date"
                      type="datetime-local"
                      value={eventDetails.endDate}
                      onChange={(e) => setEventDetails({ ...eventDetails, endDate: e.target.value })}
                      className="mt-1 bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>

                <Input
                  placeholder="Location"
                  value={eventDetails.location}
                  onChange={(e) => setEventDetails({ ...eventDetails, location: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />

                <Textarea
                  placeholder="Event description"
                  value={eventDetails.description}
                  onChange={(e) => setEventDetails({ ...eventDetails, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                />

                <Textarea
                  placeholder="Add a message about this event (optional)"
                  value={content}
                  onChange={handleTextChange}
                  className="bg-gray-800 border-gray-700 text-white"
                />

                {/* Media upload for event cover */}
                <div className="flex items-center space-x-2">
                  <MediaUploader
                    onUpload={handleMediaUpload}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    trigger={
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add cover image
                      </Button>
                    }
                  />

                  <span className="text-xs text-gray-400">
                    {media.length > 0 ? `${media.length} image${media.length > 1 ? "s" : ""} added` : "No images added"}
                  </span>
                </div>

                {/* Media preview */}
                <AnimatePresence>
                  {media.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 gap-2"
                    >
                      {media.map((item) => (
                        <div key={item.id} className="relative rounded-md overflow-hidden">
                          <img src={item.url || "/placeholder.svg"} alt="Event cover" className="w-full h-auto" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full"
                            onClick={() => handleRemoveMedia(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        {visibility === "public" ? (
                          <Globe className="h-4 w-4 mr-1" />
                        ) : visibility === "connections" ? (
                          <Users className="h-4 w-4 mr-1" />
                        ) : (
                          <Lock className="h-4 w-4 mr-1" />
                        )}
                        {visibility === "public" ? "Public" : visibility === "connections" ? "Connections" : "Private"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem onClick={() => setVisibility("public")} className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        <div>
                          <p>Public</p>
                          <p className="text-xs text-gray-400">Anyone can see this event</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("connections")} className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <div>
                          <p>Connections only</p>
                          <p className="text-xs text-gray-400">Only your connections can see this event</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("private")} className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        <div>
                          <p>Private</p>
                          <p className="text-xs text-gray-400">Only you can see this event</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting || !eventDetails.title || !eventDetails.startDate}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Creating...</span>
                      </>
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="poll">
          <div className="space-y-4">
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
                <Textarea
                  placeholder="Ask a question..."
                  value={content}
                  onChange={handleTextChange}
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />

                <div className="space-y-2">
                  <Label className="text-sm">Poll options</Label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => handlePollOptionChange(index, e.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      {index > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePollOption(index)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddPollOption}
                      className="mt-2 border-gray-700 text-gray-300"
                    >
                      Add option
                    </Button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="poll-duration" className="text-sm">
                    Poll duration
                  </Label>
                  <select
                    id="poll-duration"
                    value={pollDuration}
                    onChange={(e) => setPollDuration(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white rounded-md text-sm p-1"
                  >
                    <option value="1d">1 day</option>
                    <option value="3d">3 days</option>
                    <option value="1w">1 week</option>
                    <option value="2w">2 weeks</option>
                  </select>
                </div>

                <div className="flex justify-between items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        {visibility === "public" ? (
                          <Globe className="h-4 w-4 mr-1" />
                        ) : visibility === "connections" ? (
                          <Users className="h-4 w-4 mr-1" />
                        ) : (
                          <Lock className="h-4 w-4 mr-1" />
                        )}
                        {visibility === "public" ? "Public" : visibility === "connections" ? "Connections" : "Private"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-gray-800 border-gray-700">
                      <DropdownMenuItem onClick={() => setVisibility("public")} className="flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        <div>
                          <p>Public</p>
                          <p className="text-xs text-gray-400">Anyone can see this poll</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("connections")} className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <div>
                          <p>Connections only</p>
                          <p className="text-xs text-gray-400">Only your connections can see this poll</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisibility("private")} className="flex items-center">
                        <Lock className="h-4 w-4 mr-2" />
                        <div>
                          <p>Private</p>
                          <p className="text-xs text-gray-400">Only you can see this poll</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={isSubmitting || !content.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">Creating...</span>
                      </>
                    ) : (
                      "Create Poll"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </CardContent>

      {/* Content moderation warning dialog */}
      <Dialog open={showModerationWarning} onOpenChange={setShowModerationWarning}>
        <DialogContent className="bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              Content Warning
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Your post may contain inappropriate content.
            </DialogDescription>
          </DialogHeader>

          {moderationResult && (
            <div className="space-y-3">
              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Flagged content:</p>
                <p className="text-sm text-gray-300">{moderationResult.original}</p>
              </div>

              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Suggested revision:</p>
                <p className="text-sm text-gray-300">{moderationResult.moderated}</p>
              </div>

              <div className="bg-gray-800 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Flags:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(moderationResult.flags).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${value ? "bg-red-500" : "bg-green-500"}`}></div>
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between">
            <Button variant="outline" onClick={() => setShowModerationWarning(false)} className="border-gray-700">
              Edit Post
            </Button>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (moderationResult) {
                    setContent(moderationResult.moderated)
                  }
                  setShowModerationWarning(false)
                  handleSubmit()
                }}
                className="border-gray-700"
              >
                Use Suggestion
              </Button>

              <Button
                onClick={() => {
                  setShowModerationWarning(false)
                  handleSubmit()
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Post Anyway
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
