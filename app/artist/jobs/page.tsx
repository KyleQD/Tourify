"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Briefcase, MapPin, DollarSign } from "lucide-react"

interface ArtistJobRow {
  id: string
  title: string
  description: string
  payment_amount?: number | null
  payment_currency?: string | null
  location?: string | null
  poster_name?: string | null
}

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<ArtistJobRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch("/api/artist-jobs?per_page=24")
        const payload = await response.json()
        if (payload.success) setJobs(payload.data?.jobs || [])
      } catch (error) {
        console.error("Failed to load artist jobs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Artist Job Board</h1>
              <p className="text-slate-300 mt-1">
                Find gigs, venues, and paid opportunities across the platform
              </p>
            </div>
          </div>
          {user ? (
            <Link href="/artist/jobs/new">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Post a Job
              </Button>
            </Link>
          ) : null}
        </div>

        {isLoading ? <p className="text-slate-400">Loading jobs...</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="bg-slate-800/60 border-slate-700/60 hover:border-slate-600 transition-colors">
              <CardHeader>
                <CardTitle className="text-white">{job.title}</CardTitle>
                <CardDescription className="text-slate-400">
                  Posted by: {job.poster_name || "Tourify"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 mb-4 line-clamp-3">{job.description}</p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {job.location ? (
                    <Badge variant="secondary" className="bg-slate-700/70 text-slate-200">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {job.location}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="bg-slate-700/70 text-slate-200">
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    {job.payment_amount
                      ? `${job.payment_currency || "USD"} ${job.payment_amount}`
                      : "Compensation in details"}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  {user ? (
                    <Link href={`/artist/jobs/${job.id}/apply`}>
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-100">
                        Apply Now
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/login">
                      <Button variant="outline" size="sm" className="border-slate-600 text-slate-100">
                        Sign in to Apply
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
          </Card>
          ))}
        </div>
      </div>
    </div>
  )
}