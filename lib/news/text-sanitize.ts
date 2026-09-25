/**
 * Shared plain-text conversion for third-party news/RSS values.
 *
 * Security decision DISC-XSS-001 (CodeQL alerts #40, #41, #42, #43, #45, #46).
 * Every one of those alerts has the same root cause: a **regex tag strip
 * followed by an entity decode**. Stripping `<[^>]*>` and then turning
 * `&lt;`/`&gt;` back into `<`/`>` reintroduces the markup delimiters the strip
 * was supposed to remove, so the function is unsound as a sanitizer
 * (`js/double-escaping`). Two of the call sites additionally decoded only a
 * fixed subset of entities, which CodeQL flags as
 * `js/incomplete-multi-character-sanitization`.
 *
 * The defect is an **ordering** defect, so the fix belongs here, once, rather
 * than as a fifth hand-rolled regex:
 *
 *  1. **Decode first**, in a single pass, with a semicolon-terminated entity
 *     pattern. One pass is what makes `&amp;lt;` resolve to the literal text
 *     `&lt;` and not to `<` — that double-decode is the other half of the
 *     `js/double-escaping` finding.
 *  2. **Strip second**, then remove any residual `<` / `>`. Malformed input
 *     such as `&lt;script` decodes to `<script` with no closing bracket, which a
 *     paired-tag regex cannot remove; the final pass guarantees the invariant
 *     that the returned string contains no markup delimiter at all.
 *  3. Collapse whitespace and trim, so the result is display text.
 *
 * These are plain-text conversions for display, not HTML sanitizers. A value
 * that must be rendered as HTML still needs a maintained allowlist sanitizer;
 * this module's guarantee is that its output is inert as text and contains no
 * `<` or `>`.
 */

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  hellip: '…',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  uuml: 'ü',
  ouml: 'ö',
  auml: 'ä',
  szlig: 'ß',
  euro: '€',
  pound: '£',
  laquo: '«',
  raquo: '»',
}

/**
 * One pass, semicolon required. Requiring the terminator is what stops
 * `&amp;lt;` from being re-read as `&lt;` and decoded twice.
 */
const ENTITY_PATTERN = /&(?:#[xX]([0-9a-fA-F]{1,6})|#([0-9]{1,7})|([a-zA-Z][a-zA-Z0-9]{1,31}));/g

/**
 * A comment, a CDATA wrapper, a processing instruction, or a tag. The specific
 * forms come first: with a generic `<[^>]*>` alternative ahead of them, a
 * comment such as `<!-- <script>x</script> -->` is split at its first `>` and
 * the tail of the comment survives as text.
 */
const MARKUP_PATTERN =
  /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?\]\]>|<[!?][^>]*>|<[^>]*>/g

function codePointToString(raw: string, radix: 10 | 16): string | null {
  const value = Number.parseInt(raw, radix)
  if (!Number.isFinite(value)) return null
  // Reject surrogate halves, NUL, and anything above the Unicode range.
  if (value === 0 || value > 0x10ffff) return null
  if (value >= 0xd800 && value <= 0xdfff) return null
  return String.fromCodePoint(value)
}

/**
 * Decode every recognised HTML/XML entity exactly once. Unknown entities are
 * left verbatim, which is safe: they are text, not markup.
 */
export function decodeHtmlEntities(value: string): string {
  return value.replace(ENTITY_PATTERN, (match, hex?: string, dec?: string, name?: string) => {
    if (hex !== undefined) return codePointToString(hex, 16) ?? match
    if (dec !== undefined) return codePointToString(dec, 10) ?? match
    const replacement = NAMED_ENTITIES[String(name).toLowerCase()]
    return replacement ?? match
  })
}

/** Remove markup, then remove any delimiter a malformed tag left behind. */
export function stripMarkup(value: string): string {
  return value
    .replace(MARKUP_PATTERN, ' ')
    .replace(/[<>]/g, '')
}

/**
 * The shared, correctly ordered plain-text conversion for third-party news
 * values: decode, then strip, then guarantee no markup delimiter survives.
 */
export function toPlainText(value: unknown): string {
  const raw = typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value)
  return stripMarkup(decodeHtmlEntities(raw)).replace(/\s+/g, ' ').trim()
}

const MAX_EXTERNAL_URL_LENGTH = 2048

/**
 * Validate a third-party `item.link` before it is handed to `window.open`,
 * `navigator.share`, or the clipboard.
 *
 * The link comes from a publisher-controlled RSS document, so it is untrusted
 * input. `window.open('javascript:...')` executes in the page's own origin, and
 * a `data:` URL is a second script-bearing scheme, so both are rejected; a
 * protocol-relative or relative value is rejected too because the feed must
 * name an absolute destination. Returns the normalized absolute URL, or `null`
 * when the value is not safe to navigate to.
 */
export function normalizeExternalHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw || raw.length > MAX_EXTERNAL_URL_LENGTH) return null
  // Control characters can smuggle a scheme or header break past a naive check.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  return url.toString()
}
