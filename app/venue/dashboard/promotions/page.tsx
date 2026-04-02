"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreatePromotionModal } from "../../components/promotions/create-promotion-modal"
import { BarChart3, Calendar, Clock, DollarSign, Eye, MousePointer, Plus, Search, ShoppingCart } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeNumber } from "@/lib/format/number-format"

export default function PromotionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const [selectedContent, setSelectedContent] = useState<{
    id: string
    type: "event" | "post" | "profile" | "job"
    title: string
  } | null>(null)

  // Mock data for promotions
  const promotions = [
    {
      id: "promo-1",
      contentId: "event-1",
      contentType: "event",
      contentTitle: "Summer Jam Festival",
      budget: 150,
      spent: 75,
      startDate: "2024-04-01",
      endDate: "2024-04-15",
      status: "active",
      metrics: {
        impressions: 3250,
        clicks: 420,
        conversions: 35,
      },
    },
    {
      id: "promo-2",
      contentId: "post-1",
      contentType: "post",
      contentTitle: "New Album Announcement",
      budget: 100,
      spent: 100,
      startDate: "2024-03-15",
      endDate: "2024-03-22",
      status: "completed",
      metrics: {
        impressions: 5800,
        clicks: 780,
        conversions: 120,
      },
    },
    {
      id: "promo-3",
      contentId: "profile-1",
      contentType: "profile",
      contentTitle: "Artist Profile",
      budget: 200,
      spent: 50,
      startDate: "2024-04-05",
      endDate: "2024-05-05",
      status: "active",
      metrics: {
        impressions: 1200,
        clicks: 180,
        conversions: 15,
      },
    },
    {
      id: "promo-4",
      contentId: "job-1",
      contentType: "job",
      contentTitle: "Drummer Needed for Summer Tour",
      budget: 75,
      spent: 25,
      startDate: "2024-04-10",
      endDate: "2024-04-24",
      status: "active",
      metrics: {
        impressions: 850,
        clicks: 95,
        conversions: 8,
      },
    },
    {
      id: "promo-5",
      contentId: "event-2",
      contentType: "event",
      contentTitle: "Acoustic Sessions",
      budget: 50,
      spent: 0,
      startDate: "2024-04-12",
      endDate: "2024-04-19",
      status: "pending",
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    },
  ]

  // Mock data for promotable content
  const promotableContent = [
    {
      id: "event-1",
      type: "event",
      title: "Summer Jam Festival",
      date: "2025-06-15",
      status: "Upcoming",
    },
    {
      id: "event-2",
      type: "event",
      title: "Acoustic Sessions",
      date: "2025-06-05",
      status: "Upcoming",
    },
    {
      id: "post-1",
      type: "post",
      title: "New Album Announcement",
      date: "2024-03-15",
      status: "Published",
    },
    {
      id: "job-1",
      type: "job",
      title: "Drummer Needed for Summer Tour",
      date: "2024-04-05",
      status: "Active",
    },
    {
      id: "profile-1",
      type: "profile",
      title: "Artist Profile",
      date: "N/A",
      status: "Active",
    },
  ]

  const formatDate = (dateString: string) => {
    if (dateString === "N/A") return "N/A"
    return formatSafeDate(dateString)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "event":
        return "Event"
      case "post":
        return "Post"
      case "profile":
        return "Profile"
      case "job":
        return "Job"
      default:
        return "Content"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-600"
      case "pending":
        return "bg-yellow-600"
      case "completed":
        return "bg-blue-600"
      case "cancelled":
        return "bg-red-600"
      default:
        return "bg-gray-600"
    }
  }

  const filteredPromotions = promotions.filter(
    (promo) =>
      (activeTab === "all" ||
        (activeTab === "active" && promo.status === "active") ||
        (activeTab === "completed" && promo.status === "completed") ||
        (activeTab === "pending" && promo.status === "pending")) &&
      (promo.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.contentType.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleCreatePromotion = (content: { id: string; type: string; title: string; date: string; status: string }) => {
    setSelectedContent({
      id: content.id,
      type: content.type as "event" | "post" | "profile" | "job",
      title: content.title
    })
    setShowCreateModal(true)
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p className="text-gray-400">Boost visibility for your content with paid promotions</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promotion
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search promotions..."
          className="pl-10 bg-gray-800 border-gray-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {filteredPromotions.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No promotions found. Create your first promotion!</p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPromotions.map((promo) => (
              <Card key={promo.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{promo.contentTitle}</CardTitle>
                        <Badge variant="outline" className="border-gray-700">
                          {getContentTypeLabel(promo.contentType)}
                        </Badge>
                        <Badge className={getStatusColor(promo.status)}>
                          {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(promo.spent)} / {formatCurrency(promo.budget)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {((promo.spent / promo.budget) * 100).toFixed(0)}% of budget spent
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600"
                        style={{ width: `${(promo.spent / promo.budget) * 100}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-gray-400" />
                            <h3 className="font-medium">Impressions</h3>
                          </div>
                          <Badge variant="outline" className="border-gray-700">
                            {formatSafeNumber(promo.metrics.impressions)}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <MousePointer className="h-4 w-4 mr-2 text-gray-400" />
                            <h3 className="font-medium">Clicks</h3>
                          </div>
                          <Badge variant="outline" className="border-gray-700">
                            {formatSafeNumber(promo.metrics.clicks)}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <ShoppingCart className="h-4 w-4 mr-2 text-gray-400" />
                            <h3 className="font-medium">Conversions</h3>
                          </div>
                          <Badge variant="outline" className="border-gray-700">
                            {formatSafeNumber(promo.metrics.conversions)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button className="flex-1" disabled={promo.status !== "active"}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                      {promo.status === "active" && (
                        <Button variant="outline" className="border-gray-700 text-red-500">
                          Pause
                        </Button>
                      )}
                      {promo.status === "pending" && (
                        <Button variant="outline" className="border-gray-700 text-red-500">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Promotable Content</CardTitle>
          <CardDescription>Select content to promote</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {promotableContent.map((content) => (
              <div key={content.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  {content.type === "event" && <Calendar className="h-5 w-5 text-purple-500" />}
                  {content.type === "post" && <Calendar className="h-5 w-5 text-blue-500" />}
                  {content.type === "job" && <Calendar className="h-5 w-5 text-amber-500" />}
                  {content.type === "profile" && <Calendar className="h-5 w-5 text-green-500" />}
                  <div>
                    <h3 className="font-medium">{content.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <Badge variant="outline" className="border-gray-700">
                        {getContentTypeLabel(content.type)}
                      </Badge>
                      {content.date !== "N/A" && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatDate(content.date)}</span>
                        </div>
                      )}
                      <span>{content.status}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700"
                  onClick={() => handleCreatePromotion(content)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Promote
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CreatePromotionModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedContent(null)
        }}
      />
    </div>
  )
}
