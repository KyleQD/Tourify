"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/** Non-coercive educational card — no preselected contribution toggle. */
export function CooperativeEducationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator data cooperative</CardTitle>
        <CardDescription>
          Optional readiness information. A Tourify account is not cooperative membership, and contribution is never preselected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href="/cooperative">Learn about readiness</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
