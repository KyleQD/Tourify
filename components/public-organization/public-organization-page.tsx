'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, CalendarDays, Briefcase, Users, MapPin, ExternalLink, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FollowFriendButton } from '@/components/social/follow-friend-button'
import { MessageModal } from '@/components/messaging/message-modal'
import { getArtistPublicProfilePath } from '@/lib/utils/public-profile-routes'
import type { PublicOrganizationPageDTO } from '@/lib/public-organization/public-organization-types'
import {
  hasArtistRoster,
  hasPublicEventsModule,
  hasServicesJobsModule,
} from '@/lib/organizations/org-subtypes'

function eventHref(event: { id: string; slug: string | null }) {
  return event.slug ? `/events/${encodeURIComponent(event.slug)}` : `/events/${event.id}`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

export function PublicOrganizationPage({ dto }: { dto: PublicOrganizationPageDTO }) {
  const [isMessageOpen, setIsMessageOpen] = useState(false)
  const website =
    typeof dto.contactInfo.website === 'string' ? dto.contactInfo.website : null
  const email = typeof dto.contactInfo.email === 'string' ? dto.contactInfo.email : null
  const canMessage = Boolean(dto.ownerUserId) && !dto.isOwnOrganization

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="relative h-48 md:h-64 w-full overflow-hidden border-b border-white/10">
        {dto.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dto.bannerUrl} alt="" className="h-full w-full object-cover opacity-70" />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(251,146,60,0.2),transparent_40%),linear-gradient(180deg,#0f172a,#020617)]" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16 -mt-12 md:-mt-16 relative z-10">
        <header className="flex flex-col md:flex-row md:items-end gap-5 mb-10">
          <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-slate-950 shadow-xl">
            <AvatarImage src={dto.avatarUrl || undefined} alt={dto.name} />
            <AvatarFallback className="bg-slate-800 text-xl">{initials(dto.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight truncate">{dto.name}</h1>
              <Badge variant="secondary" className="bg-white/10 text-slate-100 border-white/10">
                {dto.subtypeLabel}
              </Badge>
              {dto.isVerified ? (
                <Badge className="bg-sky-500/20 text-sky-200 border-sky-400/30">Verified</Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              /organization/{dto.slug}
              <span aria-hidden>·</span>
              {dto.followerCount.toLocaleString()} followers
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dto.accountId ? (
              <FollowFriendButton
                targetAccountId={dto.accountId}
                targetUserId={dto.ownerUserId}
                accountType="organization"
                size="default"
              />
            ) : null}
            {canMessage ? (
              <Button
                variant="outline"
                className="border-white/20 bg-white/5"
                onClick={() => setIsMessageOpen(true)}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
            ) : null}
            {dto.canManage ? (
              <Button asChild variant="outline" className="border-white/20 bg-white/5">
                <Link href={`/admin/dashboard?account=${encodeURIComponent(dto.id)}`}>Open Admin</Link>
              </Button>
            ) : null}
          </div>
        </header>

        {canMessage ? (
          <MessageModal
            isOpen={isMessageOpen}
            onClose={() => setIsMessageOpen(false)}
            recipient={{
              id: dto.ownerUserId,
              username: dto.slug,
              full_name: dto.name,
              avatar_url: dto.avatarUrl || undefined,
            }}
            recipientAccount={{
              profileId: dto.id,
              accountType: 'organization',
            }}
          />
        ) : null}

        <section className="mb-10">
          <h2 className="text-lg font-medium mb-3">About</h2>
          <p className="text-slate-300 leading-relaxed max-w-3xl whitespace-pre-wrap">
            {dto.description || `${dto.name} is a ${dto.subtypeLabel.toLowerCase()} on Tourify.`}
          </p>
          {dto.specialties.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {dto.specialties.map((item) => (
                <Badge key={item} variant="outline" className="border-white/15 text-slate-200">
                  {item}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
            {website ? (
              <a href={website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-slate-200">
                <ExternalLink className="h-3.5 w-3.5" />
                Website
              </a>
            ) : null}
            {email ? <span>{email}</span> : null}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-medium mb-3">Posts</h2>
          {dto.posts.length === 0 ? (
            <p className="text-sm text-slate-500">No public posts yet.</p>
          ) : (
            <ul className="space-y-3">
              {dto.posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-slate-200 whitespace-pre-wrap text-sm">{post.content}</p>
                  <div className="text-xs text-slate-500 mt-2 flex gap-3">
                    {post.createdAt ? <span>{new Date(post.createdAt).toLocaleDateString()}</span> : null}
                    <span>{post.likesCount} likes</span>
                    <span>{post.commentsCount} comments</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hasArtistRoster(dto.subtype) ? (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-sky-300" />
              <h2 className="text-lg font-medium">
                {dto.subtype === 'label' ? 'Roster' : 'Members'}
              </h2>
            </div>
            {dto.roster.length === 0 ? (
              <p className="text-sm text-slate-500">No artists listed yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {dto.roster.map((member) => {
                  const href = getArtistPublicProfilePath(member.artistSlug || member.artistProfileId)
                  return (
                    <li key={member.membershipId}>
                      <Link
                        href={href || '#'}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.06] transition"
                      >
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={member.avatarUrl || undefined} alt={member.artistName} />
                          <AvatarFallback>{initials(member.artistName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{member.artistName}</div>
                          <div className="text-xs text-slate-400 capitalize">{member.role}</div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}

        {hasPublicEventsModule(dto.subtype) ? (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-orange-300" />
              <h2 className="text-lg font-medium">Events & tours</h2>
            </div>
            {dto.tours.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Tours</h3>
                <ul className="space-y-2">
                  {dto.tours.map((tour) => (
                    <li
                      key={tour.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="font-medium">{tour.name}</div>
                      <div className="text-xs text-slate-400 mt-1 flex gap-2">
                        {tour.status ? <span className="capitalize">{tour.status}</span> : null}
                        {tour.startDate ? <span>{tour.startDate}</span> : null}
                        {tour.endDate ? <span>– {tour.endDate}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dto.upcomingEvents.length === 0 && dto.pastEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No public events yet.</p>
            ) : (
              <div className="space-y-6">
                {dto.upcomingEvents.length > 0 ? (
                  <div>
                    <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Upcoming</h3>
                    <ul className="space-y-2">
                      {dto.upcomingEvents.map((event) => (
                        <li key={event.id}>
                          <Link
                            href={eventHref(event)}
                            className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06]"
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
                              {event.eventDate ? <span>{event.eventDate}</span> : null}
                              {event.venueName ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.venueName}
                                  {event.city ? `, ${event.city}` : ''}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {dto.pastEvents.length > 0 ? (
                  <div>
                    <h3 className="text-sm uppercase tracking-wide text-slate-500 mb-2">Past</h3>
                    <ul className="space-y-2">
                      {dto.pastEvents.map((event) => (
                        <li key={event.id}>
                          <Link
                            href={eventHref(event)}
                            className="block rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-slate-300 hover:bg-white/[0.05]"
                          >
                            <div className="font-medium">{event.title}</div>
                            <div className="text-xs text-slate-500 mt-1">{event.eventDate}</div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {hasServicesJobsModule(dto.subtype) ? (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-emerald-300" />
              <h2 className="text-lg font-medium">Open jobs</h2>
            </div>
            {dto.openJobs.length === 0 ? (
              <p className="text-sm text-slate-500">No open roles right now.</p>
            ) : (
              <ul className="space-y-2">
                {dto.openJobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06]"
                    >
                      <div className="font-medium">{job.title}</div>
                      {job.location ? (
                        <div className="text-xs text-slate-400 mt-1">{job.location}</div>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
