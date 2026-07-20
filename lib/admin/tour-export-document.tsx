import "server-only"

import React from "react"
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"

export interface TourReportData {
  tour: {
    name: string
    artist: string
    genre: string
    description: string
    status: string
    startDate: string
    endDate: string
  }
  sections: Set<string>
  events: Array<{ title: string; date: string; venue: string; capacity: number | null }>
  team: Array<{ name: string; role: string; status: string }>
  vendors: Array<{ name: string; type: string; status: string; amount: number | null }>
  finances: { income: number; expenses: number }
  generatedAt: string
}

const styles = StyleSheet.create({
  page: { padding: 36, color: "#172033", fontFamily: "Helvetica", fontSize: 9 },
  brand: { color: "#6d28d9", fontSize: 10, marginBottom: 8, textTransform: "uppercase" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  subtitle: { color: "#536079", fontSize: 10, marginBottom: 10 },
  description: { color: "#374151", lineHeight: 1.4, marginBottom: 12 },
  section: { marginTop: 16 },
  sectionTitle: { borderBottomWidth: 1, borderBottomColor: "#ddd6fe", color: "#4c1d95", fontFamily: "Helvetica-Bold", fontSize: 13, paddingBottom: 4, marginBottom: 6 },
  stats: { display: "flex", flexDirection: "row", gap: 10, marginTop: 8 },
  stat: { backgroundColor: "#f5f3ff", borderRadius: 4, padding: 8, flexGrow: 1 },
  statValue: { color: "#6d28d9", fontFamily: "Helvetica-Bold", fontSize: 15 },
  statLabel: { color: "#6b7280", fontSize: 7, marginTop: 2, textTransform: "uppercase" },
  row: { display: "flex", flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", paddingVertical: 5 },
  headerRow: { backgroundColor: "#f3f4f6", fontFamily: "Helvetica-Bold" },
  index: { width: "7%" },
  date: { width: "18%" },
  primary: { width: "33%" },
  secondary: { width: "27%" },
  value: { width: "15%", textAlign: "right" },
  half: { width: "50%" },
  third: { width: "33.333%" },
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, color: "#9ca3af", fontSize: 7, display: "flex", flexDirection: "row", justifyContent: "space-between" },
})

function money(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function dateLabel(value: string) {
  if (!value) return "TBD"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function TourReportDocument({ data }: { data: TourReportData }) {
  return (
    <Document title={`${data.tour.name} — Tour Report`} author="Tourify">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.brand}>Tourify operations report</Text>
        <Text style={styles.title}>{data.tour.name}</Text>
        <Text style={styles.subtitle}>
          {[data.tour.artist, data.tour.genre, `${dateLabel(data.tour.startDate)} – ${dateLabel(data.tour.endDate)}`, data.tour.status]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {data.sections.has("tourInfo") && data.tour.description ? <Text style={styles.description}>{data.tour.description}</Text> : null}

        {data.sections.has("tourInfo") ? (
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>{data.events.length}</Text><Text style={styles.statLabel}>Shows</Text></View>
            {data.sections.has("team") ? <View style={styles.stat}><Text style={styles.statValue}>{data.team.length}</Text><Text style={styles.statLabel}>Team members</Text></View> : null}
            {data.sections.has("finances") ? <View style={styles.stat}><Text style={styles.statValue}>{money(data.finances.income)}</Text><Text style={styles.statLabel}>Revenue</Text></View> : null}
            {data.sections.has("finances") ? <View style={styles.stat}><Text style={styles.statValue}>{money(data.finances.expenses)}</Text><Text style={styles.statLabel}>Expenses</Text></View> : null}
          </View>
        ) : null}

        {data.sections.has("events") ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shows ({data.events.length})</Text>
            <View style={[styles.row, styles.headerRow]} fixed>
              <Text style={styles.index}>#</Text><Text style={styles.date}>Date</Text><Text style={styles.primary}>Title</Text><Text style={styles.secondary}>Venue</Text><Text style={styles.value}>Capacity</Text>
            </View>
            {data.events.map((event, index) => (
              <View key={`${event.title}-${index}`} style={styles.row} wrap={false}>
                <Text style={styles.index}>{index + 1}</Text><Text style={styles.date}>{dateLabel(event.date)}</Text><Text style={styles.primary}>{event.title}</Text><Text style={styles.secondary}>{event.venue || "TBD"}</Text><Text style={styles.value}>{event.capacity ?? "—"}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.sections.has("team") ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team roster ({data.team.length})</Text>
            <View style={[styles.row, styles.headerRow]}><Text style={styles.half}>Name</Text><Text style={styles.third}>Role</Text><Text style={styles.value}>Status</Text></View>
            {data.team.map((member, index) => <View key={`${member.name}-${index}`} style={styles.row} wrap={false}><Text style={styles.half}>{member.name}</Text><Text style={styles.third}>{member.role}</Text><Text style={styles.value}>{member.status}</Text></View>)}
          </View>
        ) : null}

        {data.sections.has("vendors") ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendors ({data.vendors.length})</Text>
            <View style={[styles.row, styles.headerRow]}><Text style={styles.primary}>Vendor</Text><Text style={styles.secondary}>Service</Text><Text style={styles.date}>Status</Text><Text style={styles.value}>Contract</Text></View>
            {data.vendors.map((vendor, index) => <View key={`${vendor.name}-${index}`} style={styles.row} wrap={false}><Text style={styles.primary}>{vendor.name}</Text><Text style={styles.secondary}>{vendor.type}</Text><Text style={styles.date}>{vendor.status}</Text><Text style={styles.value}>{vendor.amount == null ? "—" : money(vendor.amount)}</Text></View>)}
          </View>
        ) : null}

        {data.sections.has("finances") ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial summary</Text>
            <View style={styles.stats}>
              <View style={styles.stat}><Text style={styles.statValue}>{money(data.finances.income)}</Text><Text style={styles.statLabel}>Revenue</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{money(data.finances.expenses)}</Text><Text style={styles.statLabel}>Expenses</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{money(data.finances.income - data.finances.expenses)}</Text><Text style={styles.statLabel}>Net</Text></View>
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Generated by Tourify · {dateLabel(data.generatedAt)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function renderTourReportPdf(data: TourReportData): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<TourReportDocument data={data} />)
  return new Uint8Array(buffer)
}
