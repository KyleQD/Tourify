"use client"

// Prevent pre-rendering since this page requires authentication
export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ContentModeration } from "../../components/content-moderation"
import { useAuth } from "../../context/auth-context"
import { LoadingSpinner } from "../../components/loading-spinner"
import { useRouter } from "next/navigation"
import { Shield, AlertTriangle, CheckCircle } from "lucide-react"
import {
  getModerationHistory,
  updateModerationStatus,
  getModerationSettings,
  updateModerationSettings,
  type ModerationHistoryItem,
  moderateContent,
  ModeratedContent,
} from "../../lib/moderation-service"

export default function ModerationPage() {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [moderationResult, setModerationResult] = useState<ModeratedContent | null>(null)
  const [moderationHistory, setModerationHistory] = useState<ModerationHistoryItem[]>([])
  const [settings, setSettings] = useState({
    automaticModeration: true,
    profanityFilter: true,
    notificationPreferences: true,
  })
  const [loading, setLoading] = useState(true)

  // Load moderation history and settings
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const history = getModerationHistory()
        const settings = getModerationSettings()

        setModerationHistory(history)
        setSettings({
          automaticModeration: true,
          profanityFilter: true,
          notificationPreferences: true,
          ...settings
        })
      } catch (error) {
        console.error("Error loading moderation data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    router.push("/login")
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const handleModerated = (result: ModeratedContent) => {
    setModerationResult(result)
  }

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    updateModerationStatus(id, status)

    // Update local state
    setModerationHistory((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))

    updateModerationSettings({
      [key]: value,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        <p className="text-gray-400">Check your content before posting to ensure it meets community guidelines</p>
      </div>

      <Tabs defaultValue="check">
        <TabsList className="bg-gray-800">
          <TabsTrigger value="check">Check Content</TabsTrigger>
          <TabsTrigger value="history">Moderation History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="check" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-purple-400" />
                  Content to Check
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter content to check for moderation..."
                    className="min-h-[200px] bg-gray-800 border-gray-700 text-white"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    disabled={!content.trim()}
                    onClick={() => {
                      // The ContentModeration component will handle the check
                    }}
                  >
                    Check Content
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ContentModeration
              content={content}
              onModerated={handleModerated}
              autoModerate={!!content.trim() && settings.automaticModeration}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-gray-900 text-white border-gray-800">
            <CardHeader>
              <CardTitle>Moderation History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : moderationHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No moderation history found.</div>
              ) : (
                <div className="space-y-4">
                  {moderationHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center p-3 border rounded-md ${
                        item.status === "approved"
                          ? "border-green-800 bg-green-900/20"
                          : item.status === "rejected"
                            ? "border-red-800 bg-red-900/20"
                            : "border-yellow-800 bg-yellow-900/20"
                      }`}
                    >
                      {item.status === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : item.status === "rejected" ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.content.substring(0, 50)}
                          {item.content.length > 50 ? "..." : ""}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)} •{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(item.date))}
                        </p>
                      </div>

                      {item.status === "pending" && (
                        <div className="flex space-x-2 ml-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8 px-2"
                            onClick={() => updateStatus(item.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-500 hover:bg-red-950 h-8 px-2"
                            onClick={() => updateStatus(item.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="bg-gray-900 text-white border-gray-800">
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatic Content Moderation</p>
                      <p className="text-sm text-gray-400">Check content automatically before posting</p>
                    </div>
                    <Switch
                      checked={settings.automaticModeration}
                      onCheckedChange={(checked) => updateSetting("automaticModeration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Profanity Filter</p>
                      <p className="text-sm text-gray-400">Automatically filter out profanity</p>
                    </div>
                    <Switch
                      checked={settings.profanityFilter}
                      onCheckedChange={(checked) => updateSetting("profanityFilter", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notification Preferences</p>
                      <p className="text-sm text-gray-400">Get notified when content is flagged</p>
                    </div>
                    <Switch
                      checked={settings.notificationPreferences}
                      onCheckedChange={(checked) => updateSetting("notificationPreferences", checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
