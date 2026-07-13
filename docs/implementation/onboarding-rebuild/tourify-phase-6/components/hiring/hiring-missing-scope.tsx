import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface HiringMissingScopeProps {
  title?: string
  description?: string
}

export function HiringMissingScope({
  title = "Select a hiring account",
  description = "This dashboard needs a Venue, Organization, or Artist hiring scope before it can load real onboarding data.",
}: HiringMissingScopeProps) {
  return (
    <Card className="border-amber-500/30 bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pass <code>entity_type</code> and <code>entity_id</code>, or the legacy <code>venue_id</code>, while this route is being wired into the repo's acting-context provider.
      </CardContent>
    </Card>
  )
}
