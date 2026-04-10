"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUpload } from "@/components/ui/image-upload"
import { Images as Gallery, ImageIcon, Video, Music, FileText } from "lucide-react"

interface PortfolioItem {
  id: string
  type: "image" | "video" | "audio" | "document"
  title: string
  description: string
  url: string
  thumbnail?: string
}

export function PortfolioBuilder() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [activeTab, setActiveTab] = useState("gallery")

  const handleFileUpload = async (file: File, type: PortfolioItem["type"]) => {
    // TODO: Implement file upload to your storage service
    const newItem: PortfolioItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: file.name,
      description: "",
      url: URL.createObjectURL(file),
      thumbnail: type === "video" ? URL.createObjectURL(file) : undefined
    }
    setItems([...items, newItem])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 gap-4">
              <TabsTrigger value="gallery">
                <Gallery className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Video className="w-4 h-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="music">
                <Music className="w-4 h-4 mr-2" />
                Music
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {items.filter(item => item.type === "image").map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <img src={item.url} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                      <div className="mt-2">
                        <Input value={item.title} placeholder="Title" />
                        <Textarea value={item.description} placeholder="Description" className="mt-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  className="h-48 flex flex-col items-center justify-center"
                  onClick={() => document.getElementById("image-upload")?.click()}
                >
                  <ImageIcon className="w-8 h-8 mb-2" />
                  Add Image
                </Button>
              </div>
            </TabsContent>

            {/* Similar TabsContent for videos, music, and documents */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 