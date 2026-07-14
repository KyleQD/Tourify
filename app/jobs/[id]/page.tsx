"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import {
  Briefcase, MapPin, DollarSign, Users, Star,
  CheckCircle, AlertCircle, Loader2, ArrowRight, Building,
  FileText, Award, Zap, Share2, Send, Link2, Settings,
  ExternalLink, Mail, Phone, Gift, ListChecks, type LucideIcon,
} from 'lucide-react'
import { ApplicationForm } from '@/components/forms/application-form'
import { QuickApplyModal } from '@/components/hiring/quick-apply-modal'
import type { JobPostingTemplate } from '@/types/admin-onboarding'
import type { ArtistJob } from '@/types/artist-jobs'

type JobKind = 'venue' | 'artist' | null

const glassCard =
  'rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl'
const glassMenu = 'border-white/10 bg-slate-900/90 text-slate-100 backdrop-blur-xl'
const glassMenuItem = 'text-slate-200 focus:bg-white/10 focus:text-white'
const outlineBtn = 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
const primaryBtn =
  'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-purple-500 hover:to-fuchsia-500'
const softChip = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300'

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-40" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`${glassCard} ${className}`}>{children}</div>
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 ring-1 ring-white/10">
        <Icon className="h-4 w-4 text-purple-200" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  iconClass = 'text-slate-400',
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  iconClass?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm text-slate-200">{value}</p>
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = params.id as string
  const sourceParam = searchParams.get('source')

  const { user } = useAuth()
  const { actingHeaders } = useActingContext()
  const [jobKind, setJobKind] = useState<JobKind>(null)
  const [venueJob, setVenueJob] = useState<JobPostingTemplate | null>(null)
  const [artistJob, setArtistJob] = useState<ArtistJob | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [showQuickApply, setShowQuickApply] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const loadJobDetails = useCallback(async () => {
    async function tryArtist(): Promise<boolean> {
      const r = await fetch(`/api/artist-jobs/${jobId}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success && d.data) {
        setArtistJob(d.data)
        setJobKind('artist')
        return true
      }
      return false
    }

    async function tryVenue(): Promise<boolean> {
      const r = await fetch(`/api/job-postings/${jobId}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success && d.data) {
        setVenueJob(d.data)
        setJobKind('venue')
        return true
      }
      return false
    }

    try {
      setIsLoading(true)
      setError(null)
      setJobKind(null)
      setVenueJob(null)
      setArtistJob(null)

      // Try the hinted source first, then fall back to the other source so a
      // wrong/stale `?source=` never hard-fails a listing that actually exists.
      const attempts = sourceParam === 'artist' ? [tryArtist, tryVenue] : [tryVenue, tryArtist]
      for (const attempt of attempts) {
        if (await attempt()) return
      }

      throw new Error('This job posting is no longer available.')
    } catch (err) {
      console.error('Error loading job details:', err)
      const msg = err instanceof Error ? err.message : 'Failed to load job details'
      setError(msg)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [jobId, sourceParam, toast])

  useEffect(() => {
    void loadJobDetails()
  }, [loadJobDetails])

  async function handleApplicationSubmit(formData: Record<string, unknown>) {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_posting_id: jobId, form_responses: formData }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to submit application')
      toast({
        title: 'Application Submitted',
        description: "Your application has been submitted successfully. We'll review it and get back to you soon.",
      })
      setShowApplicationForm(false)
    } catch (err) {
      console.error('Error submitting application:', err)
      toast({ title: 'Error', description: 'Failed to submit application. Please try again.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleArtistApply() {
    if (!user?.email) {
      toast({ title: 'Sign in required', description: 'Please log in to apply.', variant: 'destructive' })
      return
    }
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/artist-jobs/${jobId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job_id: jobId,
          contact_email: user.email,
          preferred_contact_method: 'email',
        }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to apply')
      toast({ title: 'Application submitted', description: 'You can track status under Jobs → Applied.' })
    } catch (err) {
      toast({
        title: 'Application failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleShareToFeedVenue(job: JobPostingTemplate) {
    try {
      const res = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        credentials: 'include',
        body: JSON.stringify({
          shared_content_type: 'job_posting',
          shared_content_id: jobId,
          content: `Check out this opportunity: ${job?.title}`,
        }),
      })
      const data = await res.json()
      if (data.success) toast({ title: 'Shared to feed', description: 'This job has been posted to your feed.' })
      else throw new Error(data.error)
    } catch (error) {
      toast({ title: 'Share failed', description: error instanceof Error ? error.message : 'Could not share.', variant: 'destructive' })
    }
  }

  async function handleShareToFeedArtist(job: ArtistJob) {
    try {
      const res = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        credentials: 'include',
        body: JSON.stringify({
          shared_content_type: 'job',
          shared_content_id: jobId,
          content: `Check out this opportunity: ${job?.title}`,
        }),
      })
      const data = await res.json()
      if (data.success) toast({ title: 'Shared to feed', description: 'This job has been posted to your feed.' })
      else throw new Error(data.error)
    } catch (error) {
      toast({ title: 'Share failed', description: error instanceof Error ? error.message : 'Could not share.', variant: 'destructive' })
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    toast({ title: 'Link copied', description: 'Job link copied to clipboard.' })
  }

  function handleNativeShare(title: string, subtitle: string) {
    if (navigator.share) {
      navigator.share({ title, text: subtitle, url: window.location.href }).catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  function getEmploymentTypeLabel(type: string) {
    const types: Record<string, string> = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contractor: 'Contractor',
      volunteer: 'Volunteer',
    }
    return types[type] || type
  }

  function getExperienceLevelLabel(level: string) {
    const levels: Record<string, string> = {
      entry: 'Entry Level',
      mid: 'Mid Level',
      senior: 'Senior Level',
      executive: 'Executive Level',
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      professional: 'Professional',
    }
    return levels[level] || level
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-screen items-center justify-center p-6">
          <GlassCard className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">Loading Job Details</h2>
            <p className="text-slate-400">Please wait...</p>
          </GlassCard>
        </div>
      </PageShell>
    )
  }

  if (error || jobKind === null || (!venueJob && !artistJob)) {
    return (
      <PageShell>
        <div className="flex min-h-screen items-center justify-center p-6">
          <GlassCard className="max-w-md border-red-500/20 p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-400" />
            <h2 className="mb-2 text-xl font-semibold text-white">Job Not Found</h2>
            <p className="mb-4 text-slate-400">{error || 'This job posting could not be found.'}</p>
            <Button onClick={() => window.history.back()} variant="outline" className={outlineBtn}>
              Go Back
            </Button>
          </GlassCard>
        </div>
      </PageShell>
    )
  }

  if (jobKind === 'artist' && artistJob) {
    const j = artistJob
    const loc =
      j.location || [j.city, j.state, j.country].filter(Boolean).join(', ') || 'Location TBD'
    const canApply = j.status === 'open'

    return (
      <PageShell>
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <GlassCard className="relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent" />
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200">
                    Artist board
                  </Badge>
                  {j.category?.name ? (
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                      {j.category.name}
                    </Badge>
                  ) : null}
                  {j.priority === 'urgent' || j.priority === 'high' ? (
                    <Badge className="border-red-500/30 bg-red-500/20 text-red-300">High priority</Badge>
                  ) : null}
                </div>
                <h1 className="bg-gradient-to-r from-white via-purple-100 to-fuchsia-200 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                  {j.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400/80" />
                    {loc}
                  </span>
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    <Briefcase className="h-3.5 w-3.5 text-purple-400/80" />
                    {j.job_type?.replace(/_/g, ' ') || 'Opportunity'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{j.applications_count} applications</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className={outlineBtn}>
                      <Share2 className="mr-1 h-4 w-4" />
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={glassMenu}>
                    <DropdownMenuItem onClick={() => void handleShareToFeedArtist(j)} className={glassMenuItem}>
                      <Send className="mr-2 h-4 w-4" />
                      Share to Feed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className={glassMenuItem}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleNativeShare(j.title, `${j.title} — ${loc}`)}
                      className={glassMenuItem}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share via…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => void handleArtistApply()}
                  className={primaryBtn}
                  disabled={!canApply || isSubmitting}
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Apply
                </Button>
              </div>
            </div>
            {!canApply && (
              <p className="mt-4 text-sm text-slate-400">This posting is not currently accepting applications</p>
            )}
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6">
              <SectionHeader icon={FileText} title="Description" />
              <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{j.description}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <SectionHeader icon={ListChecks} title="How to Apply" />
              <ol className="mb-5 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    1
                  </span>
                  <span>Review the posting details, skills, and any special requirements below.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    2
                  </span>
                  <span>Tap <strong className="text-white">Apply</strong> to submit with your Tourify account email.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    3
                  </span>
                  <span>Track your status under Jobs → Applied.</span>
                </li>
              </ol>
              <Button
                onClick={() => void handleArtistApply()}
                className={primaryBtn}
                disabled={!canApply || isSubmitting}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Apply now
              </Button>
            </GlassCard>

            {j.required_skills?.length ? (
              <GlassCard className="p-6">
                <SectionHeader icon={Award} title="Skills" />
                <div className="flex flex-wrap gap-2">
                  {j.required_skills.map((skill, index) => (
                    <span key={index} className={softChip}>{skill}</span>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            {j.required_equipment?.length ? (
              <GlassCard className="p-6">
                <SectionHeader icon={Settings} title="Required Equipment" />
                <div className="flex flex-wrap gap-2">
                  {j.required_equipment.map((equipment, index) => (
                    <span key={index} className={softChip}>{equipment}</span>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            {j.benefits?.length ? (
              <GlassCard className="p-6">
                <SectionHeader icon={Gift} title="Benefits & Perks" />
                <div className="flex flex-wrap gap-2">
                  {j.benefits.map((benefit, index) => (
                    <span key={index} className={softChip}>{benefit}</span>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            {j.special_requirements?.trim() ? (
              <GlassCard className="p-6">
                <SectionHeader icon={FileText} title="Special Requirements" />
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{j.special_requirements}</p>
              </GlassCard>
            ) : null}

            {(j.age_requirement?.trim() || j.contact_email?.trim() || j.contact_phone?.trim() || j.external_link?.trim()) ? (
              <GlassCard className="p-6">
                <SectionHeader icon={Users} title="Additional Information" />
                <div className="space-y-3 text-sm text-slate-300">
                  {j.age_requirement?.trim() ? (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      <span>Age requirement: {j.age_requirement}</span>
                    </div>
                  ) : null}
                  {j.contact_email?.trim() ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-500" />
                      <a href={`mailto:${j.contact_email}`} className="text-purple-300 hover:underline">
                        {j.contact_email}
                      </a>
                    </div>
                  ) : null}
                  {j.contact_phone?.trim() ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-500" />
                      <a href={`tel:${j.contact_phone}`} className="text-purple-300 hover:underline">
                        {j.contact_phone}
                      </a>
                    </div>
                  ) : null}
                  {j.external_link?.trim() ? (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                      <a
                        href={j.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-purple-300 hover:underline"
                      >
                        {j.external_link}
                      </a>
                    </div>
                  ) : null}
                </div>
              </GlassCard>
            ) : null}

            <GlassCard className="p-6">
              <SectionHeader icon={Briefcase} title="Details" />
              <div className="space-y-4">
                {j.payment_amount != null ? (
                  <DetailRow
                    icon={DollarSign}
                    label="Payment"
                    iconClass="text-emerald-400"
                    value={`${j.payment_amount} ${j.payment_currency} (${j.payment_type})`}
                  />
                ) : null}
                {j.required_experience ? (
                  <DetailRow
                    icon={Star}
                    label="Experience"
                    iconClass="text-fuchsia-400"
                    value={getExperienceLevelLabel(j.required_experience)}
                  />
                ) : null}
                {j.event_date ? (
                  <DetailRow
                    icon={Briefcase}
                    label="Event date"
                    iconClass="text-purple-400"
                    value={j.event_date}
                  />
                ) : null}
              </div>
            </GlassCard>
          </div>
        </div>
      </PageShell>
    )
  }

  const job = venueJob!
  const isPublished = job.status === 'published'

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <GlassCard className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/15 text-cyan-200">
                  Venue staffing
                </Badge>
                {job.department ? (
                  <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                    {job.department}
                  </Badge>
                ) : null}
                {job.urgent && (
                  <Badge className="border-red-500/30 bg-red-500/20 text-red-300">Urgent</Badge>
                )}
                {job.remote && (
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                    Remote Available
                  </Badge>
                )}
              </div>
              <h1 className="bg-gradient-to-r from-white via-purple-100 to-fuchsia-200 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-cyan-400/80" />
                  {job.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-purple-400/80" />
                  {getEmploymentTypeLabel(job.employment_type)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-fuchsia-400/80" />
                  {getExperienceLevelLabel(job.experience_level)}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{job.applications_count} applications</span>
                <span>·</span>
                <span>{job.views_count} views</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={outlineBtn}>
                    <Share2 className="mr-1 h-4 w-4" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={glassMenu}>
                  <DropdownMenuItem onClick={() => void handleShareToFeedVenue(job)} className={glassMenuItem}>
                    <Send className="mr-2 h-4 w-4" />
                    Share to Feed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink} className={glassMenuItem}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleNativeShare(job.title, `${job.title} - ${job.location}`)}
                    className={glassMenuItem}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share via…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setShowQuickApply(true)}
                className={primaryBtn}
                disabled={!isPublished}
              >
                <Zap className="mr-2 h-4 w-4" />
                Quick Apply
              </Button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <GlassCard className="p-6">
              <SectionHeader icon={FileText} title="Job Description" />
              <p className="leading-relaxed text-slate-300">{job.description}</p>
            </GlassCard>

            <GlassCard className="p-6">
              <SectionHeader icon={ListChecks} title="How to Apply" />
              <ol className="mb-5 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    1
                  </span>
                  <span>Review the role details, requirements, and responsibilities on this page.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    2
                  </span>
                  <span>
                    Prefer <strong className="text-white">Quick Apply</strong> to submit with your Tourify profile in a few taps.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    3
                  </span>
                  <span>
                    Or use the <strong className="text-white">full application form</strong> for a longer, custom application.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-xs font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/30">
                    4
                  </span>
                  <span>Track your status from Jobs → Applied or your staffing applications.</span>
                </li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setShowQuickApply(true)}
                  className={primaryBtn}
                  disabled={!isPublished}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Quick Apply
                </Button>
                <Button
                  variant="outline"
                  className={outlineBtn}
                  onClick={() => setShowApplicationForm(true)}
                  disabled={!isPublished}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Full application form
                </Button>
              </div>
              {!isPublished && (
                <p className="mt-3 text-sm text-slate-400">This position is not currently accepting applications.</p>
              )}
            </GlassCard>

            {job.requirements && job.requirements.length > 0 && (
              <GlassCard className="p-6">
                <SectionHeader icon={CheckCircle} title="Requirements" />
                <ul className="space-y-2.5">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-slate-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {job.responsibilities && job.responsibilities.length > 0 && (
              <GlassCard className="p-6">
                <SectionHeader icon={Briefcase} title="Responsibilities" />
                <ul className="space-y-2.5">
                  {job.responsibilities.map((resp, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-slate-300">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            {job.skills && job.skills.length > 0 && (
              <GlassCard className="p-6">
                <SectionHeader icon={Award} title="Required Skills" />
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span key={index} className={softChip}>{skill}</span>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          <div className="space-y-6">
            <GlassCard className="p-6">
              <SectionHeader icon={Briefcase} title="Job Details" />
              <div className="space-y-4">
                <DetailRow icon={MapPin} label="Location" value={job.location} iconClass="text-cyan-400" />
                <DetailRow
                  icon={Briefcase}
                  label="Employment Type"
                  value={getEmploymentTypeLabel(job.employment_type)}
                  iconClass="text-purple-400"
                />
                <DetailRow
                  icon={Star}
                  label="Experience Level"
                  value={getExperienceLevelLabel(job.experience_level)}
                  iconClass="text-fuchsia-400"
                />
                {job.salary_range && (
                  <DetailRow
                    icon={DollarSign}
                    label="Salary Range"
                    iconClass="text-emerald-400"
                    value={`$${job.salary_range.min.toLocaleString()} - $${job.salary_range.max.toLocaleString()} ${job.salary_range.type}`}
                  />
                )}
                <DetailRow
                  icon={Users}
                  label="Positions Available"
                  value={job.number_of_positions}
                  iconClass="text-cyan-400"
                />
              </div>
            </GlassCard>

            {job.benefits && job.benefits.length > 0 && (
              <GlassCard className="p-6">
                <SectionHeader icon={Zap} title="Benefits" />
                <ul className="space-y-2.5">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <GlassCard className="p-6">
              <div className="space-y-3">
                <Button
                  onClick={() => setShowQuickApply(true)}
                  className={`w-full ${primaryBtn}`}
                  disabled={!isPublished}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Quick Apply
                </Button>
                <Button
                  variant="outline"
                  className={`w-full ${outlineBtn}`}
                  onClick={() => setShowApplicationForm(true)}
                  disabled={!isPublished}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Use full application form
                </Button>
                <Button
                  variant="outline"
                  className={`w-full ${outlineBtn}`}
                  onClick={() => void handleShareToFeedVenue(job)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Share to Feed
                </Button>
                <Button variant="outline" className={`w-full ${outlineBtn}`} onClick={handleCopyLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                {!isPublished && (
                  <p className="text-center text-sm text-slate-400">
                    This position is not currently accepting applications
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {showApplicationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Apply for {job.title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApplicationForm(false)}
                  className="text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  &times;
                </Button>
              </div>
              <ApplicationForm
                jobPosting={job}
                onSubmit={handleApplicationSubmit}
                onCancel={() => setShowApplicationForm(false)}
                isLoading={isSubmitting}
              />
            </div>
          </motion.div>
        </div>
      )}

      <QuickApplyModal
        jobPostingId={jobId}
        jobTitle={job.title}
        open={showQuickApply}
        onOpenChange={setShowQuickApply}
        onUseFullForm={() => setShowApplicationForm(true)}
      />
    </PageShell>
  )
}
