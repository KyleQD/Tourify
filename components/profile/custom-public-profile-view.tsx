'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  ExternalLink,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Star,
} from 'lucide-react'
import {
  getCustomProfileThemeCssVars,
  type CustomProfileLayout,
  type CustomProfileSection,
  type CustomProfileTheme,
} from '@/lib/profile/custom-profile-layout'
import { cn } from '@/lib/utils'

export interface CustomPublicProfileViewProps {
  layout: CustomProfileLayout
  profile: {
    id: string
    username: string
    account_type?: string
    profile_data?: any
    avatar_url?: string | null
    cover_image?: string | null
    verified?: boolean
    bio?: string | null
    location?: string | null
    social_links?: Record<string, any>
    stats?: {
      followers?: number
      following?: number
      posts?: number
    }
    created_at?: string
  }
  portfolio?: any[]
  experiences?: any[]
  certifications?: any[]
  isOwnProfile?: boolean
  isPreview?: boolean
  onMessage?: (userId: string) => void
  onShare?: (profile: any) => void
  className?: string
}

function surfaceClass(surface: CustomProfileTheme['surface']): string {
  switch (surface) {
    case 'solid':
      return 'bg-[color-mix(in_srgb,var(--cp-text)_8%,var(--cp-bg))] border border-[color-mix(in_srgb,var(--cp-text)_12%,transparent)]'
    case 'minimal':
      return 'bg-transparent border border-[color-mix(in_srgb,var(--cp-text)_10%,transparent)]'
    case 'elevated':
      return 'bg-[color-mix(in_srgb,var(--cp-text)_10%,var(--cp-bg))] border border-[color-mix(in_srgb,var(--cp-text)_16%,transparent)] shadow-xl'
    case 'glass':
    default:
      return 'bg-[color-mix(in_srgb,var(--cp-text)_8%,transparent)] backdrop-blur-xl border border-[color-mix(in_srgb,var(--cp-text)_14%,transparent)]'
  }
}

function moodSurfaceExtra(mood: CustomProfileTheme['mood']): string {
  switch (mood) {
    case 'neon':
      return 'shadow-[0_0_24px_color-mix(in_srgb,var(--cp-accent)_35%,transparent)]'
    case 'brutalist':
      return 'border-2 border-[var(--cp-text)] shadow-[4px_4px_0_0_var(--cp-accent)]'
    case 'retro':
      return 'border-2 border-[var(--cp-accent)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--cp-accent-2)_40%,transparent)]'
    case 'maximalist':
      return 'border-2 border-[var(--cp-accent)] shadow-[0_0_0_3px_var(--cp-accent-2),0_0_28px_color-mix(in_srgb,var(--cp-accent)_40%,transparent)]'
    case 'editorial':
      return 'border-y border-x-0 rounded-none border-[color-mix(in_srgb,var(--cp-text)_25%,transparent)]'
    default:
      return ''
  }
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center items-center'
  if (align === 'right') return 'text-right items-end'
  return 'text-left items-start'
}

function chipRadiusClass(radius: CustomProfileTheme['radius']): string {
  if (radius === 'sharp') return 'rounded-sm'
  if (radius === 'pill') return 'rounded-full'
  return 'rounded-lg'
}

function getDisplayName(profile: CustomPublicProfileViewProps['profile']): string {
  return (
    profile.profile_data?.name ||
    profile.profile_data?.full_name ||
    profile.username ||
    'Member'
  )
}

function getTitle(profile: CustomPublicProfileViewProps['profile']): string | null {
  return profile.profile_data?.title || profile.profile_data?.company
    ? [profile.profile_data?.title, profile.profile_data?.company].filter(Boolean).join(' · ')
    : null
}

function backgroundLayerStyle(theme: CustomProfileTheme): CSSProperties {
  const accent = theme.accentHex
  const accent2 = theme.secondaryAccentHex || theme.accentHex
  const bg = theme.backgroundHex

  switch (theme.backgroundStyle) {
    case 'gradient':
      return {
        backgroundImage: `linear-gradient(145deg, ${bg} 0%, color-mix(in srgb, ${accent} 35%, ${bg}) 48%, color-mix(in srgb, ${accent2} 40%, ${bg}) 100%)`,
      }
    case 'dots':
      return {
        backgroundColor: bg,
        backgroundImage: `radial-gradient(circle, color-mix(in srgb, ${accent} 55%, transparent) 1.2px, transparent 1.2px)`,
        backgroundSize: '18px 18px',
      }
    case 'grid':
      return {
        backgroundColor: bg,
        backgroundImage: `
          linear-gradient(color-mix(in srgb, ${accent} 22%, transparent) 1px, transparent 1px),
          linear-gradient(90deg, color-mix(in srgb, ${accent2} 22%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
      }
    case 'stars':
      return {
        backgroundColor: bg,
        backgroundImage: `
          radial-gradient(1.5px 1.5px at 12% 18%, ${accent}, transparent),
          radial-gradient(1.5px 1.5px at 72% 28%, ${accent2}, transparent),
          radial-gradient(1px 1px at 40% 62%, #fff, transparent),
          radial-gradient(1.5px 1.5px at 86% 74%, ${accent}, transparent),
          radial-gradient(1px 1px at 22% 82%, ${accent2}, transparent)
        `,
      }
    case 'scanlines':
      return {
        backgroundColor: bg,
        backgroundImage: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          color-mix(in srgb, ${accent} 12%, transparent) 2px,
          color-mix(in srgb, ${accent} 12%, transparent) 4px
        )`,
      }
    case 'sparkle':
      return {
        backgroundImage: `
          radial-gradient(circle at 20% 20%, color-mix(in srgb, ${accent} 45%, transparent), transparent 42%),
          radial-gradient(circle at 80% 10%, color-mix(in srgb, ${accent2} 40%, transparent), transparent 38%),
          radial-gradient(circle at 50% 80%, color-mix(in srgb, ${accent} 30%, transparent), transparent 45%),
          linear-gradient(160deg, ${bg}, color-mix(in srgb, ${accent} 18%, ${bg}))
        `,
      }
    case 'solid':
    default:
      return { backgroundColor: bg }
  }
}

function pageFrameClass(frame: CustomProfileTheme['frame']): string {
  switch (frame) {
    case 'thin':
      return 'outline outline-1 outline-[color-mix(in_srgb,var(--cp-accent)_70%,transparent)] outline-offset-[-8px]'
    case 'double':
      return 'outline outline-2 outline-[var(--cp-accent)] outline-offset-[-10px] ring-2 ring-[var(--cp-accent-2)] ring-inset'
    case 'sticker':
      return 'outline outline-[6px] outline-dashed outline-[var(--cp-accent)] outline-offset-[-14px]'
    case 'neon':
      return 'shadow-[inset_0_0_0_3px_var(--cp-accent),inset_0_0_40px_color-mix(in_srgb,var(--cp-accent-2)_35%,transparent)]'
    default:
      return ''
  }
}

function HeadingBlock({
  heading,
  align,
  headingStyle,
}: {
  heading?: string
  align?: 'left' | 'center' | 'right'
  headingStyle: CustomProfileTheme['headingStyle']
}) {
  if (!heading) return null

  if (headingStyle === 'badge') {
    return (
      <div className={cn('mb-4 flex', align === 'center' && 'justify-center', align === 'right' && 'justify-end')}>
        <span
          className="inline-flex items-center px-3 py-1 text-sm font-bold uppercase tracking-wide rounded-[var(--cp-radius)]"
          style={{ backgroundColor: 'var(--cp-accent)', color: '#fff' }}
        >
          {heading}
        </span>
      </div>
    )
  }

  if (headingStyle === 'marquee') {
    return (
      <div
        className={cn(
          'mb-4 overflow-hidden border-y-2 py-1',
          alignClass(align)
        )}
        style={{ borderColor: 'var(--cp-accent)' }}
      >
        <p className="text-sm font-bold uppercase tracking-[0.25em] whitespace-nowrap animate-pulse" style={{ color: 'var(--cp-accent-2)' }}>
          ★ {heading} ★ {heading} ★
        </p>
      </div>
    )
  }

  if (headingStyle === 'outlined') {
    return (
      <h2
        className={cn('text-2xl font-black mb-4 uppercase tracking-wide', alignClass(align))}
        style={{
          color: 'transparent',
          WebkitTextStroke: '1.5px var(--cp-accent)',
        }}
      >
        {heading}
      </h2>
    )
  }

  if (headingStyle === 'underline') {
    return (
      <h2
        className={cn('text-xl font-semibold mb-4 pb-2 border-b-2', alignClass(align))}
        style={{ color: 'var(--cp-text)', borderColor: 'var(--cp-accent)' }}
      >
        {heading}
      </h2>
    )
  }

  return (
    <h2
      className={cn('text-xl font-semibold mb-4', alignClass(align))}
      style={{ color: 'var(--cp-text)' }}
    >
      {heading}
    </h2>
  )
}

function OrnamentRow({ mood }: { mood: CustomProfileTheme['mood'] }) {
  if (mood !== 'maximalist' && mood !== 'retro' && mood !== 'neon') return null

  return (
    <div className="flex items-center justify-center gap-2 py-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((index) => (
        <Star
          key={index}
          className="h-3.5 w-3.5"
          style={{
            color: index % 2 === 0 ? 'var(--cp-accent)' : 'var(--cp-accent-2)',
            fill: index % 2 === 0 ? 'var(--cp-accent)' : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

function SectionShell({
  section,
  theme,
  children,
}: {
  section: CustomProfileSection
  theme: CustomProfileTheme
  children: ReactNode
}) {
  const surface = section.style?.surface || theme.surface
  const variant = section.style?.variant || 'default'
  const isSticker = variant === 'sticker' || variant === 'framed'
  const isQuote = variant === 'quote'

  return (
    <section
      className={cn(
        'p-[var(--cp-gap)] relative',
        surfaceClass(surface),
        moodSurfaceExtra(theme.mood),
        theme.mood === 'editorial' ? 'rounded-none' : 'rounded-[var(--cp-radius)]',
        isSticker && 'rotate-[-0.6deg]',
        isQuote && 'italic border-l-4 pl-5',
        variant === 'banner' && 'overflow-hidden'
      )}
      style={
        {
          ...(section.style?.accentHex ? { '--cp-accent': section.style.accentHex } : {}),
          ...(isQuote ? { borderLeftColor: 'var(--cp-accent)' } : {}),
        } as CSSProperties
      }
    >
      {(theme.mood === 'maximalist' || theme.mood === 'retro') && (
        <div
          className="pointer-events-none absolute inset-x-3 top-2 h-1 rounded-full opacity-80"
          style={{
            background: 'linear-gradient(90deg, var(--cp-accent), var(--cp-accent-2), var(--cp-accent))',
          }}
          aria-hidden
        />
      )}
      <HeadingBlock
        heading={section.heading}
        align={section.style?.align}
        headingStyle={theme.headingStyle}
      />
      <div className={cn('flex flex-col gap-3', alignClass(section.style?.align))}>
        {children}
      </div>
    </section>
  )
}

export function CustomPublicProfileView({
  layout,
  profile,
  portfolio = [],
  experiences = [],
  certifications = [],
  isOwnProfile = false,
  isPreview = false,
  onMessage,
  onShare,
  className,
}: CustomPublicProfileViewProps) {
  const theme = layout.theme
  const themeVars = getCustomProfileThemeCssVars(theme) as CSSProperties
  const displayName = getDisplayName(profile)
  const title = getTitle(profile)
  const skills: string[] = Array.isArray(profile.profile_data?.skills)
    ? profile.profile_data.skills
    : Array.isArray(profile.profile_data?.top_skills)
      ? profile.profile_data.top_skills
      : []
  const social = profile.social_links || {}
  const website = social.website || profile.profile_data?.website
  const visibleSections = layout.sections.filter((section) => section.visible !== false)
  const chipRadius = chipRadiusClass(theme.radius)

  return (
    <div
      className={cn(
        'min-h-screen w-full relative',
        isPreview && 'min-h-0 rounded-2xl overflow-hidden border border-white/10',
        pageFrameClass(theme.frame),
        className
      )}
      style={{
        ...themeVars,
        ...backgroundLayerStyle(theme),
        color: 'var(--cp-text)',
        fontFamily: 'var(--cp-font)',
        fontWeight: 'var(--cp-font-weight)' as any,
      }}
      data-custom-profile-preview={isPreview ? 'true' : undefined}
      data-cp-mood={theme.mood}
    >
      {layout.meta.title && isPreview ? (
        <div
          className="relative z-10 px-4 py-2 text-xs uppercase tracking-wide border-b border-white/10"
          style={{ color: 'var(--cp-muted)', backgroundColor: 'color-mix(in srgb, var(--cp-bg) 80%, transparent)' }}
        >
          Preview · {layout.meta.title}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-[var(--cp-gap)]">
        {(theme.mood === 'maximalist' || theme.mood === 'retro') && <OrnamentRow mood={theme.mood} />}

        {visibleSections.map((section) => {
          const variant = section.style?.variant || 'default'

          switch (section.type) {
            case 'hero': {
              const isCentered = variant === 'centered' || section.style?.align === 'center'
              const isSplit = variant === 'split'
              const isBanner = variant === 'banner' || variant === 'framed'

              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  {((profile.cover_image || profile.profile_data?.cover_image) || isBanner) && (
                    <div
                      className={cn(
                        'w-full mb-2 relative overflow-hidden',
                        isBanner ? 'h-40 sm:h-52' : 'h-36 sm:h-48',
                        'rounded-[calc(var(--cp-radius)-0.25rem)]'
                      )}
                      style={
                        (profile.cover_image || profile.profile_data?.cover_image)
                          ? {
                              backgroundImage: `url(${profile.cover_image || profile.profile_data?.cover_image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : {
                              backgroundImage: `linear-gradient(120deg, var(--cp-accent), var(--cp-accent-2), var(--cp-bg))`,
                            }
                      }
                    >
                      {!(profile.cover_image || profile.profile_data?.cover_image) && (theme.mood === 'maximalist' || theme.mood === 'neon') ? (
                        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-90" aria-hidden>
                          <Sparkles className="h-6 w-6 text-white" />
                          <span className="text-white font-black tracking-[0.3em] text-xs uppercase">
                            profile online
                          </span>
                          <Sparkles className="h-6 w-6 text-white" />
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex gap-4 w-full',
                      isCentered || (!isSplit && section.style?.align === 'center')
                        ? 'flex-col items-center'
                        : 'flex-row items-center',
                      isSplit && 'sm:flex-row'
                    )}
                  >
                    <Avatar
                      className={cn(
                        'h-20 w-20 border-4 shrink-0',
                        theme.mood === 'maximalist' && 'ring-4 ring-[var(--cp-accent-2)]'
                      )}
                      style={{ borderColor: 'var(--cp-accent)' }}
                    >
                      <AvatarImage
                        src={
                          profile.avatar_url ||
                          profile.profile_data?.avatar_url ||
                          undefined
                        }
                        alt={displayName}
                      />
                      <AvatarFallback style={{ backgroundColor: 'var(--cp-accent)', color: '#fff' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn('space-y-1', alignClass(section.style?.align || (isCentered ? 'center' : 'left')))}>
                      <h1
                        className={cn(
                          'text-3xl font-bold',
                          theme.mood === 'brutalist' && 'uppercase tracking-tight',
                          theme.mood === 'maximalist' && 'uppercase'
                        )}
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {displayName}
                      </h1>
                      {title ? (
                        <p style={{ color: 'var(--cp-muted)' }}>{title}</p>
                      ) : null}
                      {profile.location ? (
                        <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--cp-muted)' }}>
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.location}
                        </p>
                      ) : null}
                      <p className="text-sm font-semibold" style={{ color: 'var(--cp-accent)' }}>
                        @{profile.username}
                      </p>
                    </div>
                  </div>
                  {(theme.mood === 'maximalist' || theme.mood === 'retro') && (
                    <OrnamentRow mood={theme.mood} />
                  )}
                </SectionShell>
              )
            }

            case 'about':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--cp-text)' }}>
                    {profile.bio || profile.profile_data?.bio || 'No bio yet.'}
                  </p>
                </SectionShell>
              )

            case 'skills': {
              const asList = variant === 'list'
              const asCloud = variant === 'cloud'

              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  {skills.length ? (
                    asList ? (
                      <ul className="space-y-2 w-full">
                        {skills.map((skill) => (
                          <li
                            key={skill}
                            className="flex items-center gap-2 text-sm border-b pb-2"
                            style={{ borderColor: 'color-mix(in srgb, var(--cp-text) 15%, transparent)' }}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--cp-accent)' }} />
                            {skill}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className={cn('flex flex-wrap gap-2', asCloud && 'justify-center')}>
                        {skills.map((skill, index) => (
                          <Badge
                            key={skill}
                            className={cn('border-0', chipRadius, asCloud && index % 2 === 1 && 'scale-110')}
                            style={{
                              backgroundColor: index % 2 === 0 ? 'var(--cp-accent)' : 'var(--cp-accent-2)',
                              color: '#fff',
                            }}
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )
                  ) : (
                    <p style={{ color: 'var(--cp-muted)' }}>No skills listed yet.</p>
                  )}
                </SectionShell>
              )
            }

            case 'portfolio':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  {portfolio.length ? (
                    <div className="grid gap-3 w-full sm:grid-cols-2">
                      {portfolio.map((item) => (
                        <div
                          key={item.id || item.title}
                          className={cn(
                            'p-3 border',
                            variant === 'framed' ? 'border-2' : 'border',
                            chipRadius
                          )}
                          style={{
                            borderColor:
                              variant === 'framed'
                                ? 'var(--cp-accent)'
                                : 'color-mix(in srgb, var(--cp-text) 12%, transparent)',
                            background:
                              theme.mood === 'maximalist'
                                ? 'color-mix(in srgb, var(--cp-accent) 10%, transparent)'
                                : undefined,
                          }}
                        >
                          <div className="font-medium">{item.title}</div>
                          {item.description ? (
                            <p className="text-sm mt-1 line-clamp-3" style={{ color: 'var(--cp-muted)' }}>
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--cp-muted)' }}>No public portfolio items yet.</p>
                  )}
                </SectionShell>
              )

            case 'experience':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  {experiences.length ? (
                    <div className="space-y-3 w-full">
                      {experiences.map((item) => (
                        <div key={item.id || `${item.title}-${item.company}`} className="flex gap-3">
                          <Briefcase className="h-4 w-4 mt-1 shrink-0" style={{ color: 'var(--cp-accent)' }} />
                          <div>
                            <div className="font-medium">{item.title || item.role}</div>
                            <div className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                              {[item.company || item.organization, item.location].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--cp-muted)' }}>No experience listed yet.</p>
                  )}
                </SectionShell>
              )

            case 'certifications':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  {certifications.length ? (
                    <div className="space-y-3 w-full">
                      {certifications.map((item) => (
                        <div key={item.id || item.name} className="flex gap-3">
                          <GraduationCap className="h-4 w-4 mt-1 shrink-0" style={{ color: 'var(--cp-accent)' }} />
                          <div>
                            <div className="font-medium">{item.name || item.title}</div>
                            {item.issuer ? (
                              <div className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                                {item.issuer}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--cp-muted)' }}>No certifications listed yet.</p>
                  )}
                </SectionShell>
              )

            case 'social': {
              const asIcons = variant === 'icons'
              const linkClass = cn(
                'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border capitalize',
                chipRadius,
                asIcons && 'px-2.5'
              )

              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  <div className="flex flex-wrap gap-2">
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                        style={{ backgroundColor: 'var(--cp-accent)', color: '#fff', borderColor: 'var(--cp-accent)' }}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {!asIcons && 'Website'}
                        {!asIcons && <ExternalLink className="h-3 w-3" />}
                      </a>
                    ) : null}
                    {['instagram', 'twitter', 'linkedin', 'github', 'behance', 'dribbble']
                      .filter((key) => social[key])
                      .map((key, index) => (
                        <a
                          key={key}
                          href={String(social[key])}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                          style={{
                            borderColor: index % 2 === 0 ? 'var(--cp-accent)' : 'var(--cp-accent-2)',
                            color: 'var(--cp-text)',
                            backgroundColor:
                              variant === 'buttons'
                                ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)'
                                : 'transparent',
                          }}
                        >
                          {asIcons ? key.slice(0, 2) : key}
                        </a>
                      ))}
                    {!website &&
                    !['instagram', 'twitter', 'linkedin', 'github', 'behance', 'dribbble'].some(
                      (key) => social[key]
                    ) ? (
                      <p style={{ color: 'var(--cp-muted)' }}>No social links yet.</p>
                    ) : null}
                  </div>
                </SectionShell>
              )
            }

            case 'contact':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  <div className="space-y-2 text-sm">
                    {profile.profile_data?.email || profile.profile_data?.show_email ? (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" style={{ color: 'var(--cp-accent)' }} />
                        <span>{profile.profile_data?.email || 'Available on request'}</span>
                      </p>
                    ) : null}
                    {profile.profile_data?.phone ? (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" style={{ color: 'var(--cp-accent)' }} />
                        <span>{profile.profile_data.phone}</span>
                      </p>
                    ) : null}
                    {profile.location ? (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: 'var(--cp-accent)' }} />
                        <span>{profile.location}</span>
                      </p>
                    ) : null}
                    {!profile.profile_data?.email &&
                    !profile.profile_data?.phone &&
                    !profile.location ? (
                      <p style={{ color: 'var(--cp-muted)' }}>No public contact details.</p>
                    ) : null}
                  </div>
                </SectionShell>
              )

            case 'cta':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  <div className="flex flex-wrap gap-2">
                    {!isOwnProfile && onMessage ? (
                      <Button
                        onClick={() => onMessage(profile.id)}
                        className={cn('border-0', chipRadius)}
                        style={{ backgroundColor: 'var(--cp-accent)', color: '#fff' }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    ) : null}
                    {website ? (
                      <Button
                        asChild
                        variant="outline"
                        className={cn('bg-transparent', chipRadius)}
                        style={{ borderColor: 'var(--cp-accent)', color: 'var(--cp-text)' }}
                      >
                        <a href={website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4 mr-2" />
                          Visit website
                        </a>
                      </Button>
                    ) : null}
                    {onShare ? (
                      <Button
                        variant="outline"
                        className={cn('bg-transparent', chipRadius)}
                        style={{
                          borderColor: 'color-mix(in srgb, var(--cp-text) 20%, transparent)',
                          color: 'var(--cp-text)',
                        }}
                        onClick={() => onShare(profile)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    ) : null}
                  </div>
                </SectionShell>
              )

            case 'text':
              return (
                <SectionShell key={section.id} section={section} theme={theme}>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--cp-text)' }}>
                    {'body' in section ? section.body : ''}
                  </p>
                </SectionShell>
              )

            default:
              return null
          }
        })}

        {(theme.mood === 'maximalist' || theme.mood === 'retro') && <OrnamentRow mood={theme.mood} />}
      </div>
    </div>
  )
}
