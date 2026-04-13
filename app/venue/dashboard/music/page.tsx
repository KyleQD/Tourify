"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Breadcrumbs } from "../../components/navigation/breadcrumbs"
import { MusicUploader } from "../../components/music/music-uploader"
import { MusicLibrary } from "../../components/music/music-library"
import { MusicAnalytics } from "../../components/music/music-analytics"
import { MusicPromotionTools } from "../../components/music/music-promotion-tools"
import { Plus, Music, BarChart3, Share2 } from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

export default function MusicPage() {
  const [activeTab, setActiveTab] = useState("library")

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Music", href: "/music", active: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-2xl font-bold mt-2">Music</h1>
          <p className="text-gray-400">Upload, manage, and promote your music</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-700" onClick={() => setActiveTab("analytics")}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setActiveTab("upload")}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Music
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={venueDashboardTabListClass}>
          <TabsTrigger value="library" className="flex items-center">
            <Music className="h-4 w-4 mr-2" />
            My Music
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="promotion" className="flex items-center">
            <Share2 className="h-4 w-4 mr-2" />
            Promotion
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <MusicLibrary />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Upload Music</CardTitle>
              <CardDescription>Upload your tracks, albums, and EPs to share with your audience</CardDescription>
            </CardHeader>
            <CardContent>
              <MusicUploader />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Promotion Tools</CardTitle>
              <CardDescription>Promote your music and reach a wider audience</CardDescription>
            </CardHeader>
            <CardContent>
              <MusicPromotionTools />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Music Analytics</CardTitle>
              <CardDescription>Track the performance of your music</CardDescription>
            </CardHeader>
            <CardContent>
              <MusicAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
