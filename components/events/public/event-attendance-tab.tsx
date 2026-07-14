"use client"

import { CheckCircle, Eye, Users, XCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { AttendanceData } from "./types"
import { EventStatTile } from "./event-stat-tile"
import { getAttendanceProfile } from "./utils"

interface EventAttendanceTabProps {
  attendance: AttendanceData | null
}

export function EventAttendanceTab({ attendance }: EventAttendanceTabProps) {
  const { tokens } = useEventSkin()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardContent className="p-6 text-center">
            <div className="mb-3 flex items-center justify-center">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <EventStatTile value={attendance?.attending || 0} label="Attending" tone="green" className="border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
        <Card className={cn(tokens.card, tokens.body)}>
          <CardContent className="p-6 text-center">
            <div className="mb-3 flex items-center justify-center">
              <div className="rounded-full bg-blue-500/20 p-3">
                <Eye className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <EventStatTile value={attendance?.interested || 0} label="Interested" tone="blue" className="border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
        <Card className={cn(tokens.card, tokens.body)}>
          <CardContent className="p-6 text-center">
            <div className="mb-3 flex items-center justify-center">
              <div className="rounded-full bg-red-500/20 p-3">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
            <EventStatTile value={attendance?.not_going || 0} label="Not Going" tone="red" className="border-0 bg-transparent p-0" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <CheckCircle className="h-5 w-5 text-green-400" />
              Attending ({attendance?.attending || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance?.attendees && attendance.attendees.length > 0 ? (
              <div className="space-y-3">
                {attendance.attendees.slice(0, 20).map((attendee) => {
                  const profile = getAttendanceProfile(attendee)
                  return (
                    <div
                      key={attendee.user_id}
                      className={cn(tokens.inset, "flex items-center gap-3 p-3")}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-green-500/20 text-green-300">
                          {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">
                          {profile?.full_name || "Guest"}
                          {profile?.is_verified && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                        {profile?.username && (
                          <div className={'truncate text-sm '}>@{profile.username}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="rounded-full border-green-500/30 text-green-300">
                        Going
                      </Badge>
                    </div>
                  )
                })}
                {attendance.attendees.length > 20 && (
                  <p className={'py-2 text-center text-sm '}>
                    +{attendance.attendees.length - 20} more attending
                  </p>
                )}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-white/20" />
                <p className={tokens.muted}>No one has confirmed attendance yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <Eye className="h-5 w-5 text-blue-400" />
              Interested ({attendance?.interested || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance?.interested_users && attendance.interested_users.length > 0 ? (
              <div className="space-y-3">
                {attendance.interested_users.slice(0, 20).map((entry) => {
                  const profile = getAttendanceProfile(entry)
                  return (
                    <div key={entry.user_id} className={cn(tokens.inset, "flex items-center gap-3 p-3")}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-blue-500/20 text-blue-300">
                          {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-white">
                          {profile?.full_name || "Guest"}
                          {profile?.is_verified && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              ✓
                            </Badge>
                          )}
                        </div>
                        {profile?.username && (
                          <div className={'truncate text-sm '}>@{profile.username}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="rounded-full border-blue-500/30 text-blue-300">
                        Interested
                      </Badge>
                    </div>
                  )
                })}
                {attendance.interested_users.length > 20 && (
                  <p className={'py-2 text-center text-sm '}>
                    +{attendance.interested_users.length - 20} more interested
                  </p>
                )}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Eye className="mx-auto mb-3 h-12 w-12 text-white/20" />
                <p className={tokens.muted}>No one has shown interest yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
