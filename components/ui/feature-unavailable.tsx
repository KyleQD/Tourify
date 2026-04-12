import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FeatureUnavailableProps {
  title: string
  description: string
  fallbackHref?: string
  fallbackLabel?: string
}

export function FeatureUnavailable({
  title,
  description,
  fallbackHref = "/dashboard",
  fallbackLabel = "Back to dashboard",
}: FeatureUnavailableProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={fallbackHref}>{fallbackLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
