"use client"

import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/admin/scheduling/ui/avatar"
import { Badge } from "@/components/admin/scheduling/ui/badge"
import { Button } from "@/components/admin/scheduling/ui/button"
import { Separator } from "@/components/admin/scheduling/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/admin/scheduling/ui/sheet"
import { useScheduling } from "@/components/admin/scheduling/scheduling-context"
import {
  availabilityMeta,
  availabilityStatusMeta,
  departmentAccent,
  formatTime,
  initials,
} from "@/components/admin/scheduling/scheduling-data"

export function StaffProfileSheet() {
  const { data, profileStaff, closeProfile } = useScheduling()

  const accent = profileStaff ? departmentAccent[profileStaff.department] : null
  const availability = profileStaff ? data.availability.find((row) => row.staffId === profileStaff.id) : undefined
  const upcoming = profileStaff
    ? data.shifts.filter((s) => s.assignedStaff?.id === profileStaff.id).slice(0, 4)
    : []

  return (
    <Sheet open={!!profileStaff} onOpenChange={(o) => !o && closeProfile()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {profileStaff ? (
          <>
            <SheetHeader className="border-b border-border/60">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className={cn("text-sm font-semibold", accent?.bg, accent?.text)}>
                    {initials(profileStaff.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="text-lg">{profileStaff.name}</SheetTitle>
                  <SheetDescription>
                    {profileStaff.role} · {profileStaff.department}
                  </SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn("ml-auto shrink-0", availabilityMeta[profileStaff.availabilityStatus].className)}
                >
                  {availabilityMeta[profileStaff.availabilityStatus].label}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Confirm rate" value={`${profileStaff.confirmationRate}%`} accent="text-neon-green" />
                <Stat label="Weekly hrs" value={`${profileStaff.weeklyHours}h`} accent="text-neon-cyan" />
                <Stat label="Conflicts" value={`${profileStaff.conflictCount}`} accent="text-neon-red" />
              </div>

              <div className="flex flex-col gap-2">
                <ContactRow icon={Mail} value={profileStaff.email} />
                <ContactRow icon={Phone} value={profileStaff.phone} />
              </div>

              <Separator />

              <Section title="Skills" icon={BadgeCheck}>
                <div className="flex flex-wrap gap-1.5">
                  {profileStaff.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-[10px]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Credentials" icon={ShieldCheck}>
                <div className="flex flex-wrap gap-1.5">
                  {profileStaff.credentials.map((cred) => (
                    <Badge
                      key={cred}
                      variant="outline"
                      className="gap-1 border-neon-green/40 bg-neon-green/10 text-[10px] text-neon-green"
                    >
                      <ShieldCheck className="size-2.5" /> {cred}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section title="Availability this week" icon={CalendarDays}>
                <div className="grid grid-cols-7 gap-1">
                  {data.weekDays.map((day) => {
                    const slot = availability?.slots.find((s) => s.day === day.key)
                    const meta = slot ? availabilityStatusMeta[slot.status] : null
                    return (
                      <div key={day.key} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] uppercase text-muted-foreground">{day.short}</span>
                        <span
                          className={cn(
                            "flex h-7 w-full items-center justify-center rounded-md text-[9px] font-medium",
                            meta?.cell ?? "bg-muted/40 text-muted-foreground",
                          )}
                          title={meta?.label}
                        >
                          {slot?.status.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {availability ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Preferred: {availability.preferredHours}
                  </p>
                ) : null}
              </Section>

              <Section title="Upcoming shifts" icon={CalendarClock}>
                {upcoming.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No upcoming shifts assigned.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {upcoming.map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">{shift.title}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {shift.eventName} · {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {profileStaff.notes ? (
                <Section title="Notes" icon={MessageSquare}>
                  <p className="rounded-lg border border-border/50 bg-background/40 p-2.5 text-[11px] leading-relaxed text-foreground/90">
                    {profileStaff.notes}
                  </p>
                </Section>
              ) : null}
            </div>

            <SheetFooter className="gap-2 border-t border-border/60">
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-neon-purple text-primary-foreground hover:bg-neon-purple/85">
                  <UserPlus data-icon="inline-start" /> Assign to Shift
                </Button>
                <Button variant="secondary">
                  <MessageSquare data-icon="inline-start" /> Message
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary">
                  <CalendarDays data-icon="inline-start" /> Full Schedule
                </Button>
                <Button variant="outline" className="border-neon-red/40 text-neon-red hover:bg-neon-red/10">
                  <UserMinus data-icon="inline-start" /> Mark Unavailable
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle className="sr-only">Staff profile</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border/60 bg-background/40 py-2.5">
      <span className={cn("text-lg font-semibold", accent)}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

function ContactRow({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      <span className="truncate">{value}</span>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Mail
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {title}
      </span>
      {children}
    </div>
  )
}
