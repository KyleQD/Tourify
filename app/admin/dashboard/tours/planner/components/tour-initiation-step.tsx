"use client"

import React, { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Music,
  User,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react"
import supabaseClient from "@/lib/supabase/client"
import { toast } from "sonner"

interface TourInitiationStepProps {
  tourData: {
    name: string
    description: string
    mainArtist: string
    genre: string
    coverImage: string
  }
  updateTourData: (updates: any) => void
}

const genres = [
  "Rock", "Pop", "Hip Hop", "Electronic", "Jazz", "Country",
  "R&B", "Classical", "Folk", "Metal", "Punk", "Indie", "Alternative",
]

const MAX_FILE_SIZE_MB = 10

export function TourInitiationStep({ tourData, updateTourData }: TourInitiationStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    updateTourData({ [field]: value })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeMB = file.size / 1024 / 1024
    if (sizeMB > MAX_FILE_SIZE_MB) {
      toast.error(`Image must be smaller than ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      toast.error('Only JPEG, PNG, and WebP images are accepted')
      return
    }

    setUploading(true)
    try {
      const supabase = supabaseClient
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileName = `${user.id}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from('tour-covers')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('tour-covers').getPublicUrl(fileName)
      updateTourData({ coverImage: publicUrl })
      toast.success('Cover image uploaded')
    } catch (err: any) {
      // Fallback: use local data URL so user can still proceed
      const reader = new FileReader()
      reader.onload = (ev) => {
        updateTourData({ coverImage: ev.target?.result as string })
        toast.warning('Storage upload failed — using local preview. Save to persist.')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Tour Name */}
      <div className="space-y-2">
        <Label htmlFor="tour-name" className="text-white font-medium">Tour Name *</Label>
        <Input
          id="tour-name"
          placeholder="Enter tour name..."
          value={tourData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Main Artist */}
      <div className="space-y-2">
        <Label htmlFor="main-artist" className="text-white font-medium">Main Artist / Headliner *</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            id="main-artist"
            placeholder="Enter main artist name..."
            value={tourData.mainArtist}
            onChange={(e) => handleInputChange("mainArtist", e.target.value)}
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 pl-10"
          />
        </div>
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <Label className="text-white font-medium">Genre *</Label>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <Badge
              key={genre}
              variant={tourData.genre === genre ? "default" : "secondary"}
              className={`cursor-pointer transition-all ${
                tourData.genre === genre
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              onClick={() => handleInputChange("genre", genre)}
            >
              <Music className="w-3 h-3 mr-1" />
              {genre}
            </Badge>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-white font-medium">Tour Description</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
          <Textarea
            id="description"
            placeholder="Describe your tour, concept, or theme..."
            value={tourData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 pl-10 min-h-[100px]"
          />
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <Label className="text-white font-medium">Tour Cover Image</Label>
        <p className="text-slate-500 text-xs">JPEG, PNG, or WebP · Max {MAX_FILE_SIZE_MB}MB</p>
        <Card className="p-6 bg-slate-900/30 border-slate-700 border-dashed">
          {tourData.coverImage ? (
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={tourData.coverImage}
                  alt="Tour cover"
                  className="w-full max-w-xs mx-auto rounded-lg mb-4 object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange("coverImage", "")}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 hover:bg-black"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Change Image
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">Upload a cover image for your tour</p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
            className="hidden"
          />
        </Card>
      </div>

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.name && tourData.mainArtist && tourData.genre ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">All required fields completed</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Complete required fields to continue</span>
          </>
        )}
      </div>
    </div>
  )
}
