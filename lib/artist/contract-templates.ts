/**
 * Fill-in contract templates for artists — not legal advice; have counsel review before use.
 */

export type ContractDbType =
  | 'performance'
  | 'licensing'
  | 'recording'
  | 'management'
  | 'publishing'
  | 'endorsement'
  | 'other'

export type TemplateVariableInput = 'text' | 'number' | 'date' | 'textarea'

export interface ContractTemplateVariable {
  key: string
  label: string
  input: TemplateVariableInput
  placeholder?: string
}

export interface ContractTemplate {
  id: string
  title: string
  shortDescription: string
  /** Name of lucide-react icon for UI */
  iconName:
    | 'Mic2'
    | 'Building2'
    | 'Camera'
    | 'Video'
    | 'Shirt'
    | 'Disc3'
    | 'Users'
    | 'Guitar'
    | 'Film'
    | 'Briefcase'
  dbType: ContractDbType
  variables: ContractTemplateVariable[]
  /** Must use {{key}} placeholders matching variables */
  bodyTemplate: string
}

const LEGAL_NOTICE = `IMPORTANT: This is a plain-language draft for discussion only. It is not legal advice and may not fit your situation or jurisdiction. Have a qualified attorney review before you rely on it.

`

function replacePlaceholders(template: string, values: Record<string, string>): string {
  let out = template
  for (const key of Object.keys(values)) {
    const v = values[key]?.trim() || `____________`
    out = out.split(`{{${key}}}`).join(v)
  }
  // leave any unreplaced keys visible
  return out.replace(/\{\{(\w+)\}\}/g, '____________')
}

export function buildContractTermsFromTemplate(
  tpl: ContractTemplate,
  values: Record<string, string>
): string {
  return LEGAL_NOTICE + replacePlaceholders(tpl.bodyTemplate, values)
}

export function defaultTitleForTemplate(tpl: ContractTemplate, values: Record<string, string>): string {
  const party = values.counterparty_name?.trim() || values.venue_name?.trim() || values.client_name?.trim() || 'Counterparty'
  return `${tpl.title} — ${party}`
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'live-performance-venue',
    title: 'Live performance (venue / promoter)',
    shortDescription: 'Fee, set length, sound check, and cancellation basics for a public show.',
    iconName: 'Mic2',
    dbType: 'performance',
    variables: [
      { key: 'artist_name', label: 'Artist name', input: 'text', placeholder: 'Stage or legal name' },
      { key: 'venue_name', label: 'Venue / promoter', input: 'text' },
      { key: 'event_date', label: 'Event date', input: 'date' },
      { key: 'city', label: 'City', input: 'text' },
      { key: 'fee_amount', label: 'Performance fee', input: 'text', placeholder: 'e.g. 1500' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'set_length', label: 'Set length', input: 'text', placeholder: 'e.g. 60 minutes' },
      { key: 'soundcheck_time', label: 'Sound check', input: 'text', placeholder: 'e.g. 5:00 PM' },
      { key: 'cancellation_days', label: 'Cancellation notice (days)', input: 'text', placeholder: '14' },
    ],
    bodyTemplate: `AGREEMENT: Live performance

1. Artist: {{artist_name}} agrees to perform on {{event_date}} at or for {{venue_name}} in {{city}}.

2. Fee: {{venue_name}} agrees to pay {{artist_name}} {{fee_amount}} {{currency}} for the performance, subject to fulfillment of this agreement.

3. Performance: Approximate set length: {{set_length}}. Sound check / arrival: {{soundcheck_time}} unless otherwise agreed in writing.

4. Cancellation: Either party may cancel with at least {{cancellation_days}} days written notice. If the event is cancelled by the venue/promoter within that window, any deposit handling should follow local law and any separate deposit agreement.

5. Merchandise / recording: Unless attached as a rider, merch sales and recording of the performance require separate written permission.

6. Entire agreement: This document reflects the main terms discussed; riders or addenda may be attached.`,
  },
  {
    id: 'private-corporate-event',
    title: 'Private / corporate performance',
    shortDescription: 'One-off private event: scope, fee, attire, and content expectations.',
    iconName: 'Building2',
    dbType: 'performance',
    variables: [
      { key: 'artist_name', label: 'Artist name', input: 'text' },
      { key: 'client_name', label: 'Client / company', input: 'text' },
      { key: 'event_date', label: 'Event date', input: 'date' },
      { key: 'location', label: 'Location', input: 'text' },
      { key: 'fee_amount', label: 'Fee', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'performance_window', label: 'Performance window', input: 'text', placeholder: 'e.g. 7–9 PM' },
      { key: 'content_notes', label: 'Content / attire notes', input: 'textarea', placeholder: 'Family-friendly, no explicit lyrics, etc.' },
    ],
    bodyTemplate: `AGREEMENT: Private event performance

1. Services: {{artist_name}} will provide a live musical performance for {{client_name}} on {{event_date}} at {{location}}.

2. Fee: {{client_name}} will pay {{artist_name}} {{fee_amount}} {{currency}} for the services described.

3. Schedule: Performance window: {{performance_window}}. Load-in and technical needs to be confirmed at least one week before the event.

4. Content: {{content_notes}}

5. Recording / streaming: No recording, photography for commercial use, or live stream without prior written consent from {{artist_name}}.

6. Force majeure: If the event cannot occur due to circumstances beyond reasonable control, parties will discuss reschedule or partial refund in good faith.`,
  },
  {
    id: 'photography-services',
    title: 'Photography services',
    shortDescription: 'Promo, press, or live shots — deliverables and usage rights outline.',
    iconName: 'Camera',
    dbType: 'other',
    variables: [
      { key: 'photographer_name', label: 'Photographer name', input: 'text' },
      { key: 'artist_name', label: 'Artist name', input: 'text' },
      { key: 'shoot_date', label: 'Shoot date(s)', input: 'text' },
      { key: 'fee_amount', label: 'Fee', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'deliverables', label: 'Deliverables', input: 'textarea', placeholder: 'e.g. 20 edited stills, web resolution' },
      { key: 'usage_rights', label: 'Usage rights', input: 'textarea', placeholder: 'Social, website, press kit — non-exclusive' },
      { key: 'credit_line', label: 'Photo credit', input: 'text', placeholder: 'Photo: Name' },
    ],
    bodyTemplate: `AGREEMENT: Photography

1. Photographer {{photographer_name}} will provide photography services for {{artist_name}} on {{shoot_date}}.

2. Fee: {{artist_name}} (or their representative) agrees to pay {{fee_amount}} {{currency}} for the services.

3. Deliverables: {{deliverables}}

4. License: {{usage_rights}} Credit line when published: {{credit_line}}

5. Raw files: Unless specified in a rider, delivery is of edited finals only.

6. Cancellation: Cancellations within 48 hours of the shoot may incur a fee as permitted by law.`,
  },
  {
    id: 'music-video-production',
    title: 'Music video / videographer',
    shortDescription: 'Production scope, revisions, and delivery format.',
    iconName: 'Video',
    dbType: 'other',
    variables: [
      { key: 'artist_name', label: 'Artist name', input: 'text' },
      { key: 'producer_name', label: 'Director / production lead', input: 'text' },
      { key: 'track_title', label: 'Track title', input: 'text' },
      { key: 'fee_amount', label: 'Production fee', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'delivery_specs', label: 'Delivery specs', input: 'textarea', placeholder: '4K master, 1080p social cut' },
      { key: 'revision_rounds', label: 'Included revision rounds', input: 'text', placeholder: '2' },
    ],
    bodyTemplate: `AGREEMENT: Music video production

1. Project: Production of a music video for {{artist_name}} for the recording "{{track_title}}".

2. Producer: {{producer_name}} will provide production services as agreed in writing (treatment, schedule, crew).

3. Fee: {{artist_name}} agrees to pay {{producer_name}} {{fee_amount}} {{currency}} according to the payment schedule in the budget or invoice.

4. Delivery: {{delivery_specs}}

5. Revisions: {{revision_rounds}} rounds of editorial revisions are included after first cut; further changes may be billed separately if agreed.

6. Rights: Final rights (ownership, distribution windows) should be detailed in an attachment if not standard work-for-hire or license in your region.`,
  },
  {
    id: 'merch-line-wholesale',
    title: 'Merchandise / wholesale',
    shortDescription: 'Units, pricing, payment, and delivery for merch runs.',
    iconName: 'Shirt',
    dbType: 'endorsement',
    variables: [
      { key: 'artist_name', label: 'Artist / brand', input: 'text' },
      { key: 'vendor_name', label: 'Vendor / printer', input: 'text' },
      { key: 'product_desc', label: 'Product description', input: 'textarea' },
      { key: 'quantity', label: 'Quantity', input: 'text' },
      { key: 'unit_price', label: 'Unit price', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'delivery_date', label: 'Target delivery', input: 'date' },
    ],
    bodyTemplate: `AGREEMENT: Merchandise supply

1. Order: {{vendor_name}} will produce and deliver {{product_desc}} in quantity {{quantity}} for {{artist_name}}.

2. Pricing: Unit price {{unit_price}} {{currency}} unless adjusted by written change order.

3. Delivery: Target delivery by {{delivery_date}}; shipping terms and risk of loss to be stated on invoice or rider.

4. Artwork: {{artist_name}} warrants they have rights to supplied artwork; {{vendor_name}} may use it only for this order.

5. Payment: As per invoice; late fees only if allowed by applicable law.

6. Defects: Reasonable inspection period for defects; rework or refund as agreed.`,
  },
  {
    id: 'producer-beat-agreement',
    title: 'Producer / beat license',
    shortDescription: 'Track split, exclusivity, and delivery of stems or masters.',
    iconName: 'Disc3',
    dbType: 'recording',
    variables: [
      { key: 'producer_name', label: 'Producer name', input: 'text' },
      { key: 'artist_name', label: 'Artist name', input: 'text' },
      { key: 'track_title', label: 'Working title', input: 'text' },
      { key: 'fee_amount', label: 'Fee / advance', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'split_details', label: 'Publishing / master split', input: 'textarea', placeholder: 'e.g. 50/50 net publishing' },
      { key: 'exclusivity', label: 'Exclusivity', input: 'text', placeholder: 'Non-exclusive / exclusive' },
    ],
    bodyTemplate: `AGREEMENT: Production / beat

1. Work: {{producer_name}} produced (or will finalize production on) "{{track_title}}" for use by {{artist_name}}.

2. Fee: {{artist_name}} agrees to pay {{fee_amount}} {{currency}} as described on invoice or schedule.

3. Splits: {{split_details}}

4. Exclusivity: {{exclusivity}}

5. Delivery: Stems, instrumental, and session files as agreed; format and delivery method in writing.

6. Samples: {{producer_name}} represents known samples are cleared or will be disclosed; clearance remains subject to separate agreements.`,
  },
  {
    id: 'featured-artist-split',
    title: 'Featured artist / collaboration split',
    shortDescription: 'Revenue and credit for a guest feature on a release.',
    iconName: 'Users',
    dbType: 'recording',
    variables: [
      { key: 'primary_artist', label: 'Primary artist', input: 'text' },
      { key: 'featured_artist', label: 'Featured artist', input: 'text' },
      { key: 'track_title', label: 'Track title', input: 'text' },
      { key: 'revenue_split', label: 'Revenue split', input: 'textarea', placeholder: 'Streaming, downloads, sync' },
      { key: 'credit_line', label: 'Credit line', input: 'text', placeholder: 'Feat. Name' },
      { key: 'delivery_date', label: 'Feature delivery deadline', input: 'date' },
    ],
    bodyTemplate: `AGREEMENT: Featured performance

1. Recording: {{featured_artist}} will provide a featured vocal (or instrumental) performance on "{{track_title}}" by {{primary_artist}}.

2. Delivery: Vocals / files by {{delivery_date}} in agreed format.

3. Credit: Billing credit: {{credit_line}}

4. Splits: {{revenue_split}}

5. Approvals: {{featured_artist}} may approve final mix/master before release where reasonably possible.

6. Warranties: Each party warrants they have authority to enter this agreement and to license their respective contributions.`,
  },
  {
    id: 'session-musician-wfh',
    title: 'Session musician (work for hire)',
    shortDescription: 'Buyout of performance for a fixed fee on specified recordings.',
    iconName: 'Guitar',
    dbType: 'recording',
    variables: [
      { key: 'artist_name', label: 'Engaging artist / label', input: 'text' },
      { key: 'musician_name', label: 'Session musician', input: 'text' },
      { key: 'session_date', label: 'Session date(s)', input: 'text' },
      { key: 'fee_amount', label: 'Session fee', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'parts_desc', label: 'Parts / instruments', input: 'textarea' },
    ],
    bodyTemplate: `AGREEMENT: Session musician

1. Services: {{musician_name}} will perform the following on {{session_date}}: {{parts_desc}}

2. Fee: {{artist_name}} will pay {{musician_name}} {{fee_amount}} {{currency}} for the session.

3. Rights: Parties intend a work-for-hire / all-rights assignment to {{artist_name}} for the recorded performance, to the extent permitted by law in the applicable territory. If work-for-hire is not effective, {{musician_name}} assigns exclusive rights as needed for the project.

4. Re-records: {{musician_name}} will not re-record the same parts for a competing commercial release without consent.

5. Union: If union rules apply, this agreement is subject to applicable union paperwork.`,
  },
  {
    id: 'sync-licensing',
    title: 'Sync licensing (ads, film, TV)',
    shortDescription: 'Scope, term, territory, and fee for synchronization use.',
    iconName: 'Film',
    dbType: 'licensing',
    variables: [
      { key: 'licensor_name', label: 'Rights holder / artist', input: 'text' },
      { key: 'licensee_name', label: 'Licensee / production', input: 'text' },
      { key: 'composition_title', label: 'Composition / recording title', input: 'text' },
      { key: 'fee_amount', label: 'License fee', input: 'text' },
      { key: 'currency', label: 'Currency', input: 'text', placeholder: 'USD' },
      { key: 'term_territory', label: 'Term and territory', input: 'textarea', placeholder: '2 years, worldwide' },
      { key: 'media_scope', label: 'Media (e.g. TV, online)', input: 'textarea' },
    ],
    bodyTemplate: `AGREEMENT: Synchronization license

1. Grant: {{licensor_name}} grants {{licensee_name}} a non-exclusive synchronization license to reproduce and perform "{{composition_title}}" in timed relation with the visual production described: {{media_scope}}

2. Territory / term: {{term_territory}}

3. Fee: {{licensee_name}} will pay {{licensor_name}} {{fee_amount}} {{currency}} as invoiced.

4. Credits: On-screen / end credits as customary unless waived in writing.

5. Third-party rights: {{licensee_name}} is responsible for other clearances (actors, trademarks, etc.) in the production.

6. Accounting: If backend royalties apply (e.g. public performance through PRO), reporting as required by the PRO and law.`,
  },
  {
    id: 'management-short-form',
    title: 'Artist management (short form)',
    shortDescription: 'Term, commission %, and expense basics — attach a full rider for detail.',
    iconName: 'Briefcase',
    dbType: 'management',
    variables: [
      { key: 'artist_name', label: 'Artist name', input: 'text' },
      { key: 'manager_name', label: 'Manager / company', input: 'text' },
      { key: 'start_date', label: 'Start date', input: 'date' },
      { key: 'term_months', label: 'Initial term (months)', input: 'text', placeholder: '12' },
      { key: 'commission_pct', label: 'Commission %', input: 'text', placeholder: '15' },
      { key: 'territory', label: 'Territory', input: 'text', placeholder: 'Worldwide' },
    ],
    bodyTemplate: `AGREEMENT: Management (summary)

1. Appointment: {{artist_name}} appoints {{manager_name}} as personal manager for {{territory}} for entertainment career activities, starting {{start_date}}.

2. Term: Initial term of {{term_months}} months, renewing as described in a full management agreement attachment.

3. Commission: {{manager_name}} receives {{commission_pct}}% commission on gross entertainment income as defined in the full agreement.

4. Expenses: Reimbursable expenses only with prior written approval unless under a petty-cash cap in the full agreement.

5. Full terms: This summary is not complete; parties will execute a long-form management agreement for fiduciary duties, accounting, and termination.`,
  },
]

export function getContractTemplateById(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find(t => t.id === id)
}
