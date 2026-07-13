import { Calendar, Mail, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ApplicationStatusBadge } from "@/components/hiring/application-status-badge"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { cn } from "@/lib/utils"

interface ApplicationApplicantSummaryProps {
  applicantName: string
  applicantEmail: string
  applicantPhone?: string
  avatarUrl?: string
  status?: string
  appliedAt?: string
  avatarClassName?: string
  className?: string
  infoClassName?: string
}

export function ApplicationApplicantSummary({
  applicantName,
  applicantEmail,
  applicantPhone,
  avatarUrl,
  status,
  appliedAt,
  avatarClassName,
  className,
  infoClassName,
}: ApplicationApplicantSummaryProps) {
  return (
    <div className={cn("flex items-start gap-4", className)}>
      <Avatar className={cn("h-12 w-12 ring-1 ring-white/10", avatarClassName)}>
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-gradient-to-br from-cyan-500/30 via-purple-500/20 to-fuchsia-500/20 text-white">
          {applicantName.split(" ").map((namePart) => namePart[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div className={cn("space-y-2", infoClassName)}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{applicantName}</h3>
          {status ? <ApplicationStatusBadge status={status} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-cyan-400/80" />
            <span>{applicantEmail}</span>
          </div>
          {applicantPhone ? (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-purple-400/80" />
              <span>{applicantPhone}</span>
            </div>
          ) : null}
          {appliedAt ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-fuchsia-400/80" />
              <span>Applied {formatSafeDate(appliedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
