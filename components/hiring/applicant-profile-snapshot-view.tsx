"use client"

import { Award, Briefcase, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ApplicantProfileSnapshot } from "@/types/hiring-application-review"

interface ApplicantProfileSnapshotViewProps {
  snapshot: ApplicantProfileSnapshot
  sharedAt?: string | null
}

function formatDate(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short" })
}

function formatExperienceRange(startDate?: string | null, endDate?: string | null, isCurrent?: boolean): string {
  const start = formatDate(startDate)
  const end = isCurrent ? "Present" : formatDate(endDate)
  if (start && end) return `${start} — ${end}`
  return start || end || ""
}

export function ApplicantProfileSnapshotView({ snapshot, sharedAt }: ApplicantProfileSnapshotViewProps) {
  const { basics, contact, skills, experiences, certifications, portfolio } = snapshot
  const allSkills = Array.from(new Set([...skills.topSkills, ...skills.skills]))

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{basics.fullName}</h3>
            {basics.title ? (
              <p className="text-sm text-slate-300">
                {basics.title}
                {basics.company ? ` · ${basics.company}` : ""}
              </p>
            ) : null}
          </div>
          {snapshot.publicProfileUrl ? (
            <a
              href={snapshot.publicProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
            >
              Public profile <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {basics.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-cyan-400/80" />
              {basics.location}
            </span>
          ) : null}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-slate-200">
              <Mail className="h-3 w-3 text-purple-400/80" />
              {contact.email}
            </a>
          ) : null}
          {contact.phone ? (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-fuchsia-400/80" />
              {contact.phone}
            </span>
          ) : null}
          {contact.website ? (
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-200"
            >
              <Globe className="h-3 w-3" />
              Website
            </a>
          ) : null}
        </div>

        {basics.bio ? <p className="mt-3 whitespace-pre-line text-sm text-slate-300">{basics.bio}</p> : null}

        {sharedAt ? (
          <p className="mt-3 text-xs text-slate-500">Profile shared on {new Date(sharedAt).toLocaleDateString()}</p>
        ) : null}
      </div>

      {allSkills.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((skill) => {
              const endorsements = skills.endorsementCounts[skill]
              return (
                <Badge key={skill} variant="secondary" className="border border-white/10 bg-white/5 text-slate-200">
                  {skill}
                  {endorsements ? <span className="ml-1 text-slate-500">· {endorsements}</span> : null}
                </Badge>
              )
            })}
          </div>
        </section>
      ) : null}

      {experiences.length > 0 ? (
        <section>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Briefcase className="h-3.5 w-3.5" />
            Experience
          </h4>
          <div className="space-y-3">
            {experiences.map((exp, index) => (
              <div key={`${exp.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-white">{exp.title}</p>
                  <span className="text-xs text-slate-400">
                    {formatExperienceRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </span>
                </div>
                {exp.organization ? <p className="text-sm text-slate-300">{exp.organization}</p> : null}
                {exp.description ? <p className="mt-1 text-sm text-slate-400">{exp.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {certifications.length > 0 ? (
        <section>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Award className="h-3.5 w-3.5" />
            Certifications
          </h4>
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={`${cert.name}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="text-white">{cert.name}</p>
                  {cert.authority ? <p className="text-xs text-slate-400">{cert.authority}</p> : null}
                </div>
                {cert.credentialUrl ? (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {portfolio.length > 0 ? (
        <section>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Portfolio</h4>
          <div className="space-y-2">
            {portfolio.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{item.title}</p>
                  <Badge variant="outline" className="border-white/10 text-slate-400">
                    {item.type}
                  </Badge>
                </div>
                {item.description ? <p className="mt-1 text-sm text-slate-400">{item.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
