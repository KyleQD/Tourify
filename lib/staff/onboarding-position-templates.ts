export interface CredentialRequirementTemplate {
  key: string
  label: string
  authority?: string
  isRequired: boolean
  isExpiryTracked: boolean
  notes?: string
}

export interface OnboardingPositionTemplate {
  key: string
  label: string
  department: string
  position: string
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | 'intern'
  estimatedDays: number
  requiredDocuments: string[]
  requiredCredentials: CredentialRequirementTemplate[]
  tags: string[]
}

const yes = true

export const ONBOARDING_POSITION_TEMPLATES: OnboardingPositionTemplate[] = [
  {
    key: 'security-guard',
    label: 'Security Guard',
    department: 'Security',
    position: 'Security Guard',
    employmentType: 'full_time',
    estimatedDays: 10,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification'],
    requiredCredentials: [
      { key: 'guard-card', label: 'Guard Card', authority: 'State Licensing Board', isRequired: yes, isExpiryTracked: yes },
      { key: 'cpr-card', label: 'CPR / First Aid Card', authority: 'AHA / Red Cross', isRequired: yes, isExpiryTracked: yes },
      { key: 'de-escalation-training', label: 'De-escalation Training', isRequired: true, isExpiryTracked: false },
    ],
    tags: ['security', 'licensed', 'safety'],
  },
  {
    key: 'forklift-operator',
    label: 'Forklift Operator',
    department: 'Operations',
    position: 'Forklift Operator',
    employmentType: 'full_time',
    estimatedDays: 8,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification'],
    requiredCredentials: [
      { key: 'forklift-cert', label: 'Forklift Certification', authority: 'OSHA', isRequired: yes, isExpiryTracked: yes },
      { key: 'osha-10', label: 'OSHA 10 (or equivalent safety cert)', authority: 'OSHA', isRequired: yes, isExpiryTracked: true },
      { key: 'equipment-safety', label: 'Equipment Safety Acknowledgement', isRequired: yes, isExpiryTracked: false },
    ],
    tags: ['operations', 'warehouse', 'safety'],
  },
  {
    key: 'sound-engineer',
    label: 'Sound Engineer',
    department: 'Technical',
    position: 'Sound Engineer',
    employmentType: 'full_time',
    estimatedDays: 14,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification', 'Portfolio / Reel'],
    requiredCredentials: [
      { key: 'audio-safety', label: 'Live Audio Safety Training', isRequired: yes, isExpiryTracked: false },
      { key: 'rigging-awareness', label: 'Rigging Awareness Certificate', isRequired: false, isExpiryTracked: true },
      { key: 'cpr-card', label: 'CPR / First Aid Card', authority: 'AHA / Red Cross', isRequired: false, isExpiryTracked: true },
    ],
    tags: ['technical', 'audio', 'production'],
  },
  {
    key: 'lighting-tech',
    label: 'Lighting Technician',
    department: 'Technical',
    position: 'Lighting Technician',
    employmentType: 'full_time',
    estimatedDays: 12,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification'],
    requiredCredentials: [
      { key: 'electrical-safety', label: 'Electrical Safety Training', isRequired: yes, isExpiryTracked: false },
      { key: 'lift-cert', label: 'Aerial Lift Certification', isRequired: false, isExpiryTracked: true },
      { key: 'osha-10', label: 'OSHA 10 (or equivalent safety cert)', authority: 'OSHA', isRequired: false, isExpiryTracked: true },
    ],
    tags: ['technical', 'lighting', 'safety'],
  },
  {
    key: 'bartender',
    label: 'Bartender',
    department: 'Service',
    position: 'Bartender',
    employmentType: 'part_time',
    estimatedDays: 7,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification'],
    requiredCredentials: [
      { key: 'alcohol-server', label: 'Alcohol Server Permit', isRequired: yes, isExpiryTracked: true },
      { key: 'food-handler', label: 'Food Handler Certification', isRequired: false, isExpiryTracked: true },
      { key: 'cpr-card', label: 'CPR / First Aid Card', isRequired: false, isExpiryTracked: true },
    ],
    tags: ['service', 'bar', 'compliance'],
  },
  {
    key: 'venue-manager',
    label: 'Venue Manager',
    department: 'Management',
    position: 'Venue Manager',
    employmentType: 'full_time',
    estimatedDays: 21,
    requiredDocuments: ['Government ID', 'W-4 Form', 'I-9 Verification', 'Management References'],
    requiredCredentials: [
      { key: 'leadership-training', label: 'Leadership / Management Training', isRequired: yes, isExpiryTracked: false },
      { key: 'incident-command', label: 'Incident Command / Emergency Planning', isRequired: false, isExpiryTracked: true },
      { key: 'cpr-card', label: 'CPR / First Aid Card', isRequired: false, isExpiryTracked: true },
    ],
    tags: ['management', 'leadership', 'operations'],
  },
]

export function getPositionTemplateByKey(key?: string | null) {
  if (!key) return null
  return ONBOARDING_POSITION_TEMPLATES.find((template) => template.key === key) || null
}

export function getRequiredCredentialLabelsForPosition(key?: string | null) {
  const template = getPositionTemplateByKey(key)
  if (!template) return []
  return template.requiredCredentials.filter((credential) => credential.isRequired).map((credential) => credential.label)
}
