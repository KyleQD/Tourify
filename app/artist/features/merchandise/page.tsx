"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, ArrowRight } from "lucide-react"

export default function MerchandisePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/artist/store?tab=listings&type=merch")
  }, [router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg border-slate-800 bg-slate-900/60 text-white">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/20">
            <ShoppingBag className="h-7 w-7 text-purple-300" />
          </div>
          <h1 className="text-2xl font-semibold">Merch moved to Store</h1>
          <p className="mt-2 text-sm text-slate-400">
            Merchandise now lives in the marketplace listing flow so products, payments, orders, and storefront previews stay together.
          </p>
          <Button asChild className="mt-6 bg-purple-600 hover:bg-purple-700">
            <Link href="/artist/store?tab=listings&type=merch">
              Open merch listings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
