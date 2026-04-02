import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Link,
  Font,
} from "@react-pdf/renderer"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2", fontWeight: 600 },
  ],
})

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Inter",
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 600,
    marginBottom: 5,
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12,
    color: "#111827",
    borderBottom: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  text: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 1.6,
  },
  contactItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  contactLabel: {
    width: 100,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 600,
  },
  contactValue: {
    fontSize: 12,
    color: "#374151",
  },
  musicItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  musicTitle: {
    fontSize: 12,
    color: "#111827",
    fontWeight: 600,
  },
  musicLink: {
    fontSize: 12,
    color: "#3b82f6",
  },
  pressItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  pressTitle: {
    fontSize: 12,
    color: "#111827",
    marginBottom: 5,
    fontWeight: 600,
  },
  pressLink: {
    fontSize: 12,
    color: "#3b82f6",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  photoItem: {
    width: "33.33%",
    padding: 5,
  },
  photo: {
    width: "100%",
    height: 120,
    objectFit: "cover",
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  statItem: {
    width: "50%",
    marginBottom: 15,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 600,
  },
  socialLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  socialLink: {
    marginRight: 15,
    marginBottom: 8,
    fontSize: 12,
    color: "#3b82f6",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
})

interface EPKDocumentProps {
  data: {
    artistName: string
    bio: string
    genre: string
    location: string
    avatarUrl?: string
    stats: {
      followers: number
      monthlyListeners: number
      totalStreams: number
      eventsPlayed: number
    }
    music: {
      title: string
      url: string
      releaseDate: string
      streams: number
    }[]
    photos: string[]
    press: {
      title: string
      url: string
      date: string
      outlet: string
    }[]
    contact: {
      email: string
      phone: string
      website: string
      bookingEmail: string
      managementEmail: string
    }
    social: {
      platform: string
      url: string
    }[]
    upcomingShows: {
      date: string
      venue: string
      location: string
      ticketUrl: string
    }[]
  }
}

export const EPKDocument: React.FC<EPKDocumentProps> = ({ data }: EPKDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Avatar */}
      {data.avatarUrl && (
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Image src={data.avatarUrl} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 8, objectFit: "cover", border: "2px solid #e5e7eb" }} />
        </View>
      )}
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{data.artistName}</Text>
        <Text style={styles.subtitle}>{data.genre} • {data.location}</Text>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Followers</Text>
            <Text style={styles.statValue}>{data.stats.followers.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Monthly Listeners</Text>
            <Text style={styles.statValue}>{data.stats.monthlyListeners.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Streams</Text>
            <Text style={styles.statValue}>{data.stats.totalStreams.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Events Played</Text>
            <Text style={styles.statValue}>{data.stats.eventsPlayed}</Text>
          </View>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biography</Text>
        <Text style={styles.text}>{data.bio}</Text>
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactItem}>
          <Text style={styles.contactLabel}>Email:</Text>
          <Text style={styles.contactValue}>{data.contact.email}</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactLabel}>Booking:</Text>
          <Text style={styles.contactValue}>{data.contact.bookingEmail}</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactLabel}>Management:</Text>
          <Text style={styles.contactValue}>{data.contact.managementEmail}</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactLabel}>Phone:</Text>
          <Text style={styles.contactValue}>{data.contact.phone}</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactLabel}>Website:</Text>
          <Link src={data.contact.website} style={styles.contactValue}>
            {data.contact.website}
          </Link>
        </View>
      </View>

      {/* Social Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        <View style={styles.socialLinks}>
          {data.social.map((link: { platform: string; url: string }, index: number) => (
            <Link key={index} src={link.url} style={styles.socialLink}>
              {link.platform}
            </Link>
          ))}
        </View>
      </View>

      {/* Music */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Music</Text>
        {data.music.map((track: { title: string; url: string; releaseDate: string; streams: number }, index: number) => (
          <View key={index} style={styles.musicItem}>
            <View>
              <Text style={styles.musicTitle}>{track.title}</Text>
              <Text style={styles.text}>Released: {track.releaseDate}</Text>
              <Text style={styles.text}>{track.streams.toLocaleString()} streams</Text>
            </View>
            <Link src={track.url} style={styles.musicLink}>
              Listen
            </Link>
          </View>
        ))}
      </View>

      {/* Upcoming Shows */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Shows</Text>
        {data.upcomingShows.map((show: { date: string; venue: string; location: string; ticketUrl: string }, index: number) => (
          <View key={index} style={styles.pressItem}>
            <Text style={styles.pressTitle}>{show.date}</Text>
            <Text style={styles.text}>{show.venue}</Text>
            <Text style={styles.text}>{show.location}</Text>
            <Link src={show.ticketUrl} style={styles.pressLink}>
              Get Tickets
            </Link>
          </View>
        ))}
      </View>

      {/* Press */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Press Coverage</Text>
        {data.press.map((item: { title: string; url: string; date: string; outlet: string }, index: number) => (
          <View key={index} style={styles.pressItem}>
            <Text style={styles.pressTitle}>{item.title}</Text>
            <Text style={styles.text}>{item.outlet} • {item.date}</Text>
            <Link src={item.url} style={styles.pressLink}>
              Read Article
            </Link>
          </View>
        ))}
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <View style={styles.photoGrid}>
          {data.photos.map((photo: string, index: number) => (
            <View key={index} style={styles.photoItem}>
              <Image src={photo} style={styles.photo} />
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated by Tourify • {formatSafeDate(new Date().toISOString())}
      </Text>
    </Page>
  </Document>
) 