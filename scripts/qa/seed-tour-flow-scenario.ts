#!/usr/bin/env npx tsx
/**
 * Bootstrap West Coast tour scenario after qa:seed:flow:
 * - 10-city tour under Org
 * - Tour team with Artist1–3 as admins
 * - 3 published jobs with distinct onboarding templates
 * - Hire tokens for Workers 1–3 (no email dependency)
 *
 * Run: npm run qa:seed:flow:scenario
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createRequire } from "module"
import { randomUUID } from "crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { getFlowCastCredentials, loadQaEnv, WEST_COAST_ROUTE } from "./load-qa-env"

loadQaEnv()

const require = createRequire(import.meta.url)
require("module").Module._extensions[".js"] = ((original) => {
  return function patched(module: NodeModule, filename: string) {
    if (filename.includes("server-only")) {
      module.exports = {}
      return
    }
    return original(module, filename)
  }
})(require("module").Module._extensions[".js"])

interface FlowAccountsFile {
  users: Record<
    string,
    {
      email: string
      userId: string
      personas: {
        generalId: string
        artistId?: string
        organizerId?: string
        opsOrgId?: string
      }
    }
  >
  band: { name: string; organizerAccountId?: string }
  organization: { name: string; organizerAccountId?: string; opsOrgId?: string }
  tour: { name: string }
  baseUrl: string
}

const TEMPLATE_NAME_SETS = [
  ["General Staff", "Security Guard", "Bartender"],
  ["New Staff", "Security", "Volunteers"],
  ["New Staff", "Security", "Media"],
] as const

function mintToken() {
  return randomUUID().replaceAll("-", "")
}

async function resolveOnboardingTemplates(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("staff_onboarding_templates")
    .select("id,name")
    .is("employer_entity_type", null)
    .is("employer_entity_id", null)

  if (error) throw new Error(`Failed to list staff_onboarding_templates: ${error.message}`)
  const byName = Object.fromEntries((data || []).map((t) => [t.name, t.id as string]))

  for (const names of TEMPLATE_NAME_SETS) {
    if (names.every((n) => byName[n])) {
      return {
        set: names,
        ids: names.map((n) => ({ name: n, id: byName[n] })),
      }
    }
  }

  const available = (data || []).map((t) => t.name)
  if ((data || []).length >= 3) {
    const picked = (data || []).slice(0, 3)
    return {
      set: picked.map((t) => t.name) as unknown as readonly [string, string, string],
      ids: picked.map((t) => ({ name: t.name as string, id: t.id as string })),
    }
  }

  throw new Error(
    `Need ≥3 global staff_onboarding_templates. Available: ${available.join(", ") || "(none)"}`,
  )
}

async function ensureTourTeam(admin: SupabaseClient, tourId: string, name: string) {
  const { data: existing } = await admin
    .from("tour_teams")
    .select("id,name")
    .eq("tour_id", tourId)
    .eq("name", name)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data, error } = await admin
    .from("tour_teams")
    .insert({
      tour_id: tourId,
      name,
      team_type: "core",
    })
    .select("id")
    .single()

  if (error) throw new Error(`tour_teams insert failed: ${error.message}`)
  return data.id as string
}

async function ensureTourTeamMember(opts: {
  admin: SupabaseClient
  tourId: string
  teamId: string
  userId: string
  role: string
  displayName: string
  email?: string
}) {
  const { data: existing } = await opts.admin
    .from("tour_team_members")
    .select("id")
    .eq("tour_id", opts.tourId)
    .eq("user_id", opts.userId)
    .maybeSingle()

  const row = {
    tour_id: opts.tourId,
    team_id: opts.teamId,
    user_id: opts.userId,
    role: opts.role,
    name: opts.displayName,
    email: opts.email || null,
    contact_email: opts.email || null,
    status: "confirmed",
    is_active: true,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    await opts.admin.from("tour_team_members").update(row).eq("id", existing.id)
    return existing.id as string
  }

  const { data, error } = await opts.admin
    .from("tour_team_members")
    .insert(row)
    .select("id")
    .single()

  if (error) throw new Error(`tour_team_members insert failed: ${error.message}`)
  return data.id as string
}

async function grantOrgTourManager(opts: {
  admin: SupabaseClient
  opsOrgId: string | null | undefined
  userId: string
  role?: string
}) {
  if (!opts.opsOrgId) return
  const { data: existing } = await opts.admin
    .from("org_members")
    .select("org_id,role")
    .eq("org_id", opts.opsOrgId)
    .eq("user_id", opts.userId)
    .maybeSingle()

  if (existing) return

  const { error } = await opts.admin.from("org_members").insert({
    org_id: opts.opsOrgId,
    user_id: opts.userId,
    role: opts.role || "tour_manager",
    invited_by: opts.userId,
  })
  if (error) console.warn(`  · org_members grant skipped: ${error.message}`)
  else console.log(`  · granted org_members ${opts.role || "tour_manager"} → ${opts.userId}`)
}

async function findExistingTour(admin: SupabaseClient, orgUserId: string, name: string) {
  const { data } = await admin
    .from("tours")
    .select("id,name,status")
    .eq("created_by", orgUserId)
    .eq("name", name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function upsertPublishedJob(opts: {
  admin: SupabaseClient
  employerEntityId: string
  userId: string
  tourId: string
  title: string
  position: string
  department: string
  templateId: string
}) {
  const { data: existing } = await opts.admin
    .from("job_posting_templates")
    .select("id,title,status")
    .eq("employer_entity_type", "organization")
    .eq("employer_entity_id", opts.employerEntityId)
    .eq("title", opts.title)
    .eq("tour_id", opts.tourId)
    .maybeSingle()

  if (existing?.id) {
    await opts.admin
      .from("job_posting_templates")
      .update({
        onboarding_template_id: opts.templateId,
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
    return existing.id as string
  }

  const { data, error } = await opts.admin
    .from("job_posting_templates")
    .insert({
      employer_entity_type: "organization",
      employer_entity_id: opts.employerEntityId,
      title: opts.title,
      description: `${opts.title} for Pacific Signal West Coast Run — QA seeded job posting.`,
      department: opts.department,
      position: opts.position,
      employment_type: "contractor",
      location: "Tour — West Coast",
      experience_level: "entry",
      number_of_positions: 1,
      onboarding_template_id: opts.templateId,
      tour_id: opts.tourId,
      status: "published",
      application_form_template: { fields: [] },
      created_by: opts.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) throw new Error(`job_posting_templates insert failed (${opts.title}): ${error.message}`)
  return data.id as string
}

async function ensureHireToken(opts: {
  admin: SupabaseClient
  employerEntityId: string
  orgUserId: string
  workerEmail: string
  workerName: string
  workerUserId: string
  position: string
  department: string
  templateId: string
  jobPostingId: string
}) {
  const { data: existingCandidate } = await opts.admin
    .from("staff_onboarding_candidates")
    .select("id,invitation_token,email")
    .eq("employer_entity_type", "organization")
    .eq("employer_entity_id", opts.employerEntityId)
    .eq("email", opts.workerEmail)
    .eq("job_posting_id", opts.jobPostingId)
    .maybeSingle()

  if (existingCandidate?.invitation_token) {
    return {
      candidateId: existingCandidate.id as string,
      token: existingCandidate.invitation_token as string,
      reused: true,
    }
  }

  const token = mintToken()
  const now = new Date().toISOString()

  const { data: candidate, error: candErr } = await opts.admin
    .from("staff_onboarding_candidates")
    .insert({
      employer_entity_type: "organization",
      employer_entity_id: opts.employerEntityId,
      application_id: null,
      job_posting_id: opts.jobPostingId,
      name: opts.workerName,
      email: opts.workerEmail,
      user_id: opts.workerUserId,
      position: opts.position,
      department: opts.department,
      employment_type: "contractor",
      template_id: opts.templateId,
      status: "pending",
      stage: "invitation",
      onboarding_progress: 0,
      invitation_token: token,
      assigned_manager: opts.orgUserId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  if (candErr) throw new Error(`staff_onboarding_candidates insert failed: ${candErr.message}`)

  const { error: invErr } = await opts.admin.from("staff_invitations").insert({
    employer_entity_type: "organization",
    employer_entity_id: opts.employerEntityId,
    token,
    email: opts.workerEmail,
    position_details: {
      candidate_id: candidate.id,
      position: opts.position,
      job_posting_id: opts.jobPostingId,
    },
    role: opts.position,
    origin: "hiring_onboarding",
    status: "pending",
    template_id: opts.templateId,
    created_by: opts.orgUserId,
    created_at: now,
    updated_at: now,
  })

  if (invErr) throw new Error(`staff_invitations insert failed: ${invErr.message}`)

  return { candidateId: candidate.id as string, token, reused: false }
}

async function main() {
  const cast = getFlowCastCredentials()
  if (!cast.supabaseUrl || !cast.serviceRoleKey)
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")

  const accountsPath = resolve(process.cwd(), "docs/audits/qa-flow-accounts.json")
  if (!existsSync(accountsPath))
    throw new Error(`Missing ${accountsPath}. Run npm run qa:seed:flow first.`)

  const accounts = JSON.parse(readFileSync(accountsPath, "utf8")) as FlowAccountsFile
  const orgUser = accounts.users.org
  const artist1 = accounts.users.artist1
  const artist2 = accounts.users.artist2
  const artist3 = accounts.users.artist3
  const worker1 = accounts.users.worker1
  const worker2 = accounts.users.worker2
  const worker3 = accounts.users.worker3

  if (!orgUser?.userId || !accounts.organization.organizerAccountId)
    throw new Error("Org user / organizerAccountId missing from qa-flow-accounts.json")

  const admin = createClient(cast.supabaseUrl, cast.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { ensureAdminOrgScope } = await import("../../app/api/events/_lib/admin-event-persistence")
  const { buildTourBuilderPayload, initialTourBuilderForm, makeTourStop } = await import(
    "../../lib/admin/tour-builder"
  )
  const { AdminTourEventOperationsService } = await import(
    "../../lib/admin/tour-event-operations.service"
  )

  const opsOrgId = await ensureAdminOrgScope(admin, orgUser.userId)
  console.log(`✓ Org scope ${opsOrgId}`)

  const templates = await resolveOnboardingTemplates(admin)
  console.log(`✓ Templates: ${templates.ids.map((t) => t.name).join(", ")}`)

  let tourId: string
  const existingTour = await findExistingTour(admin, orgUser.userId, accounts.tour.name)
  if (existingTour?.id) {
    tourId = existingTour.id
    console.log(`✓ Reusing tour ${tourId}`)
  } else {
    const stops = WEST_COAST_ROUTE.map((stop, index) => ({
      ...makeTourStop(),
      name: `${stop.market} — ${stop.venue}`,
      venue: stop.venue,
      date: stop.date,
      time: "20:00",
      market: stop.market,
      leg_name: stop.leg,
      capacity: String(stop.capacity),
      advance_status: "not_started" as const,
      id: `draft-stop-${index + 1}`,
    }))

    const form = {
      ...initialTourBuilderForm,
      name: accounts.tour.name,
      mainArtist: accounts.band.name,
      // tours.artist_id FK may point at legacy `artists`, not `artist_profiles` — leave unset
      artistAccountId: "",
      description:
        "10-city West Coast run for multi-agent flow QA: routing, lodging, budget, crew shifts, band schedule.",
      status: "planning",
      startDate: WEST_COAST_ROUTE[0].date,
      endDate: WEST_COAST_ROUTE[WEST_COAST_ROUTE.length - 1].date,
      markets: WEST_COAST_ROUTE.map((s) => s.market).join(", "),
      stops,
      attachedEventIds: [] as string[],
      lodging: WEST_COAST_ROUTE.map((s) => `${s.market}: TBD hotel near ${s.venue}`).join("\n"),
      transportation: "Tour bus + one cargo van; fly Seattle↔Las Vegas bookends.",
      budget: "450000",
      perDiems: "75 USD / person / day",
      people: "Band (Pacific Signal) + 3 hired crew",
      routeNotes: "North→south coastal routing with Las Vegas closer.",
    }

    const payload = buildTourBuilderPayload(form)
    const tour = await AdminTourEventOperationsService.createTour({
      supabase: admin,
      userId: orgUser.userId,
      input: payload as never,
      orgId: opsOrgId,
    })
    tourId = (tour as { id: string }).id
    console.log(`✓ Created tour ${tourId}`)
  }

  const teamId = await ensureTourTeam(admin, tourId, "Core Production")
  console.log(`✓ Tour team ${teamId}`)

  const adminMembers = [
    { user: artist1, role: "admin", name: "River Quinn" },
    { user: artist2, role: "admin", name: "Sage Ortega" },
    { user: artist3, role: "admin", name: "Morgan Hale" },
    { user: orgUser, role: "tour_manager", name: "Alex Touring" },
  ]

  for (const m of adminMembers) {
    const memberId = await ensureTourTeamMember({
      admin,
      tourId,
      teamId,
      userId: m.user.userId,
      role: m.role,
      displayName: m.name,
      email: m.user.email,
    })
    console.log(`  · team member ${m.name} (${m.role}) ${memberId}`)
    await grantOrgTourManager({
      admin,
      opsOrgId,
      userId: m.user.userId,
      role: m.role === "tour_manager" ? "owner" : "tour_manager",
    })
  }

  const employerEntityId = accounts.organization.organizerAccountId!
  const jobDefs = [
    {
      title: "Tour Stagehand",
      position: "Stagehand",
      department: "Production",
      template: templates.ids[0],
      worker: worker1,
    },
    {
      title: "Tour Security Guard",
      position: "Security Guard",
      department: "Security",
      template: templates.ids[1],
      worker: worker2,
    },
    {
      title: "Tour Bartender",
      position: "Bartender",
      department: "Hospitality",
      template: templates.ids[2],
      worker: worker3,
    },
  ]

  const jobs: Array<{
    id: string
    title: string
    templateName: string
    templateId: string
    workerKey: string
    hireToken: string
    hirePath: string
    candidateId: string
  }> = []

  for (const def of jobDefs) {
    const jobId = await upsertPublishedJob({
      admin,
      employerEntityId,
      userId: orgUser.userId,
      tourId,
      title: def.title,
      position: def.position,
      department: def.department,
      templateId: def.template.id,
    })
    const hire = await ensureHireToken({
      admin,
      employerEntityId,
      orgUserId: orgUser.userId,
      workerEmail: def.worker.email,
      workerName: def.worker.email.split("@")[0],
      workerUserId: def.worker.userId,
      position: def.position,
      department: def.department,
      templateId: def.template.id,
      jobPostingId: jobId,
    })
    jobs.push({
      id: jobId,
      title: def.title,
      templateName: def.template.name,
      templateId: def.template.id,
      workerKey: def.worker.email,
      hireToken: hire.token,
      hirePath: `/onboarding/hire/${hire.token}`,
      candidateId: hire.candidateId,
    })
    console.log(`✓ Job ${def.title} → ${jobId} (token ${hire.reused ? "reused" : "minted"})`)
  }

  const lodgingNotes = WEST_COAST_ROUTE.map((s) => ({
    market: s.market,
    venue: s.venue,
    date: s.date,
    hotel: `${s.market} Tour Hotel`,
    rooms: 8,
    nightly_rate_usd: 189,
  }))

  // Placeholder venue (staff_shifts.venue_id is NOT NULL on live schema)
  let venueId: string | null = null
  {
    const { data: existingVenue } = await admin
      .from("venues")
      .select("id")
      .eq("name", "QA Flow Placeholder Venue")
      .maybeSingle()
    if (existingVenue?.id) venueId = existingVenue.id
    else {
      const { data: createdVenue, error: venueErr } = await admin
        .from("venues")
        .insert({ name: "QA Flow Placeholder Venue", city: "Seattle", capacity: 1000 })
        .select("id")
        .single()
      if (venueErr) console.warn(`  · venues seed skipped: ${venueErr.message}`)
      else venueId = createdVenue.id as string
    }
  }

  const crewShifts: Array<Record<string, unknown>> = []
  for (const [index, job] of jobs.entries()) {
    const stop = WEST_COAST_ROUTE[index]
    const worker = [worker1, worker2, worker3][index]
    crewShifts.push({
      worker_user_id: worker.userId,
      job_title: job.title,
      market: stop.market,
      date: stop.date,
      start_time: "14:00",
      end_time: "23:30",
    })
    // Live staff_shifts often requires venue_id + staff_member_id; crew_shifts in tour.settings is canonical for QA.
    if (!venueId) continue
    const { data: staffMember } = await admin
      .from("staff_members")
      .select("id")
      .eq("user_id", worker.userId)
      .maybeSingle()
    if (!staffMember?.id) {
      console.warn(`  · staff_shifts skipped for ${worker.email} (no staff_members row; using tour.settings.crew_shifts)`)
      continue
    }
    const shiftRow: Record<string, unknown> = {
      venue_id: venueId,
      staff_member_id: staffMember.id,
      shift_date: stop.date,
      start_time: "14:00:00",
      end_time: "23:30:00",
      role_assignment: job.title,
      notes: `QA flow seeded shift — ${stop.market} (${worker.email})`,
      status: "scheduled",
      created_by: orgUser.userId,
      org_id: opsOrgId,
    }
    const { error: shiftErr } = await admin.from("staff_shifts").insert(shiftRow)
    if (shiftErr) console.warn(`  · staff_shifts seed skipped: ${shiftErr.message}`)
    else console.log(`  · shift ${job.title} @ ${stop.market}`)
  }

  const { error: tourUpdateErr } = await admin
    .from("tours")
    .update({
      budget: 450000,
      settings: {
        route: WEST_COAST_ROUTE,
        lodging: lodgingNotes,
        transportation: "Tour bus + cargo van",
        band_schedule: WEST_COAST_ROUTE.map((s) => ({
          date: s.date,
          market: s.market,
          load_in: "14:00",
          soundcheck: "17:00",
          doors: "19:00",
          show: "20:00",
          load_out: "23:00",
        })),
        crew_shifts: crewShifts,
        qa_flow: true,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", tourId)

  if (tourUpdateErr) console.warn(`  · tour settings update: ${tourUpdateErr.message}`)
  else console.log("✓ Tour settings (lodging, band_schedule, crew_shifts)")

  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: accounts.baseUrl || cast.baseUrl,
    tourId,
    tourName: accounts.tour.name,
    teamId,
    opsOrgId,
    employerEntityId,
    templates: templates.ids,
    route: WEST_COAST_ROUTE,
    jobs,
    urls: {
      tourBuilder: `${accounts.baseUrl || cast.baseUrl}/admin/dashboard/tours/builder?draft=${tourId}`,
      tourHub: `${accounts.baseUrl || cast.baseUrl}/admin/dashboard/tours/${tourId}`,
      hiring: `${accounts.baseUrl || cast.baseUrl}/admin/dashboard/hiring`,
      hirePaths: jobs.map((j) => j.hirePath),
    },
  }

  const outDir = resolve(process.cwd(), "docs/audits")
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, "qa-flow-scenario.json")
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n✓ Wrote ${outPath}`)
  console.log("Scenario bootstrap complete.")
}

main().catch((error) => {
  console.error("\n✗ Scenario bootstrap failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
