import { apiRequest } from "@/lib/api/client"

export interface JobApplication {
  id: string
  status: string
  applied_at: string
  reviewed_at?: string | null
  feedback?: string | null
  job_posting_id?: string | null
  venue_id?: string | null
  job_posting?: {
    id: string
    title: string
    department?: string | null
    position?: string | null
    location?: string | null
    employment_type?: string | null
  } | null
}

interface JobApplicationsResponse {
  success: boolean
  data?: JobApplication[]
}

export async function getJobApplications(limit = 50) {
  const payload = await apiRequest<JobApplicationsResponse>(`/api/job-applications?limit=${limit}`)
  return Array.isArray(payload.data) ? payload.data : []
}
