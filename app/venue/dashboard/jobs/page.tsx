"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreateJobModal } from "../../components/jobs/create-job-modal"
import { Briefcase, Search, MapPin, DollarSign, Calendar, Filter } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export default function JobsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("my-jobs")

  // Mock data for jobs
  const myJobs = [
    {
      id: "job-1",
      title: "Drummer Needed for Summer Tour",
      description:
        "Looking for an experienced drummer to join our summer tour across the US. Must be available from June to August.",
      location: "Multiple Cities",
      type: "Contract",
      category: "musician",
      compensation: {
        amount: 5000,
        type: "fixed",
        details: "Plus per diem and accommodations",
      },
      postedDate: "2024-04-05",
      applicants: 8,
      status: "active",
    },
    {
      id: "job-2",
      title: "Sound Engineer for Nashville Show",
      description:
        "Need a professional sound engineer for our upcoming show in Nashville. Experience with live mixing required.",
      location: "Nashville, TN",
      type: "One-time",
      category: "av-tech",
      compensation: {
        amount: 350,
        type: "fixed",
      },
      postedDate: "2024-04-08",
      applicants: 3,
      status: "active",
    },
    {
      id: "job-3",
      title: "Merchandise Seller for LA Concert",
      description: "Looking for someone to handle merchandise sales at our LA concert.",
      location: "Los Angeles, CA",
      type: "One-time",
      category: "crew",
      compensation: {
        amount: 150,
        type: "fixed",
        details: "Plus commission on sales",
      },
      postedDate: "2024-04-10",
      applicants: 5,
      status: "active",
    },
    {
      id: "job-4",
      title: "Backup Vocalist for Recording Session",
      description: "Need a female backup vocalist for a recording session next week.",
      location: "New York, NY",
      type: "One-time",
      category: "musician",
      compensation: {
        amount: 200,
        type: "fixed",
      },
      postedDate: "2024-03-25",
      applicants: 12,
      status: "closed",
    },
  ]

  const availableJobs = [
    {
      id: "avail-1",
      title: "Lead Guitarist Needed",
      description: "Rock band looking for a lead guitarist for upcoming tour.",
      location: "Chicago, IL",
      type: "Contract",
      category: "musician",
      compensation: {
        amount: 4000,
        type: "fixed",
        details: "Plus per diem",
      },
      postedDate: "2024-04-07",
      postedBy: "The Amplifiers",
      postedByImage: "/placeholder.svg?height=40&width=40&text=TA",
    },
    {
      id: "avail-2",
      title: "Stage Manager for Festival",
      description: "Looking for an experienced stage manager for a 3-day music festival.",
      location: "Austin, TX",
      type: "One-time",
      category: "crew",
      compensation: {
        amount: 1500,
        type: "fixed",
      },
      postedDate: "2024-04-09",
      postedBy: "SoundWave Festival",
      postedByImage: "/placeholder.svg?height=40&width=40&text=SF",
    },
    {
      id: "avail-3",
      title: "Security Staff for Concert Series",
      description: "Hiring security personnel for summer concert series.",
      location: "Miami, FL",
      type: "Part-time",
      category: "security",
      compensation: {
        amount: 25,
        type: "hourly",
      },
      postedDate: "2024-04-11",
      postedBy: "Beachside Venues",
      postedByImage: "/placeholder.svg?height=40&width=40&text=BV",
    },
    {
      id: "avail-4",
      title: "Lighting Technician",
      description: "Need a lighting technician for upcoming theater performances.",
      location: "Seattle, WA",
      type: "Contract",
      category: "av-tech",
      compensation: {
        amount: 3000,
        type: "fixed",
        details: "For 10 shows",
      },
      postedDate: "2024-04-06",
      postedBy: "Emerald City Productions",
      postedByImage: "/placeholder.svg?height=40&width=40&text=EC",
    },
    {
      id: "avail-5",
      title: "Dancer for Music Video",
      description: "Looking for contemporary dancers for a music video shoot.",
      location: "Los Angeles, CA",
      type: "One-time",
      category: "dancer",
      compensation: {
        amount: 400,
        type: "fixed",
        details: "Per day, 2-day shoot",
      },
      postedDate: "2024-04-12",
      postedBy: "Visionary Media",
      postedByImage: "/placeholder.svg?height=40&width=40&text=VM",
    },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const filteredMyJobs = myJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredAvailableJobs = availableJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "musician":
        return "bg-blue-600"
      case "dancer":
        return "bg-purple-600"
      case "security":
        return "bg-red-600"
      case "av-tech":
        return "bg-green-600"
      case "crew":
        return "bg-amber-600"
      default:
        return "bg-gray-600"
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-gray-400">Post jobs and hire individuals for your events</p>
        </div>

        <Button onClick={() => setShowCreateModal(true)}>
          <Briefcase className="h-4 w-4 mr-2" />
          Post Job
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs..."
            className="pl-10 bg-gray-800 border-gray-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-gray-700">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <Tabs defaultValue="my-jobs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-800">
          <TabsTrigger value="my-jobs">My Job Postings</TabsTrigger>
          <TabsTrigger value="available">Available Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="my-jobs" className="mt-6 space-y-6">
          {filteredMyJobs.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No job postings found. Create your first job posting!</p>
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Post Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredMyJobs.map((job) => (
              <Card key={job.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{job.title}</CardTitle>
                        <Badge className={getCategoryBadgeColor(job.category)}>
                          {job.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">
                          {job.type}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1">{job.description}</CardDescription>
                    </div>
                    <Badge
                      variant={job.status === "active" ? "default" : "outline"}
                      className={job.status === "active" ? "bg-green-600" : "border-gray-600"}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {formatCurrency(job.compensation.amount)}
                        {job.compensation.type === "hourly" ? "/hr" : ""}
                        {job.compensation.details ? ` (${job.compensation.details})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Posted: {formatDate(job.postedDate)}</span>
                    </div>
                    <div className="flex items-center ml-auto">
                      <Badge variant="outline" className="border-blue-600 text-blue-500">
                        {job.applicants} Applicants
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">View Applicants</Button>
                    <Button variant="outline" className="border-gray-700">
                      Edit
                    </Button>
                    {job.status === "active" && (
                      <Button variant="outline" className="border-gray-700 text-red-500">
                        Close
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6 space-y-6">
          {filteredAvailableJobs.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No available jobs found matching your search criteria.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAvailableJobs.map((job) => (
              <Card key={job.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{job.title}</CardTitle>
                        <Badge className={getCategoryBadgeColor(job.category)}>
                          {job.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">
                          {job.type}
                        </Badge>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-400">Posted by:</span>
                        <span className="text-sm font-medium ml-1">{job.postedBy}</span>
                      </div>
                      <CardDescription className="mt-1">{job.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      <span>
                        {formatCurrency(job.compensation.amount)}
                        {job.compensation.type === "hourly" ? "/hr" : ""}
                        {job.compensation.details ? ` (${job.compensation.details})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      <span>Posted: {formatDate(job.postedDate)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">Apply Now</Button>
                    <Button variant="outline" className="border-gray-700">
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-400">You haven't applied to any jobs yet.</p>
              <Button className="mt-4" onClick={() => setActiveTab("available")}>
                Browse Available Jobs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateJobModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
