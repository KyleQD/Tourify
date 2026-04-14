"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ImageIcon, VideoIcon, MapPinIcon, BarChart3, CalendarIcon, Globe2Icon, LockIcon, UsersIcon } from "lucide-react"
import { useSocial } from "@/contexts/social"
import { useAuth } from "@/contexts/auth"
import { cn } from "@/lib/utils"
import { PostCreatorProps } from "./types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function PostCreator({
  onPostCreated,
  defaultVisibility = "public",
  defaultContent = "",
  defaultMedia = [],
  defaultLocation = ""
}: PostCreatorProps) {
  const { createPost } = useSocial()
  const { user } = useAuth()
  const [content, setContent] = useState(defaultContent)
  const [media, setMedia] = useState(defaultMedia)
  const [location, setLocation] = useState(defaultLocation)
  const [visibility, setVisibility] = useState(defaultVisibility)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPollDialog, setShowPollDialog] = useState(false)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async () => {
    if (!content.trim() && !media.length) return

    setIsSubmitting(true)
    try {
      await createPost({
        content: content.trim(),
        media,
        location,
        visibility,
        userId: user!.id
      })
      setContent("")
      setMedia([])
      setLocation("")
      onPostCreated()
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const newMedia = files.map(file => ({
      type: file.type.startsWith("image/") ? "image" : "video",
      url: URL.createObjectURL(file),
      aspectRatio: 16 / 9, // You would calculate this from the actual file
      alt: file.name
    }))
    setMedia([...media, ...newMedia] as any)
  }

  const handleMediaClick = () => {
    fileInputRef.current?.click()
  }

  const renderVisibilityIcon = () => {
    switch (visibility) {
      case "private":
        return <LockIcon className="h-4 w-4" />
      case "followers":
        return <UsersIcon className="h-4 w-4" />
      default:
        return <Globe2Icon className="h-4 w-4" />
    }
  }

  return (
    <Card className="bg-gray-900 text-white border-gray-800">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
            <AvatarFallback>{user?.user_metadata?.full_name?.[0] || user?.email?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] bg-gray-800 border-gray-700 resize-none"
            />
            {media.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {media.map((item, index) => (
                  <div key={index} className="relative aspect-video">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="rounded object-cover w-full h-full"
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="rounded object-cover w-full h-full"
                        controls
                      />
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setMedia(media.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMediaClick}
                  className="text-gray-400 hover:text-white"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMediaClick}
                  className="text-gray-400 hover:text-white"
                >
                  <VideoIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(location ? "" : "Current Location")}
                  className={cn(
                    "text-gray-400 hover:text-white",
                    location && "text-purple-500"
                  )}
                >
                  <MapPinIcon className="h-4 w-4" />
                </Button>
                <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a Poll</DialogTitle>
                    </DialogHeader>
                    {/* Add poll creation form */}
                  </DialogContent>
                </Dialog>
                <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Event Details</DialogTitle>
                    </DialogHeader>
                    {/* Add event details form */}
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={visibility}
                  onValueChange={(value: typeof visibility) => setVisibility(value)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe2Icon className="h-4 w-4" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="followers">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        <span>Followers</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <LockIcon className="h-4 w-4" />
                        <span>Private</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSubmit}
                  disabled={(!content.trim() && !media.length) || isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 