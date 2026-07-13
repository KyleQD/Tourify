"use client"

import { Award, Briefcase, ExternalLink, Mail, MapPin, Phone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { ApplicantProfileSnapshot } from "@/types/hiring-application-review"

interface ApplyProfilePreviewCardProps {
  snapshot: ApplicantProfileSnapshot
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ApplyProfilePreviewCard({ snapshot }: ApplyProfilePreviewCardProps) {
  const { basics, contact, skills, experiences } = snapshot
  const topSkills = skills.topSkills.length > 0 ? skills.topSkills : skills.skills.slice(0, 6)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border border-slate-700">
          {basics.avatarUrl ? <AvatarImage src={basics.avatarUrl} alt={basics.fullName} /> : null}
          <AvatarFallback className="bg-slate-700 text-white">{getInitials(basics.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-white">{basics.fullName}</h3>
            {snapshot.publicProfileUrl ? (
              <a
                href={snapshot.publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-purple-300"
                aria-label="View full profile"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
          {basics.title ? (
            <p className="truncate text-sm text-slate-300">
              {basics.title}
              {basics.company ? ` · ${basics.company}` : ""}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {basics.location ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {basics.location}
              </span>
            ) : null}
            {contact.email ? (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {contact.email}
              </span>
            ) : null}
            {contact.phone ? (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {basics.bio ? <p className="mt-3 line-clamp-3 text-sm text-slate-300">{basics.bio}</p> : null}

      {topSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topSkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="bg-slate-700 text-slate-100">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      {experiences.length > 0 ? (
        <div className="mt-3 space-y-1 text-xs text-slate-400">
          <p className="flex items-center gap-1 font-medium text-slate-300">
            <Briefcase className="h-3 w-3" />
            Experience
          </p>
          {experiences.slice(0, 3).map((exp, index) => (
            <p key={`${exp.title}-${index}`} className="truncate">
              {exp.title}
              {exp.organization ? ` · ${exp.organization}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      {snapshot.certifications.length > 0 ? (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <Award className="h-3 w-3" />
          {snapshot.certifications.length} certification{snapshot.certifications.length === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  )
}
