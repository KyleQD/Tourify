"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, Save, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { ApplicationFormFieldBuilder } from "@/components/hiring/application-form-field-builder"
import { JobPostingArrayField } from "@/components/hiring/job-posting-array-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { readHiringJson } from "@/lib/api/hiring-client"
import {
  getDefaultJobPostingValues,
  jobPostingFormSchema,
  normalizeJobPostingPayload,
} from "@/lib/hiring/job-posting-builder-schema"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import type { JobPostingBuilderProps, JobPostingFormValues, JobPostingTemplateOption } from "@/types/job-posting-builder"

const DEPARTMENT_SUGGESTIONS = [
  "Production",
  "Security",
  "Bar Staff",
  "Hospitality",
  "Street Team",
  "Marketing",
  "Technical",
  "Merchandise",
  "Tour Crew",
  "Operations",
]

const ROLE_TYPE_SUGGESTIONS = [
  "security",
  "bartender",
  "street_team",
  "production_crew",
  "foh_engineer",
  "lighting_tech",
  "tour_manager",
  "merch_seller",
  "photographer",
  "volunteer",
]

function getReadableError(error: unknown): string {
  if (!error) return "Unknown error"
  if (error instanceof Error) return error.message
  if (typeof error === "object" && "message" in error && typeof error.message === "string") return error.message

  try {
    return JSON.stringify(error)
  } catch {
    return "Unexpected error"
  }
}

interface EventOption {
  id: string
  name: string
  eventDate?: string | null
}

interface TourOption {
  id: string
  name: string
}

function toDateInputValue(value?: string | null): string {
  if (!value) return ""
  return value.slice(0, 10)
}

export function JobPostingBuilder({
  employer,
  initialData,
  mode = "create",
  onboardingTemplates = [],
  submitEndpoint,
  onCancel,
  onCreated,
  onUpdated,
}: JobPostingBuilderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<JobPostingFormValues>({
    resolver: zodResolver(jobPostingFormSchema),
    defaultValues: getDefaultJobPostingValues(initialData),
    mode: "onChange",
  })

  const status = form.watch("status")
  const applicationFields = form.watch("application_form_template.fields")

  const [events, setEvents] = useState<EventOption[]>([])
  const [tours, setTours] = useState<TourOption[]>([])
  const [templates, setTemplates] = useState<JobPostingTemplateOption[]>(onboardingTemplates)

  useEffect(() => {
    if (onboardingTemplates.length > 0) {
      setTemplates(onboardingTemplates)
      return
    }

    let isActive = true

    async function loadTemplates(): Promise<void> {
      try {
        const response = await fetch(`/api/admin/onboarding/templates?${getEmployerQueryString(employer)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        if (!isActive || !response.ok) return
        const payload = (await response.json()) as { data?: JobPostingTemplateOption[] }
        setTemplates(payload.data ?? [])
      } catch {
        // Non-blocking: the select falls back to the resolver default when templates cannot load.
      }
    }

    void loadTemplates()

    return () => {
      isActive = false
    }
  }, [employer, onboardingTemplates])

  useEffect(() => {
    let isActive = true

    async function loadScopeOptions(): Promise<void> {
      try {
        const [eventsResponse, toursResponse] = await Promise.all([
          fetch("/api/admin/events", { headers: { Accept: "application/json" }, cache: "no-store" }),
          fetch("/api/admin/tours", { headers: { Accept: "application/json" }, cache: "no-store" }),
        ])

        if (isActive && eventsResponse.ok) {
          const payload = (await eventsResponse.json()) as { events?: Array<{ id: string; name?: string; title?: string; event_date?: string | null }> }
          setEvents(
            (payload.events ?? []).map((event) => ({
              id: event.id,
              name: event.name || event.title || "Untitled event",
              eventDate: event.event_date ?? null,
            })),
          )
        }

        if (isActive && toursResponse.ok) {
          const payload = (await toursResponse.json()) as { tours?: Array<{ id: string; name?: string; title?: string }> }
          setTours((payload.tours ?? []).map((tour) => ({ id: tour.id, name: tour.name || tour.title || "Untitled tour" })))
        }
      } catch {
        // Non-blocking: pickers simply stay empty if events/tours cannot load.
      }
    }

    void loadScopeOptions()

    return () => {
      isActive = false
    }
  }, [])

  async function submitJobPosting(values: JobPostingFormValues): Promise<void> {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const payload = normalizeJobPostingPayload({ employer, values })
      const endpoint = submitEndpoint ?? (mode === "edit" && values.id ? `/api/hiring/job-postings/${values.id}` : "/api/hiring/job-postings")
      const method = mode === "edit" ? "PATCH" : "POST"

      const result = await readHiringJson<Record<string, unknown>>(
        endpoint,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        {
          fallbackData: {},
          fallbackErrorMessage: "Unable to save job posting.",
        }
      )

      if (!result.ok) throw new Error(result.error.message)

      const posting = result.data ?? {}

      toast({
        title: mode === "edit" ? "Job posting updated" : "Job posting created",
        description:
          payload.status === "published"
            ? "This posting is ready to appear in the job board once backend publishing checks pass."
            : "This posting was saved as a draft.",
      })

      if (mode === "edit") onUpdated?.(posting)
      else onCreated?.(posting)

      router.refresh()
    } catch (error) {
      toast({
        title: "Unable to save job posting",
        description: getReadableError(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function submitAs(statusValue: "draft" | "published"): void {
    form.setValue("status", statusValue, { shouldDirty: true, shouldValidate: true })
    void form.handleSubmit(submitJobPosting)()
  }

  return (
    <form onSubmit={form.handleSubmit(submitJobPosting)} className="space-y-6">
      <Card className="rounded-[1.35rem] border-slate-700/60 bg-slate-950/65 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-white">{mode === "edit" ? "Edit job posting" : "Create job posting"}</CardTitle>
              <CardDescription>
                Build a real hiring post for {employer.displayName}. This saves to the universal hiring module with
                {" "}
                <span className="font-medium">{employer.entityType}</span> scope.
              </CardDescription>
            </div>
            <Badge variant="outline">{status}</Badge>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-3 text-sm text-slate-300">
            Employer scope: <span className="font-medium text-foreground">{employer.entityType}</span> / {employer.entityId}
            {employer.scope?.venueId ? <span> • Venue context: {employer.scope.venueId}</span> : null}
            {employer.scope?.eventId ? <span> • Event: {employer.scope.eventId}</span> : null}
            {employer.scope?.tourId ? <span> • Tour: {employer.scope.tourId}</span> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" {...form.register("title")} placeholder="Example: Security Guard - Night Shift" />
              {form.formState.errors.title ? <p className="text-sm text-destructive">{form.formState.errors.title.message}</p> : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe the role, expectations, event context, and who this is best for."
                rows={5}
              />
              {form.formState.errors.description ? (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...form.register("department")} list="department-suggestions" placeholder="Security" />
              <datalist id="department-suggestions">
                {DEPARTMENT_SUGGESTIONS.map((department) => (
                  <option key={department} value={department} />
                ))}
              </datalist>
              {form.formState.errors.department ? (
                <p className="text-sm text-destructive">{form.formState.errors.department.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" {...form.register("position")} placeholder="Guard, bartender, FOH engineer..." />
              {form.formState.errors.position ? (
                <p className="text-sm text-destructive">{form.formState.errors.position.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Employment type</Label>
              <Controller
                control={form.control}
                name="employment_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full time</SelectItem>
                      <SelectItem value="part_time">Part time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} placeholder="Venue, city, remote, tour stop..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_type">Role type</Label>
              <Input id="role_type" {...form.register("role_type")} list="role-type-suggestions" placeholder="security" />
              <datalist id="role-type-suggestions">
                {ROLE_TYPE_SUGGESTIONS.map((roleType) => (
                  <option key={roleType} value={roleType} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="number_of_positions">Open positions</Label>
              <Input id="number_of_positions" type="number" min={1} {...form.register("number_of_positions", { valueAsNumber: true })} />
              {form.formState.errors.number_of_positions ? (
                <p className="text-sm text-destructive">{form.formState.errors.number_of_positions.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Experience level</Label>
              <Controller
                control={form.control}
                name="experience_level"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="entry">Entry</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Onboarding template</Label>
              <Controller
                control={form.control}
                name="onboarding_template_id"
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={(value) => field.onChange(value === "none" ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Use resolver default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Use resolver default</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          {template.isDefault ? " — Default" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Required to publish. Drafts can omit this and attach a template later before going live.
              </p>
              {form.formState.errors.onboarding_template_id ? (
                <p className="text-sm text-destructive">{form.formState.errors.onboarding_template_id.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Compensation minimum</Label>
              <Input type="number" min={0} {...form.register("salary_range.min", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Compensation maximum</Label>
              <Input type="number" min={0} {...form.register("salary_range.max", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Compensation type</Label>
              <Controller
                control={form.control}
                name="salary_range.type"
                render={({ field }) => (
                  <Select value={field.value ?? "hourly"} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <JobPostingArrayField
                  label="Requirements"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Example: Valid guard card"
                  description="Use real role requirements, not placeholder requirements."
                />
              )}
            />
            <Controller
              control={form.control}
              name="required_certifications"
              render={({ field }) => (
                <JobPostingArrayField
                  label="Required certifications"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Example: Alcohol server permit"
                />
              )}
            />
            <Controller
              control={form.control}
              name="responsibilities"
              render={({ field }) => (
                <JobPostingArrayField
                  label="Responsibilities"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Example: Monitor assigned zone"
                />
              )}
            />
            <Controller
              control={form.control}
              name="skills"
              render={({ field }) => (
                <JobPostingArrayField label="Skills" value={field.value} onChange={field.onChange} placeholder="Example: Crowd management" />
              )}
            />
            <Controller
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <JobPostingArrayField label="Benefits" value={field.value} onChange={field.onChange} placeholder="Example: Paid training" />
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Remote / off-site compatible</Label>
                <p className="text-sm text-muted-foreground">Use this for remote advance work, marketing, admin, or hybrid roles.</p>
              </div>
              <Controller
                control={form.control}
                name="remote"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Urgent hire</Label>
                <p className="text-sm text-muted-foreground">Flags this role as urgent in dashboards and review queues.</p>
              </div>
              <Controller
                control={form.control}
                name="urgent"
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.35rem] border-slate-700/60 bg-slate-950/65 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Event &amp; tour linking</CardTitle>
          <CardDescription>
            Attach this role to an event or tour. Approved hires are pre-scoped to the linked event when they are onboarded.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Event</Label>
            <Controller
              control={form.control}
              name="event_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      field.onChange(null)
                      return
                    }
                    field.onChange(value)
                    const selected = events.find((event) => event.id === value)
                    if (selected?.eventDate) form.setValue("event_date", toDateInputValue(selected.eventDate), { shouldDirty: true })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={events.length ? "Select an event" : "No events found"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Tour</Label>
            <Controller
              control={form.control}
              name="tour_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tours.length ? "Select a tour" : "No tours found"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tour</SelectItem>
                    {tours.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Event / start date</Label>
            <Controller
              control={form.control}
              name="event_date"
              render={({ field }) => (
                <Input
                  id="event_date"
                  type="date"
                  value={toDateInputValue(field.value)}
                  onChange={(changeEvent) => field.onChange(changeEvent.target.value || null)}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.35rem] border-slate-700/60 bg-slate-950/65 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Application form builder</CardTitle>
          <CardDescription>
            These fields are stored in job_posting_templates.application_form_template and are shown before hire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="application_form_template.fields"
            render={({ field }) => <ApplicationFormFieldBuilder fields={field.value ?? []} onChange={field.onChange} />}
          />
          {form.formState.errors.application_form_template?.fields ? (
            <p className="mt-3 text-sm text-destructive">Application form fields contain invalid values.</p>
          ) : null}
        </CardContent>
        <CardFooter className="text-sm text-slate-400">
          Current field count: {applicationFields?.length ?? 0}. Select and multi-select fields require options.
        </CardFooter>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {form.formState.isDirty ? "Unsaved changes" : "No unsaved changes"}
            {form.formState.isValid ? " • Ready to save" : " • Complete required fields"}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            ) : null}
            <Button type="button" className="rounded-xl" variant="outline" disabled={isSubmitting} onClick={() => submitAs("draft")}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button type="button" className="rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={isSubmitting} onClick={() => submitAs("published")}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
