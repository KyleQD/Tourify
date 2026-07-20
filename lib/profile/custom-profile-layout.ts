import { z } from 'zod'

export const CUSTOM_PROFILE_LAYOUT_VERSION = 1 as const
export const MAX_CUSTOM_PROFILE_SECTIONS = 12
export const MAX_TEXT_SECTION_LENGTH = 500
export const MAX_TEXT_SECTIONS = 3

export const CUSTOM_PROFILE_SECTION_TYPES = [
  'hero',
  'about',
  'skills',
  'portfolio',
  'experience',
  'certifications',
  'social',
  'contact',
  'cta',
  'text',
] as const

export type CustomProfileSectionType = (typeof CUSTOM_PROFILE_SECTION_TYPES)[number]

export const CUSTOM_PROFILE_FONT_STYLES = ['default', 'elegant', 'bold', 'mono'] as const
export const CUSTOM_PROFILE_DENSITIES = ['compact', 'default', 'relaxed'] as const
export const CUSTOM_PROFILE_RADII = ['sharp', 'rounded', 'pill'] as const
export const CUSTOM_PROFILE_SURFACES = ['solid', 'glass', 'minimal', 'elevated'] as const
export const CUSTOM_PROFILE_MOODS = [
  'clean',
  'editorial',
  'neon',
  'brutalist',
  'retro',
  'maximalist',
] as const
export const CUSTOM_PROFILE_BACKGROUNDS = [
  'solid',
  'gradient',
  'dots',
  'grid',
  'stars',
  'scanlines',
  'sparkle',
] as const
export const CUSTOM_PROFILE_FRAMES = ['none', 'thin', 'double', 'sticker', 'neon'] as const
export const CUSTOM_PROFILE_HEADING_STYLES = [
  'plain',
  'underline',
  'badge',
  'marquee',
  'outlined',
] as const
export const CUSTOM_PROFILE_SECTION_VARIANTS = [
  'default',
  'banner',
  'split',
  'centered',
  'framed',
  'pills',
  'list',
  'cloud',
  'buttons',
  'icons',
  'sticker',
  'quote',
] as const

const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const HTML_LIKE_RE = /<\/?[a-z][\s\S]*>|javascript:|on\w+\s*=/i

function rejectHtml(value: string, ctx: z.RefinementCtx, path: (string | number)[]) {
  if (HTML_LIKE_RE.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'HTML, scripts, and event handlers are not allowed — use plain text only',
      path,
    })
  }
}

const hexColorSchema = z
  .string()
  .regex(HEX_RE, 'Must be a 6-digit hex color like #8b5cf6')

const plainTextSchema = (max: number) =>
  z
    .string()
    .max(max)
    .superRefine((value, ctx) => rejectHtml(value, ctx, []))

const sectionStyleSchema = z
  .object({
    accentHex: hexColorSchema.optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    variant: z.enum(CUSTOM_PROFILE_SECTION_VARIANTS).optional(),
    surface: z.enum(CUSTOM_PROFILE_SURFACES).optional(),
  })
  .strict()

const baseSectionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, 'Section id must be alphanumeric, underscore, or hyphen'),
  type: z.enum(CUSTOM_PROFILE_SECTION_TYPES),
  visible: z.boolean().default(true),
  heading: plainTextSchema(80).optional(),
  style: sectionStyleSchema.optional(),
})

const textSectionSchema = baseSectionSchema.extend({
  type: z.literal('text'),
  body: plainTextSchema(MAX_TEXT_SECTION_LENGTH),
})

const dataSectionSchema = baseSectionSchema.extend({
  type: z.enum([
    'hero',
    'about',
    'skills',
    'portfolio',
    'experience',
    'certifications',
    'social',
    'contact',
    'cta',
  ]),
})

const sectionSchema = z.union([textSectionSchema, dataSectionSchema])

const themeSchema = z
  .object({
    accentHex: hexColorSchema.default('#8b5cf6'),
    secondaryAccentHex: hexColorSchema.optional(),
    backgroundHex: hexColorSchema.default('#0f172a'),
    textHex: hexColorSchema.default('#f8fafc'),
    mutedTextHex: hexColorSchema.default('#94a3b8'),
    fontStyle: z.enum(CUSTOM_PROFILE_FONT_STYLES).default('default'),
    density: z.enum(CUSTOM_PROFILE_DENSITIES).default('default'),
    radius: z.enum(CUSTOM_PROFILE_RADII).default('rounded'),
    surface: z.enum(CUSTOM_PROFILE_SURFACES).default('glass'),
    mood: z.enum(CUSTOM_PROFILE_MOODS).default('clean'),
    backgroundStyle: z.enum(CUSTOM_PROFILE_BACKGROUNDS).default('solid'),
    frame: z.enum(CUSTOM_PROFILE_FRAMES).default('none'),
    headingStyle: z.enum(CUSTOM_PROFILE_HEADING_STYLES).default('plain'),
  })
  .strict()

const metaSchema = z
  .object({
    title: plainTextSchema(80).optional(),
    description: plainTextSchema(200).optional(),
  })
  .strict()
  .default({})

export const customProfileLayoutSchema = z
  .object({
    version: z.literal(CUSTOM_PROFILE_LAYOUT_VERSION),
    meta: metaSchema,
    theme: themeSchema,
    sections: z
      .array(sectionSchema)
      .min(1, 'At least one section is required')
      .max(MAX_CUSTOM_PROFILE_SECTIONS, `At most ${MAX_CUSTOM_PROFILE_SECTIONS} sections allowed`),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const ids = new Set<string>()
    let textCount = 0

    for (const [index, section] of layout.sections.entries()) {
      if (ids.has(section.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate section id "${section.id}"`,
          path: ['sections', index, 'id'],
        })
      }
      ids.add(section.id)

      if (section.type === 'text' && section.visible !== false) textCount += 1
    }

    if (textCount > MAX_TEXT_SECTIONS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `At most ${MAX_TEXT_SECTIONS} visible text sections allowed`,
        path: ['sections'],
      })
    }

    const hasCore = layout.sections.some(
      (section) =>
        section.visible !== false && (section.type === 'hero' || section.type === 'about')
    )
    if (!hasCore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Layout must include at least one visible hero or about section',
        path: ['sections'],
      })
    }
  })

export type CustomProfileLayout = z.infer<typeof customProfileLayoutSchema>
export type CustomProfileTheme = z.infer<typeof themeSchema>
export type CustomProfileSection = z.infer<typeof sectionSchema>

export type CustomProfileDesignStatus = 'none' | 'draft' | 'published'

export interface CustomProfileDesignState {
  status: CustomProfileDesignStatus
  draft: CustomProfileLayout | null
  published: CustomProfileLayout | null
  updated_at: string | null
}

export interface LayoutValidationError {
  path: string
  message: string
}

export type ParseCustomProfileLayoutResult =
  | { ok: true; layout: CustomProfileLayout }
  | { ok: false; errors: LayoutValidationError[] }

export const DEFAULT_CUSTOM_PROFILE_DESIGN: CustomProfileDesignState = {
  status: 'none',
  draft: null,
  published: null,
  updated_at: null,
}

export const MINIMAL_CUSTOM_PROFILE_LAYOUT: CustomProfileLayout = {
  version: 1,
  meta: {
    title: 'My public profile',
    description: 'A clean custom layout',
  },
  theme: {
    accentHex: '#8b5cf6',
    backgroundHex: '#0f172a',
    textHex: '#f8fafc',
    mutedTextHex: '#94a3b8',
    fontStyle: 'default',
    density: 'default',
    radius: 'rounded',
    surface: 'glass',
    mood: 'clean',
    backgroundStyle: 'solid',
    frame: 'none',
    headingStyle: 'plain',
  },
  sections: [
    { id: 'hero', type: 'hero', visible: true, heading: 'Welcome' },
    { id: 'about', type: 'about', visible: true, heading: 'About' },
    { id: 'skills', type: 'skills', visible: true, heading: 'Skills' },
    { id: 'portfolio', type: 'portfolio', visible: true, heading: 'Portfolio' },
    { id: 'social', type: 'social', visible: true, heading: 'Connect' },
  ],
}

export function formatZodIssues(error: z.ZodError): LayoutValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join('.') : '(root)',
    message: issue.message,
  }))
}

export function parseCustomProfileLayout(raw: unknown): ParseCustomProfileLayoutResult {
  let candidate = raw

  if (typeof raw === 'string') {
    try {
      candidate = JSON.parse(raw)
    } catch {
      return {
        ok: false,
        errors: [{ path: '(root)', message: 'Invalid JSON — paste a valid JSON object only' }],
      }
    }
  }

  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    const obj = candidate as Record<string, unknown>
    if (obj.version === undefined) {
      return {
        ok: false,
        errors: [
          {
            path: 'version',
            message: `Missing version — must be ${CUSTOM_PROFILE_LAYOUT_VERSION}`,
          },
        ],
      }
    }
  }

  const parsed = customProfileLayoutSchema.safeParse(candidate)
  if (!parsed.success) {
    return { ok: false, errors: formatZodIssues(parsed.error) }
  }

  return { ok: true, layout: parsed.data }
}

export function buildFixPrompt(
  errors: LayoutValidationError[],
  submittedJson: string
): string {
  const errorList = errors
    .map((error, index) => `${index + 1}. [${error.path}] ${error.message}`)
    .join('\n')

  return [
    'The custom Tourify public profile layout JSON you produced failed validation.',
    'Fix every issue below and return ONLY a corrected valid JSON object (no markdown fences, no commentary).',
    '',
    '## Validation errors',
    errorList || '1. Unknown validation failure',
    '',
    '## Constraints reminder',
    `- version must be ${CUSTOM_PROFILE_LAYOUT_VERSION}`,
    `- sections: 1–${MAX_CUSTOM_PROFILE_SECTIONS}`,
    `- allowed section types: ${CUSTOM_PROFILE_SECTION_TYPES.join(', ')}`,
    `- at most ${MAX_TEXT_SECTIONS} visible text sections`,
    '- at least one visible hero or about section is required',
    '- colors must be #RRGGBB hex',
    '- plain text only — no HTML or JavaScript',
    `- text section body max ${MAX_TEXT_SECTION_LENGTH} characters`,
    '- unknown keys are rejected (strict schema)',
    `- theme.mood: ${CUSTOM_PROFILE_MOODS.join(', ')}`,
    `- theme.backgroundStyle: ${CUSTOM_PROFILE_BACKGROUNDS.join(', ')}`,
    `- theme.frame: ${CUSTOM_PROFILE_FRAMES.join(', ')}`,
    `- theme.headingStyle: ${CUSTOM_PROFILE_HEADING_STYLES.join(', ')}`,
    `- section.style.variant: ${CUSTOM_PROFILE_SECTION_VARIANTS.join(', ')}`,
    '',
    '## Previous JSON to fix',
    submittedJson.trim() || '{}',
  ].join('\n')
}

export function getCustomProfileDesignState(metadata: unknown): CustomProfileDesignState {
  const meta =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {}
  const raw = meta.custom_profile_design

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CUSTOM_PROFILE_DESIGN }
  }

  const design = raw as Record<string, unknown>
  const status =
    design.status === 'draft' || design.status === 'published' || design.status === 'none'
      ? design.status
      : 'none'

  const draftResult = design.draft ? parseCustomProfileLayout(design.draft) : null
  const publishedResult = design.published ? parseCustomProfileLayout(design.published) : null

  return {
    status,
    draft: draftResult?.ok ? draftResult.layout : null,
    published: publishedResult?.ok ? publishedResult.layout : null,
    updated_at: typeof design.updated_at === 'string' ? design.updated_at : null,
  }
}

export function buildCustomProfileDesignPayload(
  state: CustomProfileDesignState
): Record<string, unknown> {
  return {
    status: state.status,
    draft: state.draft,
    published: state.published,
    updated_at: state.updated_at ?? new Date().toISOString(),
  }
}

export function getCustomProfileThemeCssVars(
  theme: CustomProfileTheme
): Record<string, string> {
  const radiusMap = {
    sharp: '0.25rem',
    rounded: '1rem',
    pill: '9999px',
  } as const

  const densityMap = {
    compact: '1rem',
    default: '1.5rem',
    relaxed: '2.25rem',
  } as const

  const fontMap = {
    default: 'ui-sans-serif, system-ui, sans-serif',
    elegant: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    bold: 'ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  } as const

  const secondary = theme.secondaryAccentHex || theme.accentHex

  return {
    '--cp-accent': theme.accentHex,
    '--cp-accent-2': secondary,
    '--cp-bg': theme.backgroundHex,
    '--cp-text': theme.textHex,
    '--cp-muted': theme.mutedTextHex,
    '--cp-radius': radiusMap[theme.radius],
    '--cp-gap': densityMap[theme.density],
    '--cp-font': fontMap[theme.fontStyle],
    '--cp-font-weight': theme.fontStyle === 'bold' ? '700' : '400',
  }
}

export function getSchemaContractMarkdown(): string {
  return [
    '### CustomProfileLayout v1',
    '',
    '```json',
    JSON.stringify(
      {
        version: 1,
        meta: { title: 'string (optional, max 80)', description: 'string (optional, max 200)' },
        theme: {
          accentHex: '#RRGGBB',
          secondaryAccentHex: '#RRGGBB (optional second pop color)',
          backgroundHex: '#RRGGBB',
          textHex: '#RRGGBB',
          mutedTextHex: '#RRGGBB',
          fontStyle: CUSTOM_PROFILE_FONT_STYLES,
          density: CUSTOM_PROFILE_DENSITIES,
          radius: CUSTOM_PROFILE_RADII,
          surface: CUSTOM_PROFILE_SURFACES,
          mood: CUSTOM_PROFILE_MOODS,
          backgroundStyle: CUSTOM_PROFILE_BACKGROUNDS,
          frame: CUSTOM_PROFILE_FRAMES,
          headingStyle: CUSTOM_PROFILE_HEADING_STYLES,
        },
        sections: [
          {
            id: 'unique-slug',
            type: CUSTOM_PROFILE_SECTION_TYPES,
            visible: true,
            heading: 'optional plain text',
            style: {
              accentHex: '#RRGGBB',
              align: ['left', 'center', 'right'],
              variant: CUSTOM_PROFILE_SECTION_VARIANTS,
              surface: CUSTOM_PROFILE_SURFACES,
            },
            body: 'required only when type is text (max 500 chars, plain text)',
          },
        ],
      },
      null,
      2
    ),
    '```',
    '',
    '### Theme knobs (what the renderer actually paints)',
    '- `mood` — overall chrome recipe: clean / editorial / neon / brutalist / retro / maximalist',
    '- `backgroundStyle` — page backdrop: solid, gradient, dots, grid, stars, scanlines, sparkle',
    '- `frame` — page border treatment: none, thin, double, sticker, neon',
    '- `headingStyle` — section title treatment: plain, underline, badge, marquee, outlined',
    '- `secondaryAccentHex` — second accent used for gradients, frames, and ornaments',
    '- `surface` / `radius` / `density` / `fontStyle` — card chrome, corners, spacing, type stack',
    '',
    '### Section style.variant (type-aware)',
    '- `hero`: default | banner | split | centered | framed',
    '- `skills`: default | pills | list | cloud',
    '- `social` / `cta`: default | pills | buttons | icons',
    '- `text` / `about`: default | sticker | quote',
    '- `portfolio` / `experience` / `certifications`: default | list | framed',
    '- Optional per-section `style.surface` override',
    '',
    '### Section types (data-bound)',
    '- `hero` — name, title, avatar, cover, short intro',
    '- `about` — bio / about text',
    '- `skills` — skills / top skills',
    '- `portfolio` — public portfolio items',
    '- `experience` — visible work experience',
    '- `certifications` — public certifications',
    '- `social` — public social links',
    '- `contact` — only fields the user marked public',
    '- `cta` — primary call-to-action (message / hire / website)',
    '- `text` — short optional plain-text block (no HTML); up to 3 visible',
    '',
    '### Hard rules',
    `- version must be ${CUSTOM_PROFILE_LAYOUT_VERSION}`,
    `- 1–${MAX_CUSTOM_PROFILE_SECTIONS} sections`,
    `- at most ${MAX_TEXT_SECTIONS} visible text sections`,
    '- at least one visible `hero` or `about` section',
    '- strict JSON: no unknown keys',
    '- plain text only — never emit HTML, JSX, CSS files, or JavaScript',
    '- bind to the provided profile data; do not invent private contact details',
    '- do NOT invent unsupported keys (no custom CSS, fonts, images, or HTML modules)',
  ].join('\n')
}
