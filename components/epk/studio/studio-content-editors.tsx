"use client"

import React from "react"
import { Plus, Trash2 } from "lucide-react"
import type { EPKData } from "@/lib/services/epk.service"
import { PanelSection, TextAreaField, TextField } from "@/components/epk/studio/studio-ui"

type Patch = (partial: Partial<EPKData>) => void

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function ListEditor<T extends { id: string }>({
  title,
  items,
  onChange,
  create,
  itemLabel,
  renderFields,
}: {
  title: string
  items: T[]
  onChange: (items: T[]) => void
  create: () => T
  itemLabel: (item: T, index: number) => string
  renderFields: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode
}) {
  return (
    <PanelSection
      title={`${title} (${items.length})`}
      action={
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-1 text-xs font-medium text-purple-200 hover:bg-purple-500/25"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-500">Nothing here yet. Add your first one.</p>
      ) : null}
      {items.map((item, index) => (
        <details
          key={item.id}
          className="group rounded-xl border border-white/[0.08] bg-white/[0.02] open:bg-white/[0.04]"
          open={index === items.length - 1 && !itemLabel(item, index).trim()}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm text-white">
            <span className="truncate">{itemLabel(item, index).trim() || `Untitled ${index + 1}`}</span>
            <button
              type="button"
              aria-label="Remove"
              onClick={(e) => {
                e.preventDefault()
                onChange(items.filter((i) => i.id !== item.id))
              }}
              className="rounded p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </summary>
          <div className="flex flex-col gap-3 border-t border-white/[0.06] p-3">
            {renderFields(item, (patch) =>
              onChange(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i))),
            )}
          </div>
        </details>
      ))}
    </PanelSection>
  )
}

export function SectionContentEditor({
  sectionId,
  data,
  onPatch,
}: {
  sectionId: string
  data: EPKData
  onPatch: Patch
}) {
  const contact = (key: keyof EPKData["contact"]) => (value: string) =>
    onPatch({ contact: { ...data.contact, [key]: value } })
  const booking = (key: keyof EPKData["bookingAssets"]) => (value: string) =>
    onPatch({ bookingAssets: { ...data.bookingAssets, [key]: value } })
  const stat = (key: keyof EPKData["stats"]) => (value: string) =>
    onPatch({ stats: { ...data.stats, [key]: Number(value) || 0 } })

  switch (sectionId) {
    case "hero":
      return (
        <PanelSection title="Identity">
          <TextField label="Artist name" value={data.artistName} onChange={(v) => onPatch({ artistName: v })} />
          <TextField label="Genre" value={data.genre} onChange={(v) => onPatch({ genre: v })} />
          <TextField label="Location" value={data.location} onChange={(v) => onPatch({ location: v })} />
          <TextField label="Portrait image URL" value={data.avatarUrl} onChange={(v) => onPatch({ avatarUrl: v })} placeholder="https://" />
          <TextField label="Cover image URL" value={data.coverUrl} onChange={(v) => onPatch({ coverUrl: v })} placeholder="https://" />
        </PanelSection>
      )
    case "one-liner":
      return (
        <PanelSection title="One-liner">
          <TextAreaField
            label="Pitch line"
            rows={3}
            value={data.bookingAssets.oneLiner}
            onChange={booking("oneLiner")}
            placeholder="The sentence a booker remembers."
          />
        </PanelSection>
      )
    case "bio":
      return (
        <PanelSection title="Biography">
          <TextAreaField label="Bio" rows={12} value={data.bio} onChange={(v) => onPatch({ bio: v })} />
          <p className="text-xs text-slate-500">{data.bio.trim().split(/\s+/).filter(Boolean).length} words</p>
        </PanelSection>
      )
    case "stats":
      return (
        <PanelSection title="Numbers">
          <TextField type="number" label="Followers" value={data.stats.followers} onChange={stat("followers")} />
          <TextField type="number" label="Monthly listeners" value={data.stats.monthlyListeners} onChange={stat("monthlyListeners")} />
          <TextField type="number" label="Total streams" value={data.stats.totalStreams} onChange={stat("totalStreams")} />
          <TextField type="number" label="Events played" value={data.stats.eventsPlayed} onChange={stat("eventsPlayed")} />
        </PanelSection>
      )
    case "music":
      return (
        <ListEditor
          title="Tracks"
          items={data.music}
          onChange={(music) => onPatch({ music })}
          itemLabel={(t) => t.title}
          create={() => ({
            id: newId(),
            title: "",
            url: "",
            releaseDate: "",
            streams: 0,
            coverArt: "",
            platform: "spotify",
            trust: {
              originStatus: "unverified",
              certificationStatus: "none",
              certificationLevel: 0,
              certificationPublicId: null,
              publicLabel: "",
            },
          })}
          renderFields={(t, update) => (
            <>
              <TextField label="Title" value={t.title} onChange={(v) => update({ title: v })} />
              <TextField label="Link" value={t.url} onChange={(v) => update({ url: v })} placeholder="https://" />
              <TextField label="Platform" value={t.platform} onChange={(v) => update({ platform: v })} />
              <TextField label="Cover art URL" value={t.coverArt} onChange={(v) => update({ coverArt: v })} />
              <TextField type="date" label="Release date" value={t.releaseDate?.slice(0, 10)} onChange={(v) => update({ releaseDate: v })} />
            </>
          )}
        />
      )
    case "shows":
      return (
        <ListEditor
          title="Shows"
          items={data.upcomingShows}
          onChange={(upcomingShows) => onPatch({ upcomingShows })}
          itemLabel={(s) => s.venue}
          create={() => ({ id: newId(), date: "", venue: "", location: "", ticketUrl: "", status: "upcoming" as const })}
          renderFields={(s, update) => (
            <>
              <TextField label="Venue" value={s.venue} onChange={(v) => update({ venue: v })} />
              <TextField label="City" value={s.location} onChange={(v) => update({ location: v })} />
              <TextField type="date" label="Date" value={s.date?.slice(0, 10)} onChange={(v) => update({ date: v })} />
              <TextField label="Ticket link" value={s.ticketUrl} onChange={(v) => update({ ticketUrl: v })} placeholder="https://" />
            </>
          )}
        />
      )
    case "press":
      return (
        <ListEditor
          title="Press"
          items={data.press}
          onChange={(press) => onPatch({ press })}
          itemLabel={(p) => p.outlet || p.title}
          create={() => ({ id: newId(), title: "", url: "", date: "", outlet: "", excerpt: "" })}
          renderFields={(p, update) => (
            <>
              <TextField label="Outlet" value={p.outlet} onChange={(v) => update({ outlet: v })} />
              <TextField label="Headline" value={p.title} onChange={(v) => update({ title: v })} />
              <TextAreaField label="Quote / excerpt" rows={3} value={p.excerpt} onChange={(v) => update({ excerpt: v })} />
              <TextField label="Link" value={p.url} onChange={(v) => update({ url: v })} placeholder="https://" />
            </>
          )}
        />
      )
    case "media":
      return (
        <ListEditor
          title="Photos"
          items={data.photos}
          onChange={(photos) => onPatch({ photos })}
          itemLabel={(p) => p.caption || p.url.split("/").pop() || ""}
          create={() => ({ id: newId(), url: "", caption: "", isHero: false })}
          renderFields={(p, update) => (
            <>
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.caption || "Photo"} className="aspect-video w-full rounded-lg object-cover" />
              ) : null}
              <TextField label="Image URL" value={p.url} onChange={(v) => update({ url: v })} placeholder="https://" />
              <TextField label="Caption" value={p.caption} onChange={(v) => update({ caption: v })} />
            </>
          )}
        />
      )
    case "contact":
      return (
        <PanelSection title="Contact">
          <TextField label="Booking email" value={data.contact.bookingEmail} onChange={contact("bookingEmail")} />
          <TextField label="Management email" value={data.contact.managementEmail} onChange={contact("managementEmail")} />
          <TextField label="General email" value={data.contact.email} onChange={contact("email")} />
          <TextField label="Phone" value={data.contact.phone} onChange={contact("phone")} />
          <TextField label="Website" value={data.contact.website} onChange={contact("website")} />
        </PanelSection>
      )
    case "social":
      return (
        <ListEditor
          title="Links"
          items={data.social}
          onChange={(social) => onPatch({ social })}
          itemLabel={(s) => s.platform}
          create={() => ({ id: newId(), platform: "", url: "", username: "" })}
          renderFields={(s, update) => (
            <>
              <TextField label="Platform" value={s.platform} onChange={(v) => update({ platform: v })} placeholder="instagram" />
              <TextField label="Handle" value={s.username} onChange={(v) => update({ username: v })} />
              <TextField label="Link" value={s.url} onChange={(v) => update({ url: v })} placeholder="https://" />
            </>
          )}
        />
      )
    case "booking":
      return (
        <PanelSection title="Booking assets">
          <TextField label="Tech rider URL" value={data.bookingAssets.techRiderUrl} onChange={booking("techRiderUrl")} />
          <TextField label="Stage plot URL" value={data.bookingAssets.stagePlotUrl} onChange={booking("stagePlotUrl")} />
        </PanelSection>
      )
    default:
      return null
  }
}
