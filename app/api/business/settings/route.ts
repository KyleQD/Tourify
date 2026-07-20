import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

const settingsSchema = z.object({
  businessName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(""),
  website: z.string().default(""),
  currency: z.string().default("USD"),
  paymentMethods: z
    .object({
      creditCard: z.boolean(),
      paypal: z.boolean(),
      applePay: z.boolean(),
      googlePay: z.boolean(),
    })
    .default({
      creditCard: true,
      paypal: false,
      applePay: false,
      googlePay: false,
    }),
  notifications: z
    .object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
    })
    .default({
      email: true,
      push: true,
      sms: false,
    }),
})

type BusinessSettings = z.infer<typeof settingsSchema>

const defaultSettings: BusinessSettings = {
  businessName: "",
  email: "",
  phone: "",
  website: "",
  currency: "USD",
  paymentMethods: {
    creditCard: true,
    paypal: false,
    applePay: false,
    googlePay: false,
  },
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
}

function fromDbRow(row: Record<string, unknown> | null | undefined, fallbackEmail?: string): BusinessSettings {
  if (!row) {
    return { ...defaultSettings, email: fallbackEmail || "" }
  }

  return {
    businessName: String(row.business_name || row.businessName || ""),
    email: String(row.email || fallbackEmail || ""),
    phone: String(row.phone || ""),
    website: String(row.website || ""),
    currency: String(row.currency || "USD"),
    paymentMethods: {
      creditCard: Boolean((row.payment_methods as any)?.creditCard ?? (row.paymentMethods as any)?.creditCard),
      paypal: Boolean((row.payment_methods as any)?.paypal ?? (row.paymentMethods as any)?.paypal),
      applePay: Boolean((row.payment_methods as any)?.applePay ?? (row.paymentMethods as any)?.applePay),
      googlePay: Boolean((row.payment_methods as any)?.googlePay ?? (row.paymentMethods as any)?.googlePay),
    },
    notifications: {
      email: Boolean((row.notifications as any)?.email ?? true),
      push: Boolean((row.notifications as any)?.push ?? true),
      sms: Boolean((row.notifications as any)?.sms ?? false),
    },
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { user, supabase } = auth

  // Preferred dedicated table when present
  const { data: tableRow, error: tableError } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!tableError && tableRow) {
    return NextResponse.json(fromDbRow(tableRow, user.email))
  }

  // Fallback: profiles.account_settings.business
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, account_settings")
    .eq("id", user.id)
    .maybeSingle()

  const stored = (profile?.account_settings as any)?.business as Record<string, unknown> | undefined
  if (stored) {
    return NextResponse.json(
      fromDbRow(
        {
          businessName: stored.businessName,
          email: stored.email,
          phone: stored.phone,
          website: stored.website,
          currency: stored.currency,
          paymentMethods: stored.paymentMethods,
          notifications: stored.notifications,
        },
        profile?.email || user.email,
      ),
    )
  }

  return NextResponse.json({
    ...defaultSettings,
    businessName: profile?.full_name || "",
    email: profile?.email || user.email || "",
  })
}

async function upsertBusinessSettings(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = settingsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const settings = parsed.data
  const { user, supabase } = auth

  const dbPayload = {
    user_id: user.id,
    business_name: settings.businessName,
    email: settings.email,
    phone: settings.phone,
    website: settings.website,
    currency: settings.currency,
    payment_methods: settings.paymentMethods,
    notifications: settings.notifications,
    updated_at: new Date().toISOString(),
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("business_settings")
    .upsert(dbPayload, { onConflict: "user_id" })
    .select("*")
    .maybeSingle()

  if (!upsertError && upserted) {
    return NextResponse.json(fromDbRow(upserted, user.email))
  }

  // Fallback when business_settings table is absent
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_settings")
    .eq("id", user.id)
    .maybeSingle()

  const nextSettings = {
    ...((profile?.account_settings as Record<string, unknown>) || {}),
    business: settings,
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ account_settings: nextSettings, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  return upsertBusinessSettings(request)
}

export async function PATCH(request: NextRequest) {
  return upsertBusinessSettings(request)
}
