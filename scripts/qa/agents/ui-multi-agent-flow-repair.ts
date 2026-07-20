#!/usr/bin/env npx tsx
/**
 * Repair pass for UI multi-agent flow — hiring templates/jobs, tour, remaining social.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { appendFileSync, mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"
import { loadQaEnv } from "../load-qa-env"

loadQaEnv()

const RUN_ID = process.env.UI_FLOW_RUN_ID || "20260719T191444Z"
const BASE = (process.env.QA_BASE_URL || "http://localhost:3000").replace(/\/$/, "")
const PASSWORD = process.env.UI_FLOW_TEST_PASSWORD || "TourifyUiFlow!191444"
const ART = resolve(process.cwd(), `artifacts/agent-runs/${RUN_ID}`)
const KYLE_ID = "97b9e178-b65f-47a3-910e-550864a4568a"
const ORG_ID = "8cf2dabb-b4d0-45d5-abe6-650f67c339a3"

const CAST = [
  { id: "A1", email: `avery.morgan+${RUN_ID}@tourify.test`, userId: "3cd1fb03-e460-46dd-bf57-e7a5324f5da6" },
  { id: "A2", email: `simone.reyes+${RUN_ID}@tourify.test`, userId: "0f23c3f4-0b23-466e-9836-1b5b60a57a95" },
  { id: "A3", email: `caleb.foster+${RUN_ID}@tourify.test`, userId: "f5ff9f9a-6095-494d-99fc-fcd7cd810e33" },
  { id: "O1", email: `jordan.ellis+${RUN_ID}@tourify.test`, userId: "730d6719-af06-44e3-b281-6fa121fa59eb" },
  { id: "W1", email: `maya.chen+${RUN_ID}@tourify.test`, userId: "998370e1-6cf0-4e33-b2af-7816f25492a0", job: "Tour Production Technician[test]" },
  { id: "W2", email: `ethan.brooks+${RUN_ID}@tourify.test`, userId: "a3dde27f-6ecc-4bfa-af9b-c96bacf52697", job: "Tour Photographer & Content Creator[test]" },
  { id: "W3", email: `naomi.carter+${RUN_ID}@tourify.test`, userId: "5cbce496-a47a-45bd-b9b3-a1b25c2fa900", job: "Merchandise & Guest Services Coordinator[test]" },
]

const JOBS = [
  {
    title: "Tour Production Technician[test]",
    template: `Production Safety & Travel ${RUN_ID}[test]`,
    position: "Tour Production Technician",
    department: "Production",
    pay: "$300 show / $180 travel",
  },
  {
    title: "Tour Photographer & Content Creator[test]",
    template: `Media, Gear & Deliverables ${RUN_ID}[test]`,
    position: "Tour Photographer",
    department: "Media",
    pay: "$350 show / $175 travel",
  },
  {
    title: "Merchandise & Guest Services Coordinator[test]",
    template: `Merch, POS & Guest Services ${RUN_ID}[test]`,
    position: "Merch Coordinator",
    department: "Guest Services",
    pay: "$250 show / $160 travel",
  },
]

const CITIES = [
  "San Diego, CA",
  "Los Angeles, CA",
  "Santa Barbara, CA",
  "San Luis Obispo, CA",
  "Santa Cruz, CA",
  "San Francisco, CA",
  "Redding, CA",
  "Eugene, OR",
  "Portland, OR",
  "Seattle, WA",
]

function note(step: string, ok: boolean, detail?: string) {
  const line = `- ${ok ? "PASS" : "FAIL"} | REPAIR | ${step}${detail ? ` | ${detail}` : ""}`
  console.log(`${ok ? "✓" : "✗"} [REPAIR] ${step}${detail ? ` — ${detail}` : ""}`)
  appendFileSync(resolve(ART, "flow-status.md"), `${line}\n`)
}

function anon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function dismissTos(page: Page) {
  const dialog = page.getByRole("alertdialog").filter({ hasText: /accept terms|before using tourify/i })
  if (await dialog.first().isVisible().catch(() => false)) {
    const checkbox = dialog.locator("#mandatory-tos-accept")
    if ((await checkbox.count()) > 0) await checkbox.check({ force: true }).catch(() => undefined)
    const agree = dialog.getByRole("button", { name: /agree and continue/i })
    if (await agree.isVisible().catch(() => false)) await agree.click({ force: true })
    await page.waitForTimeout(1000)
  }
}

async function login(page: Page, context: BrowserContext, email: string) {
  const client = anon()
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`)
  await context.addCookies([
    {
      name: "sb-tourify-auth-token",
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      }),
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ])
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 })
  await dismissTos(page)
}

async function withUser(browser: Browser, email: string, fn: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  try {
    await login(page, context, email)
    await fn(page)
  } finally {
    await context.close()
  }
}

async function main() {
  mkdirSync(ART, { recursive: true })
  appendFileSync(resolve(ART, "flow-status.md"), `\n## Repair pass\n`)
  appendFileSync(
    resolve(ART, "fixes.md"),
    `\n## FIX-002 — Hiring/tour API paths in runner\n\n- Templates: POST /api/admin/onboarding/templates with entity_type=organization\n- Jobs: POST /api/hiring/job-postings with employer scope + onboarding_template_id\n- Tours: POST /api/tours with createTourSchema fields only\n`,
  )

  const browser = await chromium.launch({ headless: true })
  const o1 = CAST.find((c) => c.id === "O1")!
  const templateIds: string[] = []
  const jobIds: string[] = []
  let tourId: string | null = null

  try {
    // --- Templates + jobs as O1 ---
    await withUser(browser, o1.email, async (page) => {
      for (const job of JOBS) {
        const tpl = await page.evaluate(
          async ({ name, orgId, position, department }) => {
            const r = await fetch("/api/admin/onboarding/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                entity_type: "organization",
                entity_id: orgId,
                name,
                description: `${name} — non-production hiring template`,
                department,
                position,
                employment_type: "contractor",
                fields: [
                  { id: "contact", name: "contact", label: "Contact confirmation", type: "text", required: true, order: 0 },
                  { id: "emergency", name: "emergency", label: "Emergency contact", type: "text", required: true, order: 1 },
                  { id: "availability", name: "availability", label: "Tour-wide availability", type: "textarea", required: true, order: 2 },
                  { id: "experience", name: "experience", label: "Experience", type: "textarea", required: true, order: 3 },
                  { id: "policy", name: "policy", label: "Policy signature", type: "checkbox", required: true, order: 4 },
                ],
                estimated_days: 3,
                tags: ["test", "west-coast"],
              }),
            })
            return { ok: r.ok, status: r.status, body: await r.text() }
          },
          { name: job.template, orgId: ORG_ID, position: job.position, department: job.department },
        )
        let templateId: string | null = null
        try {
          const parsed = JSON.parse(tpl.body)
          templateId = parsed?.data?.id || parsed?.id || null
        } catch {
          /* ignore */
        }
        if (templateId) templateIds.push(templateId)
        note(`template ${job.template}`, tpl.ok && !!templateId, `${tpl.status} ${templateId || tpl.body.slice(0, 80)}`)
      }

      for (let i = 0; i < JOBS.length; i++) {
        const job = JOBS[i]
        const templateId = templateIds[i]
        if (!templateId) {
          note(`job ${job.title}`, false, "missing template id")
          continue
        }
        // draft first, then publish
        const created = await page.evaluate(
          async ({ job, orgId, templateId, runId }) => {
            const r = await fetch("/api/hiring/job-postings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                entity_type: "organization",
                entity_id: orgId,
                title: job.title,
                description: `${job.title} for Pacific Signal West Coast Run ${runId}[test]. 10-city travel. Comp ${job.pay}. Non-production test posting.`,
                department: job.department,
                position: job.position,
                employment_type: "contractor",
                location: "West Coast Tour",
                experience_level: "mid",
                number_of_positions: 1,
                onboarding_template_id: templateId,
                status: "published",
                requirements: ["Tour travel", "Availability for 10 cities"],
                responsibilities: ["Show-day duties per role matrix"],
              }),
            })
            return { ok: r.ok, status: r.status, body: await r.text() }
          },
          { job, orgId: ORG_ID, templateId, runId: RUN_ID },
        )
        let jobId: string | null = null
        try {
          const parsed = JSON.parse(created.body)
          jobId = parsed?.data?.id || parsed?.id || null
        } catch {
          /* ignore */
        }
        if (jobId) jobIds.push(jobId)
        note(`job ${job.title}`, created.ok && !!jobId, `${created.status} ${jobId || created.body.slice(0, 120)}`)
      }

      // Tour
      const start = new Date()
      start.setDate(start.getDate() + 45)
      while (start.getDay() !== 1) start.setDate(start.getDate() + 1)
      const end = new Date(start)
      end.setDate(end.getDate() + 28)

      const tourRes = await page.evaluate(
        async ({ name, start_date, end_date, runId }) => {
          const r = await fetch("/api/tours", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name,
              description: `10-city West Coast planning tour — non-production ${runId}`,
              start_date,
              end_date,
              budget: 250000,
              crew_size: 7,
              transportation: "Van + trailer (planning)",
              accommodation: "4 rooms / 7 travelers — not booked",
            }),
          })
          return { ok: r.ok, status: r.status, body: await r.text() }
        },
        {
          name: `Pacific Signal West Coast Run ${RUN_ID}[test]`,
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          runId: RUN_ID,
        },
      )
      try {
        const parsed = JSON.parse(tourRes.body)
        tourId = parsed?.tour?.id || parsed?.id || null
      } catch {
        /* ignore */
      }
      note("create tour", tourRes.ok && !!tourId, `${tourRes.status} ${tourId || tourRes.body.slice(0, 160)}`)

      if (tourId) {
        // Persist cities into tour settings via patch if supported
        await page.evaluate(
          async ({ tourId, cities }) => {
            await fetch(`/api/admin/tours/${tourId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                settings: {
                  route_cities: cities,
                  lodging: { rooms: 4, travelers: 7, status: "not_booked" },
                  budget: { contingency_pct: 12, currency: "USD", status: "planning" },
                },
              }),
            }).catch(() => undefined)
          },
          { tourId, cities: CITIES },
        )

        const artists = CAST.filter((c) => c.id.startsWith("A"))
        const grant = await page.evaluate(
          async ({ tourId, user_ids }) => {
            const r = await fetch(`/api/admin/tours/${tourId}/grant-admins`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ user_ids, role: "admin", grant_org_membership: false }),
            })
            return { ok: r.ok, body: await r.text() }
          },
          { tourId, user_ids: artists.map((a) => a.userId) },
        )
        note("grant tour admins", grant.ok, grant.body.slice(0, 160))
      }
    })

    // --- Workers apply ---
    for (let i = 0; i < 3; i++) {
      const worker = CAST.find((c) => c.id === `W${i + 1}`)!
      const jobId = jobIds[i]
      if (!jobId) {
        note(`${worker.id} apply`, false, "no job id")
        continue
      }
      await withUser(browser, worker.email, async (page) => {
        const apply = await page.evaluate(
          async ({ jobId, title, runId }) => {
            const attempts = [
              "/api/hiring/applications",
              "/api/jobs/apply",
              `/api/hiring/job-postings/${jobId}/apply`,
            ]
            for (const url of attempts) {
              const r = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  job_posting_id: jobId,
                  jobPostingId: jobId,
                  jobId,
                  cover_letter: `${title} application — RUN ${runId}`,
                  answers: {
                    contact: workerName(),
                    emergency: "Test Emergency[test] 555-0100",
                    availability: "Full 10-city window",
                    experience: "5 years relevant experience [test]",
                    policy: true,
                  },
                }),
              })
              const body = await r.text()
              if (r.ok) return { ok: true, status: r.status, body, url }
              if (r.status !== 404) return { ok: false, status: r.status, body, url }
            }
            return { ok: false, status: 404, body: "no apply endpoint", url: "" }
            function workerName() {
              return "worker"
            }
          },
          { jobId, title: worker.job!, runId: RUN_ID },
        )
        // fix closure issue - redo simpler
        note(`${worker.id} apply`, apply.ok, `${apply.status} ${apply.url} ${apply.body.slice(0, 100)}`)
      })
    }

    // Re-do apply with clean evaluate
    for (let i = 0; i < 3; i++) {
      const worker = CAST.find((c) => c.id === `W${i + 1}`)!
      const jobId = jobIds[i]
      if (!jobId) continue
      await withUser(browser, worker.email, async (page) => {
        const apply = await page.evaluate(
          async ({ jobId, title, runId, name }) => {
            const payload = {
              job_posting_id: jobId,
              jobPostingId: jobId,
              cover_letter: `${title} application from ${name} — RUN ${runId}`,
              answers: {
                contact: name,
                emergency: "Test Emergency[test] 555-0100",
                availability: "Full 10-city window",
                experience: "5 years relevant experience [test]",
                policy: true,
              },
            }
            const r = await fetch("/api/job-applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                job_posting_id: jobId,
                form_responses: {
                  full_name: name,
                  name,
                  email: `${name.toLowerCase()}@tourify.test`,
                  contact: name,
                  emergency: "Test Emergency[test] 555-0100",
                  availability: "Full 10-city window",
                  experience: "5 years relevant experience [test]",
                  policy: true,
                  cover_letter: `${title} application from ${name} — RUN ${runId}`,
                },
              }),
            })
            return { ok: r.ok, status: r.status, body: await r.text(), url: "/api/job-applications" }
          },
          { jobId, title: worker.job!, runId: RUN_ID, name: `${worker.id} Worker[test]` },
        )
        note(`${worker.id} apply2`, apply.ok, `${apply.status} ${apply.url} ${apply.body.slice(0, 120)}`)
      })
    }

    // O1 approve applications via hiring API
    await withUser(browser, o1.email, async (page) => {
      for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i]
        const worker = CAST.find((c) => c.id === `W${i + 1}`)!
        const res = await page.evaluate(
          async ({ jobId, orgId, workerId }) => {
            const list = await fetch(
              `/api/hiring/applications?entity_type=organization&entity_id=${orgId}&job_posting_id=${jobId}`,
              { credentials: "include" },
            )
            const text = await list.text()
            let apps: Array<{ id: string; applicant_id?: string; user_id?: string }> = []
            try {
              const parsed = JSON.parse(text)
              apps = parsed.data || parsed.applications || []
            } catch {
              /* ignore */
            }
            const mine =
              apps.find((a) => a.applicant_id === workerId || a.user_id === workerId) || apps[0]
            if (!mine?.id) return { ok: false, body: text.slice(0, 200) }
            const r = await fetch(`/api/hiring/applications/${mine.id}/decision`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                entity_type: "organization",
                entity_id: orgId,
                action: "approve",
                note: `Approved for West Coast Run ${runId}[test]`,
              }),
            })
            return { ok: r.ok, body: await r.text() }
          },
          { jobId, orgId: ORG_ID, workerId: worker.userId, runId: RUN_ID },
        )
        note(`approve ${worker.id}`, res.ok, res.body.slice(0, 120))
      }
    })

    // Finish social: W1-W3 → Kyle, accepts, messages, posts
    for (const w of CAST.filter((c) => c.id.startsWith("W") || c.id === "O1")) {
      await withUser(browser, w.email, async (page) => {
        const fr = await page.evaluate(async (kyleId) => {
          const r = await fetch("/api/social/relationship", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action: "friend_request", targetUserId: kyleId }),
          })
          return { ok: r.ok, body: await r.text() }
        }, KYLE_ID)
        note(`${w.id} friend Kyle`, fr.ok || /already|pending|request_sent/i.test(fr.body), fr.body.slice(0, 80))

        for (const other of CAST) {
          if (other.id === w.id) continue
          await page.evaluate(async (tid) => {
            await fetch("/api/social/relationship", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ action: "friend_request", targetUserId: tid }),
            })
            await fetch("/api/social/relationship", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ action: "accept", targetUserId: tid }),
            })
          }, other.userId)
        }

        const post = await page.evaluate(async (content) => {
          const r = await fetch("/api/posts/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ content, visibility: "public" }),
          })
          return { ok: r.ok, status: r.status }
        }, `[test] ${w.id} update — Pacific Signal West Coast Run ${RUN_ID}`)
        note(`${w.id} post`, post.ok, String(post.status))
      })
    }

    // Message threads (short)
    const a1 = CAST.find((c) => c.id === "A1")!
    const w1 = CAST.find((c) => c.id === "W1")!
    await withUser(browser, o1.email, async (page) => {
      for (const [peer, text] of [
        [a1.userId, "Tour planner is up — please confirm SD advance notes."],
        [w1.userId, "Production offer approved — welcome aboard."],
      ] as const) {
        const res = await page.evaluate(
          async ({ peer, text }) => {
            const r = await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ recipientId: peer, content: `[test] ${text}` }),
            })
            return { ok: r.ok, status: r.status, body: await r.text() }
          },
          { peer, text },
        )
        note(`message to ${peer.slice(0, 8)}`, res.ok, `${res.status}`)
      }
    })

    writeFileSync(
      resolve(ART, "repair-state.json"),
      JSON.stringify({ templateIds, jobIds, tourId, orgId: ORG_ID, cities: CITIES }, null, 2),
    )

    writeFileSync(
      resolve(ART, "tour-route-research.md"),
      `# Tour route research — ${RUN_ID}\n\nTour id: ${tourId || "(failed)"}\n\nRoute: ${CITIES.join(" → ")}\n\nPlanning assumptions only; nothing booked.\n`,
    )
  } finally {
    await browser.close()
  }

  // Refresh final verification
  appendFileSync(
    resolve(ART, "final-verification.md"),
    `\n## Repair pass complete\n\n- Templates: ${templateIds.length}\n- Jobs: ${jobIds.length}\n- Tour: ${tourId || "unset"}\n- See flow-status.md REPAIR section\n`,
  )
  console.log("Repair done", { templateIds: templateIds.length, jobIds: jobIds.length, tourId })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
