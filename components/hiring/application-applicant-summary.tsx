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
      <Avatar className={cn("h-12 w-12", avatarClassName)}>
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-slate-700 text-white">
          {applicantName.split(" ").map((namePart) => namePart[0]).join("")}
        </AvatarFallback>
      </Avatar>
      <div className={cn("space-y-2", infoClassName)}>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{applicantName}</h3>
          {status ? <ApplicationStatusBadge status={status} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span>{applicantEmail}</span>
          </div>
          {applicantPhone ? (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              <span>{applicantPhone}</span>
            </div>
          ) : null}
          {appliedAt ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Applied {formatSafeDate(appliedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
