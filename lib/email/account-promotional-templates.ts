/**
 * Promotional / feature-overview emails by account type.
 * For campaigns or manual sends — not wired to onboarding automation.
 * Copy is aligned with routes in docs/qa-account-matrix.md and docs/FRONTEND_DASHBOARD_UX_AUDIT.md.
 */

import { getSiteOrigin } from "./email-branding"
import {
  emailButton,
  emailFallbackUrl,
  emailLayout,
  emailLayoutPlainText,
  escapeHtml,
} from "./email-layout"

export interface PromoEmailBaseArgs {
  /** Primary CTA (full URL), e.g. dashboard entry for this persona */
  ctaUrl: string
  /** Override logo/host origin; defaults from NEXT_PUBLIC_SITE_URL */
  logoOrigin?: string
  /** Optional second link rendered as text below the primary button */
  secondaryCta?: { url: string; label: string }
}

function secondaryLinkHtml(secondary?: { url: string; label: string }): string {
  if (!secondary) return ""
  const label = escapeHtml(secondary.label)
  const url = escapeHtml(secondary.url)
  return `<p style="margin:0 0 0 0;color:#94a3b8;font-size:14px;line-height:1.5;">
  <a href="${url}" style="color:#a78bfa;text-decoration:underline;font-weight:500;">${label}</a>
</p>`
}

function secondaryLinkText(secondary?: { url: string; label: string }): string {
  if (!secondary) return ""
  return `${secondary.label}: ${secondary.url}`
}

function featureLine(label: string, body: string): string {
  return `<p style="margin:0 0 14px 0;line-height:1.55;"><strong style="color:#f8fafc;font-weight:600;">${escapeHtml(
    label,
  )}</strong><span style="color:#cbd5e1;"> — ${escapeHtml(body)}</span></p>`
}

export function buildGeneralPromotionalEmail(args: PromoEmailBaseArgs) {
  const site = args.logoOrigin ?? getSiteOrigin()
  const secondary = args.secondaryCta
  const bodyHtml = `
    <p style="margin:0 0 18px 0;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.3;">Everything in one place for your next move</p>
    <p style="margin:0 0 20px 0;color:#cbd5e1;">Your general Tourify account is built around discovery, applications, and day-to-day coordination.</p>
    ${featureLine("Dashboard", "Central home for quick actions, bookings context, and recent activity.")}
    ${featureLine("Jobs", "Browse roles, collaborations, saved posts, applications, and staffing-related listings from one surface.")}
    ${featureLine("Bookings", "Track booking-related activity alongside the rest of your workflow.")}
    ${featureLine("Settings & integrations", "Connect tools and tune preferences shared across account types.")}
    <p style="margin:22px 0 0 0;color:#94a3b8;font-size:13px;">Public artist profile pages remain readable to everyone; artist-only tools open when you use an artist-enabled account.</p>
    ${emailButton({ href: args.ctaUrl, label: "Open dashboard" })}
    ${secondaryLinkHtml(secondary)}
    ${emailFallbackUrl(args.ctaUrl)}
  `
  const text = emailLayoutPlainText({
    title: "Tourify — your general account",
    bodyLines: [
      "Dashboard: quick actions, bookings context, and recent activity.",
      "Jobs: browse, save, apply, and follow staffing-related listings.",
      "Bookings: stay on top of booking-related updates.",
      "Settings: integrations and preferences shared across Tourify.",
      "",
      "Artist-only app areas require an artist-enabled account; public /artist/{handle} pages are open to visitors.",
    ],
    ctaUrl: args.ctaUrl,
    ctaLabel: "Open dashboard",
    footerLines: secondaryLinkText(secondary) ? [secondaryLinkText(secondary)!] : [],
  })
  return {
    subject: "Tourify: jobs, dashboard, and tools for your general account",
    html: emailLayout({
      title: "Tourify overview",
      preheader: "Jobs, dashboard, bookings, and settings on Tourify.",
      subtitle: "General account",
      bodyHtml,
      logoOrigin: site,
    }),
    text,
  }
}

export function buildArtistPromotionalEmail(args: PromoEmailBaseArgs) {
  const site = args.logoOrigin ?? getSiteOrigin()
  const secondary = args.secondaryCta
  const bodyHtml = `
    <p style="margin:0 0 18px 0;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.3;">Your artist command center</p>
    <p style="margin:0 0 20px 0;color:#cbd5e1;">The artist app shell is where you run releases, events, content, and business workflows in one cohesive layout.</p>
    ${featureLine("Artist dashboard", "Scheduled events, content performance, action items, business insights, recommendations, analytics, and notifications.")}
    ${featureLine("Events & touring", "Upcoming performances, capacity and venue context, ticketing hooks where configured, and quick links into event management.")}
    ${featureLine("Content & media", "Tracks, video, imagery, and publishing flows tied to your artist profile.")}
    ${featureLine("Contracts", "Send and track agreements for signature inside Tourify (invites and reminders land in the same email system you trust).")}
    ${featureLine("Public profile", "Shareable /artist/{handle} presence for fans and industry; distinct from private dashboard tools.")}
    ${emailButton({ href: args.ctaUrl, label: "Open artist dashboard" })}
    ${secondaryLinkHtml(secondary)}
    ${emailFallbackUrl(args.ctaUrl)}
  `
  const text = emailLayoutPlainText({
    title: "Tourify — artist account",
    bodyLines: [
      "Artist dashboard: events, content, tasks, insights, recommendations, analytics, notifications.",
      "Events: schedule, venues, ticketing-related context where enabled.",
      "Content: media library and publishing tied to your profile.",
      "Contracts: invitations and signatures within Tourify.",
      "Public profile: /artist/{handle} for your outward-facing page.",
    ],
    ctaUrl: args.ctaUrl,
    ctaLabel: "Open artist dashboard",
    footerLines: secondaryLinkText(secondary) ? [secondaryLinkText(secondary)!] : [],
  })
  return {
    subject: "Tourify for artists: dashboard, events, content, and contracts",
    html: emailLayout({
      title: "Artist tools on Tourify",
      preheader: "Dashboard, events, content, contracts, and public profile.",
      subtitle: "Artist account",
      bodyHtml,
      logoOrigin: site,
    }),
    text,
  }
}

export function buildVenuePromotionalEmail(args: PromoEmailBaseArgs) {
  const site = args.logoOrigin ?? getSiteOrigin()
  const secondary = args.secondaryCta
  const bodyHtml = `
    <p style="margin:0 0 18px 0;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.3;">Operate the venue side of the house</p>
    <p style="margin:0 0 20px 0;color:#cbd5e1;">Venue accounts focus on hiring, staffing pipelines, and operational visibility across your property.</p>
    ${featureLine("Venue dashboard", "Operational snapshot with paths into jobs, applicants, and staffing workflows.")}
    ${featureLine("Job postings", "Create and manage venue roles; review applicants from a hiring-oriented inbox.")}
    ${featureLine("Staff & onboarding", "Staff directory, onboarding flows, and venue-scoped tooling under /venue/staff.")}
    ${featureLine("Collaboration with artists", "Use shared marketplace and job surfaces to align with touring and talent partners where your stack is connected.")}
    ${emailButton({ href: args.ctaUrl, label: "Open venue dashboard" })}
    ${secondaryLinkHtml(secondary)}
    ${emailFallbackUrl(args.ctaUrl)}
  `
  const text = emailLayoutPlainText({
    title: "Tourify — venue account",
    bodyLines: [
      "Venue dashboard: jobs, applicants, and staffing snapshot.",
      "Jobs: post and manage venue-side roles.",
      "Staff: directory and onboarding under /venue/staff.",
      "Collaboration: shared jobs and marketplace touchpoints with artists where configured.",
    ],
    ctaUrl: args.ctaUrl,
    ctaLabel: "Open venue dashboard",
    footerLines: secondaryLinkText(secondary) ? [secondaryLinkText(secondary)!] : [],
  })
  return {
    subject: "Tourify for venues: dashboard, jobs, staff, and applicants",
    html: emailLayout({
      title: "Venue tools on Tourify",
      preheader: "Dashboard, postings, staff onboarding, and applicants.",
      subtitle: "Venue account",
      bodyHtml,
      logoOrigin: site,
    }),
    text,
  }
}

export function buildOrganizationPromotionalEmail(args: PromoEmailBaseArgs) {
  const site = args.logoOrigin ?? getSiteOrigin()
  const secondary = args.secondaryCta
  const bodyHtml = `
    <p style="margin:0 0 18px 0;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.3;">Built for teams and industry orgs</p>
    <p style="margin:0 0 20px 0;color:#cbd5e1;">Organization-style accounts map from industry signup selections and pair team structure with Tourify collaboration features.</p>
    ${featureLine("Organizations", "Create org workspaces with members, roles (owner, admin, production, finance), and shared context.")}
    ${featureLine("Invitations", "Email-based invites with secure accept links; aligns with Tourify branded transactional mail.")}
    ${featureLine("Shared dashboard entry", "Members still use /dashboard and account switching patterns documented in the QA matrix for cross-surface work.")}
    ${featureLine("Integrations", "Org members leverage the same settings and integration surfaces as other account types where policy allows.")}
    ${emailButton({ href: args.ctaUrl, label: "Go to Tourify" })}
    ${secondaryLinkHtml(secondary)}
    ${emailFallbackUrl(args.ctaUrl)}
  `
  const text = emailLayoutPlainText({
    title: "Tourify — organization account",
    bodyLines: [
      "Organizations: workspaces, members, roles (owner, admin, production, finance).",
      "Invitations: secure email invites to join an org.",
      "Dashboard: shared entry and account switching per your deployment.",
      "Integrations: settings surfaces shared with other account types where allowed.",
    ],
    ctaUrl: args.ctaUrl,
    ctaLabel: "Open Tourify",
    footerLines: secondaryLinkText(secondary) ? [secondaryLinkText(secondary)!] : [],
  })
  return {
    subject: "Tourify for organizations: teams, roles, and invitations",
    html: emailLayout({
      title: "Organization tools on Tourify",
      preheader: "Teams, roles, invites, and shared collaboration.",
      subtitle: "Organization account",
      bodyHtml,
      logoOrigin: site,
    }),
    text,
  }
}

export function buildAdminPromotionalEmail(args: PromoEmailBaseArgs) {
  const site = args.logoOrigin ?? getSiteOrigin()
  const secondary = args.secondaryCta
  const bodyHtml = `
    <p style="margin:0 0 18px 0;color:#f8fafc;font-size:20px;font-weight:600;line-height:1.3;">Platform operations at a glance</p>
    <p style="margin:0 0 20px 0;color:#cbd5e1;">Admin and organizer surfaces are restricted routes for trusted staff who run Tourify day-to-day.</p>
    ${featureLine("Admin dashboard", "Cross-platform KPIs, health checks, and shortcuts into staffing and jobs operations.")}
    ${featureLine("Applications & staffing", "Review pipelines for applicants, staffing programs, and venue/industry coordination where your deployment enables them.")}
    ${featureLine("Jobs oversight", "Moderation and support views over marketplace and job activity tied to admin routes.")}
    ${featureLine("Access control", "Entry is enforced via profile gates (see admin-profile-gates); keep this inbox limited to authorized operators only.")}
    ${emailButton({ href: args.ctaUrl, label: "Open admin dashboard" })}
    ${secondaryLinkHtml(secondary)}
    ${emailFallbackUrl(args.ctaUrl)}
  `
  const text = emailLayoutPlainText({
    title: "Tourify — admin / organizer",
    bodyLines: [
      "Admin dashboard: KPIs and operational shortcuts.",
      "Applications & staffing: review and manage pipelines where enabled.",
      "Jobs: oversight and support tooling on admin routes.",
      "Access: restricted to authorized profiles per admin-profile-gates.",
    ],
    ctaUrl: args.ctaUrl,
    ctaLabel: "Open admin dashboard",
    footerLines: secondaryLinkText(secondary) ? [secondaryLinkText(secondary)!] : [],
  })
  return {
    subject: "Tourify for admins: dashboard, applications, and jobs oversight",
    html: emailLayout({
      title: "Admin tools on Tourify",
      preheader: "Dashboard, applications, staffing, and jobs oversight.",
      subtitle: "Admin / organizer",
      bodyHtml,
      logoOrigin: site,
    }),
    text,
  }
}

export type PromotionalAccountType = "general" | "artist" | "venue" | "organization" | "admin"

export function buildPromotionalEmailForAccountType(
  accountType: PromotionalAccountType,
  args: PromoEmailBaseArgs,
) {
  switch (accountType) {
    case "general":
      return buildGeneralPromotionalEmail(args)
    case "artist":
      return buildArtistPromotionalEmail(args)
    case "venue":
      return buildVenuePromotionalEmail(args)
    case "organization":
      return buildOrganizationPromotionalEmail(args)
    case "admin":
      return buildAdminPromotionalEmail(args)
  }
}
