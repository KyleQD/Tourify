/**
 * Tests for the shared news text conversion and the third-party link validator
 * (security decision DISC-XSS-001; CodeQL alerts #40, #41, #42, #43, #45, #46).
 *
 * The root cause those six alerts share is an **ordering** defect: a regex tag
 * strip followed by an entity decode, which reintroduces `<` / `>` after the
 * strip. The invariant asserted here is that no input can make the shared
 * conversion return a string containing a markup delimiter.
 */

import { describe, expect, it } from 'vitest'

import {
  decodeHtmlEntities,
  normalizeExternalHttpUrl,
  stripMarkup,
  toPlainText,
} from '@/lib/news/text-sanitize'

describe('decodeHtmlEntities', () => {
  it('decodes named, decimal and hexadecimal entities in a single pass', () => {
    expect(decodeHtmlEntities('a &amp; b &lt;c&gt; &#39;d&#39; &#x3C;e&#x3E;')).toBe(
      `a & b <c> 'd' <e>`
    )
  })

  it('does not decode twice: &amp;lt; stays literal text', () => {
    // This is the js/double-escaping half of the finding.
    expect(decodeHtmlEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
    expect(decodeHtmlEntities('&amp;#60;')).toBe('&#60;')
  })

  it('requires the semicolon so a bare ampersand is left alone', () => {
    expect(decodeHtmlEntities('R&D')).toBe('R&D')
    expect(decodeHtmlEntities('Tom &amp; Jerry')).toBe('Tom & Jerry')
  })

  it('covers the entity subset the per-call-site regexes missed', () => {
    // js/incomplete-multi-character-sanitization: the old call sites decoded
    // only a handful of numeric entities and left the rest as visible text.
    expect(decodeHtmlEntities('&#8217;&#8216;&#8220;&#8221;&#8211;&#8212;')).toBe(
      '\u2019\u2018\u201c\u201d\u2013\u2014'
    )
    expect(decodeHtmlEntities('&nbsp;&hellip;&mdash;&copy;')).toBe(' …—©')
    expect(decodeHtmlEntities('&unknownentity;')).toBe('&unknownentity;')
  })

  it('refuses a numeric entity that is not a usable code point', () => {
    expect(decodeHtmlEntities('&#0;')).toBe('&#0;')
    expect(decodeHtmlEntities('&#xD800;')).toBe('&#xD800;')
    expect(decodeHtmlEntities('&#x110000;')).toBe('&#x110000;')
  })
})

describe('stripMarkup', () => {
  it('removes tags, comments, CDATA and processing instructions', () => {
    expect(stripMarkup('<p>hello <b>world</b></p>')).toBe(' hello  world  ')
    expect(stripMarkup('<!-- <script>x</script> -->keep')).toBe(' keep')
    expect(stripMarkup('<![CDATA[<b>raw</b>]]>keep')).toBe(' keep')
    expect(stripMarkup('<?php echo 1; ?>keep')).toBe(' keep')
    expect(stripMarkup('<!DOCTYPE html>keep')).toBe(' keep')
  })

  it('removes an unterminated comment to the end of the value', () => {
    expect(stripMarkup('before <!-- <script>x</script>')).toBe('before  ')
  })

  it('removes a delimiter that a malformed tag left unpaired', () => {
    // A paired-tag regex cannot remove this; the residual-delimiter pass can.
    expect(stripMarkup('<script')).toBe('script')
    expect(stripMarkup('trailing >')).toBe('trailing ')
  })
})

describe('toPlainText', () => {
  it('renders an entity-encoded script tag as inert text', () => {
    // The exact payload the registry entry named as the required regression test.
    const result = toPlainText('&lt;script&gt;alert(1)&lt;/script&gt;')
    // Decode first, so the tag is a real tag by the time it is stripped.
    expect(result).toBe('alert(1)')
    // The unpaired form, which a paired-tag regex cannot remove.
    expect(toPlainText('&lt;script alert(1)')).toBe('script alert(1)')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('renders a real tag and a double-encoded tag the same way', () => {
    expect(toPlainText('<script>alert(1)</script>')).toBe('alert(1)')
    expect(toPlainText('&lt;script&gt;alert(1)&lt;/script&gt;')).not.toContain('<')
    expect(toPlainText('&amp;lt;script&amp;gt;')).not.toContain('<')
  })

  it('never returns a markup delimiter for any of these payloads', () => {
    const payloads = [
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '&#60;script&#62;alert(1)&#60;/script&#62;',
      '&#x3C;img src=x onerror=alert(1)&#x3E;',
      '&lt;script',
      '<img src=x onerror=alert(1)>',
      '<<script>script>alert(1)<</script>/script>',
      '&amp;lt;script&amp;gt;',
      '&lt;svg/onload=alert(1)&gt;',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    ]
    for (const payload of payloads) {
      const result = toPlainText(payload)
      expect(result, payload).not.toContain('<')
      expect(result, payload).not.toContain('>')
    }
  })

  it('collapses whitespace and handles non-strings without throwing', () => {
    expect(toPlainText('  a\n\n b\t c  ')).toBe('a b c')
    expect(toPlainText(null)).toBe('')
    expect(toPlainText(undefined)).toBe('')
    expect(toPlainText(42)).toBe('42')
  })
})

describe('normalizeExternalHttpUrl', () => {
  it('accepts an absolute http(s) publisher link', () => {
    expect(normalizeExternalHttpUrl('https://pitchfork.com/news/a')).toBe(
      'https://pitchfork.com/news/a'
    )
    expect(normalizeExternalHttpUrl('http://example.org/a')).toBe('http://example.org/a')
  })

  it('rejects every script-bearing or non-navigable scheme', () => {
    for (const value of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(document.domain)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'blob:https://evil.example/uuid',
      'about:blank',
    ]) {
      expect(normalizeExternalHttpUrl(value), value).toBeNull()
    }
  })

  it('rejects a relative or protocol-relative value', () => {
    for (const value of ['/news/1', '//evil.example/x', 'news/1', '', '   ']) {
      expect(normalizeExternalHttpUrl(value), value).toBeNull()
    }
  })

  it('rejects a control character, an embedded credential, and an over-long value', () => {
    expect(normalizeExternalHttpUrl('java\u0000script:alert(1)')).toBeNull()
    expect(normalizeExternalHttpUrl('https://user:pw@example.com/a')).toBeNull()
    expect(normalizeExternalHttpUrl(`https://example.com/${'a'.repeat(4096)}`)).toBeNull()
  })

  it('rejects a non-string value', () => {
    expect(normalizeExternalHttpUrl(undefined)).toBeNull()
    expect(normalizeExternalHttpUrl(null)).toBeNull()
    expect(normalizeExternalHttpUrl({ href: 'https://example.com' })).toBeNull()
  })
})
