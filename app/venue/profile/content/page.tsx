"use client"

import { useState, useEffect } from "react"
import { Grid3x3, List, Filter, ImageIcon, Film, Music, FileText, Eye, Heart, MessageSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import ContentUploader from "../../components/content-uploader"
import { mockContent } from "../../../lib/mock-data"
import Image from "next/image"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Mock user ID for demo purposes
const CURRENT_USER_ID = "user-1"

// Use the imported mockContent and assert its type for placeholder
interface MockContentItem {
  id: string
  contentType: string
  // Add other fields as needed for placeholder
  thumbnailUrl?: string
  url?: string
  title?: string
  isPublic?: boolean
  description?: string
  tags?: string[]
  views?: number
  likes?: number
  comments?: number
  createdAt?: string
}

const contentItems: MockContentItem[] = (mockContent as MockContentItem[])

export default function ContentPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filteredItems, setFilteredItems] = useState(contentItems)
  const [activeFilter, setActiveFilter] = useState<string>("all")

  // Filter content items
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredItems(contentItems)
    } else {
      setFilteredItems(contentItems.filter((item) => item.contentType === activeFilter))
    }
  }, [activeFilter, contentItems])

  const handleAddContent = (newContent: any) => {
    setFilteredItems([newContent, ...contentItems])
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Film className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Content</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your uploaded content</p>
        </div>

        <div className="flex items-center space-x-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Upload New Content</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ContentUploader userId={CURRENT_USER_ID} onUploadComplete={handleAddContent} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveFilter}>
        <div className="flex items-center mb-6">
          <Filter className="h-5 w-5 mr-2 text-muted-foreground" />
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="document">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="image" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="video" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audio" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="document" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <ContentListItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No content items found.</p>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Content
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Upload New Content</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <ContentUploader userId={CURRENT_USER_ID} onUploadComplete={handleAddContent} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}

interface ContentCardProps {
  item: MockContentItem
}

function ContentCard({ item }: ContentCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video">
        <Image src={item.thumbnailUrl || item.url || "/placeholder.svg"} alt={item.title || "Content"} fill className="object-cover" />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="flex items-center space-x-1">
            {getContentTypeIcon(item.contentType)}
            <span className="ml-1 capitalize">{item.contentType}</span>
          </Badge>
        </div>
        {!item.isPublic && (
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="bg-background/80">
              Private
            </Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {(item.tags?.length || 0) > 3 && (
            <Badge variant="outline" className="text-xs">
              +{(item.tags?.length || 0) - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground pt-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            {item.views || 0}
          </span>
          <span className="flex items-center">
            <Heart className="h-4 w-4 mr-1" />
            {item.likes || 0}
          </span>
          <span className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            {item.comments || 0}
          </span>
        </div>
        <span className="text-xs">{formatSafeDate(item.createdAt || new Date().toISOString())}</span>
      </CardFooter>
    </Card>
  )
}

function ContentListItem({ item }: ContentCardProps) {
  return (
    <div className="flex items-center space-x-4 border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="relative h-16 w-16 flex-shrink-0">
        <Image src={item.thumbnailUrl || item.url || "/placeholder.svg"} alt={item.title || "Content"} fill className="object-cover rounded-md" />
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center">
          <h3 className="font-medium truncate">{item.title}</h3>
          <div className="ml-2 flex-shrink-0">
            <Badge variant="secondary" className="flex items-center space-x-1">
              {getContentTypeIcon(item.contentType)}
              <span className="ml-1 capitalize">{item.contentType}</span>
            </Badge>
          </div>
          {!item.isPublic && (
            <Badge variant="outline" className="ml-2 flex-shrink-0">
              Private
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{item.description}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              {item.views}
            </span>
            <span className="flex items-center">
              <Heart className="h-3 w-3 mr-1" />
              {item.likes}
            </span>
            <span className="flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              {item.comments}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{formatSafeDate(item.createdAt || new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  )
}

function getContentTypeIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="h-4 w-4" />
    case "video":
      return <Film className="h-4 w-4" />
    case "audio":
      return <Music className="h-4 w-4" />
    case "document":
      return <FileText className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}
