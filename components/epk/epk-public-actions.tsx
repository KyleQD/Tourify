"use client"

import React from "react"
import type { EPKData } from "@/lib/services/epk.service"
import { generateEPKPDF } from "@/utils/pdf"

function toPdfEpkData(epk: EPKData) {
  return {
    artistName: epk.artistName,
    bio: epk.bio,
    genre: epk.genre,
    location: epk.location,
    stats: epk.stats,
    music: epk.music.map((m) => ({
      title: m.title,
      url: m.url,
      releaseDate: m.releaseDate,
      streams: m.streams,
    })),
    photos: epk.photos.map((p) => p.url),
    press: epk.press.map((p) => ({
      title: p.title,
      url: p.url,
      date: p.date,
      outlet: p.outlet,
    })),
    contact: {
      email: epk.contact.email,
      phone: epk.contact.phone,
      website: epk.contact.website,
      bookingEmail: epk.contact.bookingEmail,
      managementEmail: epk.contact.managementEmail,
    },
    social: epk.social.map((s) => ({ platform: s.platform, url: s.url })),
    upcomingShows: epk.upcomingShows.map((s) => ({
      date: s.date,
      venue: s.venue,
      location: s.location,
      ticketUrl: s.ticketUrl,
    })),
  }
}

export function EpkPublicActions({ epkData }: { epkData: EPKData }) {
  React.useEffect(() => {
    fetch("/api/epk/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epkSlug: epkData.epkSlug, eventType: "public_view" }),
    }).catch(() => null)
  }, [epkData.epkSlug])

  return <>{generateEPKPDF(toPdfEpkData(epkData))}</>
}
