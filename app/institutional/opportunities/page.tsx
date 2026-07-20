"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function InstitutionalOpportunitiesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
          <CardDescription>
            Deal rooms, IOIs, and auctions appear here when institutional flags are enabled and classification is approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/institutional">Back to institutional home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
