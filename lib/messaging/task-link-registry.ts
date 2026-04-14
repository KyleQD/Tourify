/**
 * Task Link Registry — maps task types to deep-link URLs.
 * When an admin assigns a task via messaging, the system resolves
 * the correct page URL for the recipient to navigate to.
 */

export type TaskAction =
  | 'upload_credentials'
  | 'upload_documents'
  | 'complete_onboarding'
  | 'review_site_map'
  | 'sign_contract'
  | 'submit_availability'
  | 'complete_profile'
  | 'review_schedule'
  | 'upload_safety_cert'
  | 'review_runsheet'
  | 'acknowledge_bulletin'
  | 'custom_link'

export interface TaskLinkContext {
  eventId?: string
  tourId?: string
  venueId?: string
  jobId?: string
  documentId?: string
  onboardingToken?: string
  bulletinId?: string
  contractId?: string
  customUrl?: string
}

interface TaskLinkDefinition {
  label: string
  description: string
  category: 'onboarding' | 'documentation' | 'logistics' | 'compliance' | 'scheduling' | 'custom'
  isSensitive: boolean
  buildUrl: (ctx: TaskLinkContext) => string
}

const TASK_LINK_DEFINITIONS: Record<TaskAction, TaskLinkDefinition> = {
  upload_credentials: {
    label: 'Upload Credentials',
    description: 'Upload required credentials and certifications',
    category: 'onboarding',
    isSensitive: true,
    buildUrl: (ctx) => {
      if (ctx.onboardingToken) return `/onboarding/${ctx.onboardingToken}?step=credentials`
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=documents&upload=credentials`
      return '/settings?tab=credentials'
    },
  },
  upload_documents: {
    label: 'Upload Documents',
    description: 'Upload required documents for this event or position',
    category: 'documentation',
    isSensitive: true,
    buildUrl: (ctx) => {
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=documents&upload=true`
      if (ctx.venueId) return `/venue/dashboard/documents?upload=true`
      return '/settings?tab=documents'
    },
  },
  complete_onboarding: {
    label: 'Complete Onboarding',
    description: 'Complete your onboarding process',
    category: 'onboarding',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.onboardingToken) return `/onboarding/${ctx.onboardingToken}`
      if (ctx.jobId) return `/onboarding/complete?jobId=${ctx.jobId}`
      return '/onboarding'
    },
  },
  review_site_map: {
    label: 'Review Site Map',
    description: 'Review the event site map and layout',
    category: 'logistics',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=site-map`
      return '/admin/dashboard/logistics'
    },
  },
  sign_contract: {
    label: 'Sign Contract',
    description: 'Review and sign the contract',
    category: 'compliance',
    isSensitive: true,
    buildUrl: (ctx) => {
      if (ctx.contractId) return `/contracts/${ctx.contractId}`
      return '/contracts'
    },
  },
  submit_availability: {
    label: 'Submit Availability',
    description: 'Submit your availability for the event',
    category: 'scheduling',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=staff`
      return '/dashboard'
    },
  },
  complete_profile: {
    label: 'Complete Profile',
    description: 'Complete your profile information',
    category: 'onboarding',
    isSensitive: false,
    buildUrl: () => '/settings?tab=profile',
  },
  review_schedule: {
    label: 'Review Schedule',
    description: 'Review and confirm event schedule',
    category: 'scheduling',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=overview`
      return '/dashboard'
    },
  },
  upload_safety_cert: {
    label: 'Upload Safety Certification',
    description: 'Upload required safety certification documents',
    category: 'compliance',
    isSensitive: true,
    buildUrl: (ctx) => {
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=documents&upload=safety`
      return '/settings?tab=certifications'
    },
  },
  review_runsheet: {
    label: 'Review Run Sheet',
    description: 'Review the event run sheet',
    category: 'documentation',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.eventId && ctx.documentId)
        return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=documents&doc=${ctx.documentId}`
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=documents`
      return '/dashboard'
    },
  },
  acknowledge_bulletin: {
    label: 'Acknowledge Bulletin',
    description: 'Read and acknowledge a bulletin',
    category: 'documentation',
    isSensitive: false,
    buildUrl: (ctx) => {
      if (ctx.eventId && ctx.bulletinId)
        return `/admin/dashboard/events/${ctx.eventId}?tab=communications&section=bulletins&bulletin=${ctx.bulletinId}`
      if (ctx.eventId) return `/admin/dashboard/events/${ctx.eventId}?tab=communications`
      return '/dashboard'
    },
  },
  custom_link: {
    label: 'View Details',
    description: 'Navigate to the linked page',
    category: 'custom',
    isSensitive: false,
    buildUrl: (ctx) => ctx.customUrl || '/dashboard',
  },
}

export function resolveTaskLink(action: TaskAction, context: TaskLinkContext): string {
  const def = TASK_LINK_DEFINITIONS[action]
  if (!def) return '/dashboard'
  return def.buildUrl(context)
}

export function getTaskDefinition(action: TaskAction): TaskLinkDefinition | undefined {
  return TASK_LINK_DEFINITIONS[action]
}

export function getAllTaskActions(): Array<{ value: TaskAction; label: string; category: string; isSensitive: boolean }> {
  return Object.entries(TASK_LINK_DEFINITIONS).map(([key, def]) => ({
    value: key as TaskAction,
    label: def.label,
    category: def.category,
    isSensitive: def.isSensitive,
  }))
}

export function isTaskSensitive(action: TaskAction): boolean {
  return TASK_LINK_DEFINITIONS[action]?.isSensitive ?? false
}
