/**
 * COMMS-101 — Inventory of in-app / email / SMS / push / Work Mode / chat paths.
 * Each path records source, audience, dedupe/retry, privacy, owner, convergence.
 */

export type CommsChannel =
  | 'in-app'
  | 'email'
  | 'sms'
  | 'push'
  | 'work-mode'
  | 'chat'
  | 'other'

export type CommsPrivacyClass =
  | 'public'
  | 'org'
  | 'pii-sensitive'
  | 'safety-critical'

export type CommsConvergencePlan =
  | 'keep'
  | 'merge-outbox'
  | 'retire'
  | 'fix-then-merge'

export interface CommsDeliveryPath {
  id: string
  channels: CommsChannel[]
  source: string
  audience: string
  dedupeRetry: string
  privacy: CommsPrivacyClass
  owner: string
  convergence: CommsConvergencePlan
  notes?: string
}

export const COMMS_DELIVERY_PATHS: CommsDeliveryPath[] = [
  {
    id: 'PIPE-ONS',
    channels: ['in-app', 'email', 'sms', 'push'],
    source: 'lib/services/optimized-notification-service.ts → notifications',
    audience: 'Caller-supplied userId / batch userIds; prefs via should_send_notification',
    dedupeRetry: 'Prefs gate only; no durable dedupe; outbound fire-and-forget',
    privacy: 'pii-sensitive',
    owner: 'platform',
    convergence: 'merge-outbox',
    notes: 'Keep as in-app writer; outbound via publication adapters',
  },
  {
    id: 'PIPE-OUTBOUND',
    channels: ['email', 'sms', 'push'],
    source: 'lib/services/notification-delivery.ts + notification-channels.ts',
    audience: 'auth email + profiles.phone / push_token; prefs/quiet hours',
    dedupeRetry: 'Quiet-hours suppress; no retry/idempotency',
    privacy: 'pii-sensitive',
    owner: 'platform',
    convergence: 'merge-outbox',
  },
  {
    id: 'PIPE-WEBHOOK',
    channels: ['email', 'sms', 'push'],
    source: 'app/api/webhooks/supabase/notifications on notifications INSERT',
    audience: 'Same as PIPE-OUTBOUND',
    dedupeRetry: 'None; provider may redeliver webhook',
    privacy: 'pii-sensitive',
    owner: 'platform',
    convergence: 'retire',
    notes: 'Duplicates PIPE-ONS outbound — prefer single outbox path',
  },
  {
    id: 'PIPE-EMAIL-SVC',
    channels: ['email'],
    source: 'lib/services/email-delivery.service.ts (Resend)',
    audience: 'Explicit to',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'platform',
    convergence: 'merge-outbox',
  },
  {
    id: 'PIPE-PUB-OUTBOX',
    channels: ['other'],
    source: 'admin_publication_outbox + publication-outbox.service + cron',
    audience: 'Org-scoped payload / recipient fields on request',
    dedupeRetry: 'Idempotency key, claim/lock, backoff, max 8, DLQ + replay',
    privacy: 'org',
    owner: 'admin-publication',
    convergence: 'keep',
    notes: 'Target convergence hub for COMMS-403',
  },
  {
    id: 'PIPE-PUB-CHANNELS',
    channels: ['in-app', 'email', 'sms', 'push'],
    source: 'lib/admin/publication-channel-adapters.ts',
    audience: 'Adapter request recipientId + channel tokens',
    dedupeRetry: 'Consent suppress; retryability classified; not wired to most emits',
    privacy: 'pii-sensitive',
    owner: 'admin-publication',
    convergence: 'keep',
  },
  {
    id: 'SOC-LIKE-COMMENT-SHARE',
    channels: ['in-app'],
    source: 'SQL triggers on likes/comments/shares',
    audience: 'Content author',
    dedupeRetry: 'Prefs only',
    privacy: 'public',
    owner: 'social',
    convergence: 'merge-outbox',
  },
  {
    id: 'SOC-FOLLOW',
    channels: ['in-app'],
    source: 'SQL triggers on follow_requests',
    audience: 'Target / requester',
    dedupeRetry: 'Prefs only',
    privacy: 'public',
    owner: 'social',
    convergence: 'merge-outbox',
  },
  {
    id: 'SOC-MENTION-COLLAB',
    channels: ['in-app'],
    source: 'lib/feed/post-collaborators.ts',
    audience: 'Tagged / invited user IDs',
    dedupeRetry: 'None (Promise.allSettled)',
    privacy: 'public',
    owner: 'feed',
    convergence: 'merge-outbox',
  },
  {
    id: 'CHAT-DM',
    channels: ['chat', 'in-app'],
    source: 'app/api/messages + trg_dm_notify',
    audience: 'Other DM participant',
    dedupeRetry: 'Prefs; no message-level dedupe',
    privacy: 'pii-sensitive',
    owner: 'messaging',
    convergence: 'keep',
    notes: 'Keep chat store; merge notify into outbox',
  },
  {
    id: 'CHAT-GROUP',
    channels: ['chat', 'in-app'],
    source: 'group_messages + notify_group_message_recipients',
    audience: 'thread_members',
    dedupeRetry: 'Prefs only',
    privacy: 'pii-sensitive',
    owner: 'messaging',
    convergence: 'keep',
  },
  {
    id: 'CHAT-EVENT-GROUP',
    channels: ['chat', 'in-app'],
    source: 'event_group_messages + notify_event_group_message_recipients',
    audience: 'event_group_chats.member_ids',
    dedupeRetry: 'Prefs only',
    privacy: 'org',
    owner: 'admin-events',
    convergence: 'keep',
  },
  {
    id: 'CHAT-HIRING-THREAD',
    channels: ['chat'],
    source: 'lib/rebuild/hiring-applicant-comms.ts',
    audience: 'Applicant ↔ hiring manager',
    dedupeRetry: 'Conversation upsert soft-dedupe',
    privacy: 'pii-sensitive',
    owner: 'hiring',
    convergence: 'keep',
  },
  {
    id: 'INBOX-UNIFIED',
    channels: ['other'],
    source: 'app/api/messages/unified-list',
    audience: 'Authed user membership',
    dedupeRetry: 'N/A (read model)',
    privacy: 'pii-sensitive',
    owner: 'messaging',
    convergence: 'keep',
    notes: 'COMMS-402 inbox projection',
  },
  {
    id: 'ADMIN-COMMS-TEAM',
    channels: ['in-app'],
    source: 'app/api/admin/communications + notify_team_communication_recipients',
    audience: 'Explicit recipients[]',
    dedupeRetry: 'idempotency_key stored but not enforced; double fanout API+trigger',
    privacy: 'safety-critical',
    owner: 'admin-logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'ADMIN-BROADCAST',
    channels: ['in-app'],
    source: 'app/api/admin/messages/broadcast',
    audience: 'profiles by coarse account_type',
    dedupeRetry: 'Batch only; no org scope / dedupe',
    privacy: 'org',
    owner: 'admin',
    convergence: 'retire',
    notes: 'Rebuild with signed org audience or retire',
  },
  {
    id: 'ADMIN-NOTIF-MANUAL',
    channels: ['in-app'],
    source: 'app/api/admin/notifications POST',
    audience: 'Explicit user_id',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'admin',
    convergence: 'merge-outbox',
  },
  {
    id: 'EVENT-BULLETIN',
    channels: ['work-mode', 'in-app'],
    source: 'app/api/admin/events/[id]/communications → event_bulletins',
    audience: 'event_participants (cap 100)',
    dedupeRetry: 'None found',
    privacy: 'safety-critical',
    owner: 'admin-events',
    convergence: 'merge-outbox',
  },
  {
    id: 'EVENT-TASK-MSG',
    channels: ['in-app'],
    source: 'app/api/admin/events/[id]/task-messages',
    audience: 'Explicit recipient_ids',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'admin-events',
    convergence: 'merge-outbox',
  },
  {
    id: 'WORKMODE-PUB',
    channels: ['work-mode'],
    source: 'work_mode_publications via event/site-map/tour-event ops',
    audience: 'visible_to (e.g. assigned_workers); no push fanout found',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'admin-ops',
    convergence: 'keep',
    notes: 'Keep store; add outbox notify',
  },
  {
    id: 'LOG-TRAVEL-CHANGE',
    channels: ['in-app', 'sms'],
    source: 'lib/logistics/travel-change-notify.ts',
    audience: 'Org admins, passengers, guests, transport parties; SMS to drivers',
    dedupeRetry: 'No durable dedupe/retry',
    privacy: 'safety-critical',
    owner: 'logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'LOG-TRANSPORT-EXTRA',
    channels: ['in-app'],
    source: 'app/api/admin/logistics/transport + sendLogisticsNotifications',
    audience: 'Route-specific authorized recipients',
    dedupeRetry: 'Same as logistics adapter',
    privacy: 'safety-critical',
    owner: 'logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'LOG-TASK-STATUS',
    channels: ['in-app'],
    source: 'SQL trg_logistics_task_status on logistics_tasks',
    audience: 'assigned_to_user_id',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'LOG-SITEMAP-SHARE',
    channels: ['in-app'],
    source: 'app/api/admin/logistics/site-maps/[id]/share',
    audience: 'Resolved collaborator user',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'LOG-SITEMAP-TASK',
    channels: ['in-app'],
    source: 'app/api/admin/logistics/site-maps/[id]/tasks',
    audience: 'Assignees via ONS',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'logistics',
    convergence: 'merge-outbox',
  },
  {
    id: 'HIRE-SHIFT',
    channels: ['in-app'],
    source: 'lib/rebuild/shift-assignment-notify.ts',
    audience: 'Worker / admin on respond',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'hiring',
    convergence: 'merge-outbox',
  },
  {
    id: 'HIRE-ONBOARD',
    channels: ['in-app', 'chat'],
    source: 'lib/rebuild/hiring-onboarding-notify.ts',
    audience: 'Applicant',
    dedupeRetry: 'Resend flag only',
    privacy: 'pii-sensitive',
    owner: 'hiring',
    convergence: 'merge-outbox',
  },
  {
    id: 'HIRE-ROSTER',
    channels: ['in-app'],
    source: 'lib/rebuild/hiring-roster-notify.ts',
    audience: 'Worker',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'hiring',
    convergence: 'merge-outbox',
  },
  {
    id: 'HIRE-APPROVAL',
    channels: ['in-app', 'chat'],
    source: 'hiring-automation / hiring-application-approval / admin applications',
    audience: 'Applicant, actor, recognition nudge',
    dedupeRetry: 'Soft-fail; no dedupe',
    privacy: 'pii-sensitive',
    owner: 'hiring',
    convergence: 'merge-outbox',
  },
  {
    id: 'HIRE-STATUS-AUDIT',
    channels: ['in-app'],
    source: 'app/api/admin/applications direct insert hiring_status_transition',
    audience: 'Actor only',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'hiring',
    convergence: 'retire',
  },
  {
    id: 'HIRE-ENHANCED-ONBOARD',
    channels: ['in-app'],
    source: 'lib/services/enhanced-onboarding.service.ts',
    audience: 'Candidate user_id',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'hiring',
    convergence: 'merge-outbox',
    notes: 'Overlaps HIRE-ONBOARD',
  },
  {
    id: 'TOUR-INVITE',
    channels: ['email', 'sms'],
    source: 'app/api/tours/[id]/invites',
    audience: 'Invite email/phone',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'tours',
    convergence: 'merge-outbox',
  },
  {
    id: 'TICKET-LIFECYCLE',
    channels: ['in-app'],
    source: 'lib/ticketing/notifications.ts',
    audience: 'Buyer / transfer parties',
    dedupeRetry: 'idempotency_key in metadata not enforced in DB',
    privacy: 'pii-sensitive',
    owner: 'ticketing',
    convergence: 'merge-outbox',
  },
  {
    id: 'BOOKING-RESPONSE',
    channels: ['in-app'],
    source: 'app/api/booking-requests',
    audience: 'Broken — insert missing user_id observed',
    dedupeRetry: 'None found',
    privacy: 'org',
    owner: 'booking',
    convergence: 'fix-then-merge',
  },
  {
    id: 'CONTRACT-SIGN',
    channels: ['in-app'],
    source: 'SQL notify on artist_contracts',
    audience: 'counterparty_user_id',
    dedupeRetry: 'None found',
    privacy: 'pii-sensitive',
    owner: 'contracts',
    convergence: 'merge-outbox',
  },
  {
    id: 'MUSIC-CERT',
    channels: ['in-app'],
    source: 'app/api/admin/content/music/certifications',
    audience: 'Case user_id',
    dedupeRetry: 'Soft dedupe via existingDecision',
    privacy: 'org',
    owner: 'music',
    convergence: 'merge-outbox',
  },
  {
    id: 'SOCIAL-BADGE-ENDORSE',
    channels: ['in-app'],
    source: 'badges / endorsements / achievement APIs',
    audience: 'Endorsee / awardee',
    dedupeRetry: 'None found',
    privacy: 'public',
    owner: 'social',
    convergence: 'merge-outbox',
  },
  {
    id: 'FORUM-REPLY',
    channels: ['in-app'],
    source: 'app/forums/_actions/post-actions.ts → notifications_v2',
    audience: 'Parent post author',
    dedupeRetry: 'None found',
    privacy: 'public',
    owner: 'forums',
    convergence: 'merge-outbox',
    notes: 'Parallel notifications_v2 store',
  },
  {
    id: 'PROMO-EMAIL',
    channels: ['email'],
    source: 'lib/email/send-promotional-email.ts',
    audience: 'Explicit to',
    dedupeRetry: 'None found',
    privacy: 'public',
    owner: 'growth',
    convergence: 'keep',
    notes: 'Consent-gated; route via email adapter',
  },
  {
    id: 'AUTH-RESEND',
    channels: ['email'],
    source: 'Supabase Auth resend in auth-context',
    audience: 'Signup email',
    dedupeRetry: 'Provider rate limit',
    privacy: 'pii-sensitive',
    owner: 'auth',
    convergence: 'keep',
  },
  {
    id: 'MOBILE-PUSH-REG',
    channels: ['push'],
    source: 'apps/mobile push-notifications → profiles.push_token',
    audience: 'Device owner',
    dedupeRetry: 'N/A (registration only)',
    privacy: 'pii-sensitive',
    owner: 'mobile',
    convergence: 'keep',
  },
  {
    id: 'API-NOTIF-CRUD',
    channels: ['in-app'],
    source: 'app/api/notifications + preferences routes',
    audience: 'Authed / schema user',
    dedupeRetry: 'Prefs on create path',
    privacy: 'org',
    owner: 'platform',
    convergence: 'keep',
    notes: 'Keep read/prefs; writes via outbox',
  },
]

export const COMMS_REQUIRED_CHANNELS: CommsChannel[] = [
  'in-app',
  'email',
  'sms',
  'push',
  'work-mode',
  'chat',
]

export function assertComms101InventoryCoverage(paths: CommsDeliveryPath[] = COMMS_DELIVERY_PATHS): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  const ids = new Set<string>()

  for (const path of paths) {
    if (!path.id) failures.push('path missing id')
    if (ids.has(path.id)) failures.push(`duplicate id ${path.id}`)
    ids.add(path.id)
    if (!path.source?.trim()) failures.push(`${path.id} missing source`)
    if (!path.audience?.trim()) failures.push(`${path.id} missing audience`)
    if (!path.dedupeRetry?.trim()) failures.push(`${path.id} missing dedupeRetry`)
    if (!path.privacy) failures.push(`${path.id} missing privacy`)
    if (!path.owner?.trim()) failures.push(`${path.id} missing owner`)
    if (!path.convergence) failures.push(`${path.id} missing convergence`)
    if (!path.channels?.length) failures.push(`${path.id} missing channels`)
  }

  for (const channel of COMMS_REQUIRED_CHANNELS) {
    if (!paths.some((p) => p.channels.includes(channel)))
      failures.push(`no path covers channel ${channel}`)
  }

  return { ok: failures.length === 0, failures }
}
