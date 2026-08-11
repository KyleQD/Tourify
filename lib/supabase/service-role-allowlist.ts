/**
 * SEC-109 — Named modules/jobs permitted to obtain a service-role client
 * through `executeServiceRoleJob`.
 */

export const SERVICE_ROLE_MODULES = [
  "admin.ticketing.refund",
  "admin.communications",
  "admin.calendar.token",
  "admin.messages",
  "admin.publication.outbox",
  "admin.publication.delivery",
  "admin.publication.share-resolution",
  "admin.command-center.projection",
  "admin.workforce.assignment",
  "admin.workforce.identity-merge",
  "security.audit",
  "admin.logistics.site-map-public-link",
  "admin.events.advancing",
  "admin.events.day-sheet",
  "admin.applications",
  "admin.artists",
  "cron.event-reminders",
  "cron.staffing-overview-refresh",
  "cron.contract-sign-reminders",
  "ticketing.webhook",
  "ticketing.box-office",
  "ticketing.check-in",
  "hiring.applicant-comms",
  "hiring.application-approval",
  "hiring.staff-shift-sync",
  "notifications.delivery",
  "marketplace.webhooks",
  "music.rights.public",
  "accounts.server-load",
] as const

export type ServiceRoleModuleId = (typeof SERVICE_ROLE_MODULES)[number]

export function isAllowedServiceRoleModule(moduleId: string): moduleId is ServiceRoleModuleId {
  return (SERVICE_ROLE_MODULES as readonly string[]).includes(moduleId)
}
