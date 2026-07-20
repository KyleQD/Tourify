import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#111827',
    lineHeight: 1.5,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  meta: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 20,
  },
  body: {
    marginBottom: 24,
  },
  paragraph: {
    marginBottom: 10,
  },
  boilerplate: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  boilerplateLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
})

export interface PressReleasePdfProps {
  title: string
  content: string
  artistName: string
  publishedAt?: string | null
  embargoUntil?: string | null
  boilerplate?: string | null
  subtitle?: string | null
}

function splitParagraphs(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
}

export function PressReleasePdfDocument({
  title,
  content,
  artistName,
  publishedAt,
  embargoUntil,
  boilerplate,
  subtitle,
}: PressReleasePdfProps) {
  const isEmbargoed = embargoUntil && new Date(embargoUntil).getTime() > Date.now()
  const dateline = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>
          {isEmbargoed ? `EMBARGOED UNTIL ${new Date(embargoUntil!).toLocaleString()}` : 'FOR IMMEDIATE RELEASE'}
        </Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.meta}>{subtitle}</Text> : null}
        <Text style={styles.meta}>
          {artistName} · {dateline}
        </Text>
        <View style={styles.body}>
          {splitParagraphs(content).map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
        {boilerplate ? (
          <View style={styles.boilerplate}>
            <Text style={styles.boilerplateLabel}>Media contact / boilerplate</Text>
            <Text>{boilerplate}</Text>
          </View>
        ) : null}
        <Text style={styles.footer}>Generated via Tourify Press</Text>
      </Page>
    </Document>
  )
}
