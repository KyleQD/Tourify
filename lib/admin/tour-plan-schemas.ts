/**
 * PLAN-101/202 — Tour plan Zod schemas (client-safe; no server-only).
 */

import { z } from "zod"

export const tourPlanStopSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  client_key: z.string().min(1).max(120).optional().nullable(),
  name: z.string().trim().min(1).max(200),
  venue: z.string().trim().max(240).optional().nullable(),
  venue_id: z.string().uuid().nullable().optional(),
  venue_address: z.string().trim().max(500).optional().nullable(),
  venue_city: z.string().trim().max(160).optional().nullable(),
  venue_state: z.string().trim().max(120).optional().nullable(),
  venue_postal_code: z.string().trim().max(40).optional().nullable(),
  venue_country: z.string().trim().max(80).optional().nullable(),
  venue_website: z.string().trim().max(500).optional().nullable(),
  technical_specs: z.string().trim().max(10000).optional().nullable(),
  date: z.string().trim().min(1).max(40),
  time: z.string().trim().max(40).optional().nullable(),
  timezone: z.string().trim().max(80).optional().nullable(),
  window_start: z.string().trim().max(40).optional().nullable(),
  window_end: z.string().trim().max(40).optional().nullable(),
  market: z.string().trim().max(120).optional().nullable(),
  leg_name: z.string().trim().max(120).optional().nullable(),
  capacity: z.number().int().nonnegative().nullable().optional(),
  advance_status: z
    .enum(["not_started", "in_progress", "ready", "blocked", "settled"])
    .optional()
    .default("not_started"),
  planning_status: z
    .enum(["draft", "confirmed", "tentative", "held", "cancelled"])
    .optional()
    .default("draft"),
  notes: z.string().trim().max(4000).optional().nullable(),
  contact_name: z.string().trim().max(160).optional().nullable(),
  contact_email: z.string().trim().email().optional().nullable().or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  ordinal: z.number().int().nonnegative().optional(),
  stop_type: z
    .enum(["show", "rehearsal", "promo", "festival", "travel", "rest", "load", "other"])
    .optional()
    .default("show"),
})

export const tourPlanWriteSchema = z.object({
  expectedPlanVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(8000).optional().nullable(),
  status: z.string().trim().max(64).optional().nullable(),
  start_date: z.string().trim().max(40).optional().nullable(),
  end_date: z.string().trim().max(40).optional().nullable(),
  main_artist: z.string().trim().max(200).optional().nullable(),
  artist_id: z.string().uuid().optional().nullable(),
  markets: z.array(z.string()).optional(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal("")),
  budget: z.number().nonnegative().nullable().optional(),
  route_notes: z.string().trim().max(4000).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  stops: z.array(tourPlanStopSchema).max(500),
  reconcileMode: z.enum(["exact", "merge", "attach_only"]).optional().default("exact"),
  routing: z.undefined().optional(),
})

export type TourPlanWriteInput = z.input<typeof tourPlanWriteSchema>
export type TourPlanStop = z.output<typeof tourPlanStopSchema>
