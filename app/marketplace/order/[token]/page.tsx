import type { Metadata } from "next"
import Link from "next/link"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, XCircle, ShoppingBag, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ checkout?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  if (!token) return { title: "Order — Tourify Marketplace" }
  return {
    title: "Your Order — Tourify Marketplace",
    robots: { index: false, follow: false }, // Opaque token URLs must not be indexed
  }
}

// ---------------------------------------------------------------------------
// Data loading — server-side via service role (never exposes token to client)
// ---------------------------------------------------------------------------

async function loadOrderByToken(token: string) {
  if (!token || token.length < 16) return null

  const supabase = createServiceRoleClient()

  const { data: order } = await supabase
    .from("marketplace_orders")
    .select(`
      id,
      order_number,
      status,
      payment_status,
      currency,
      subtotal_amount,
      platform_fee_amount,
      tax_amount,
      total_amount,
      guest_email,
      guest_access_token_expires_at,
      buyer_user_id,
      seller_user_id,
      created_at,
      marketplace_order_items (
        id,
        title,
        quantity,
        unit_price,
        line_total,
        product_type,
        fulfillment_status
      )
    `)
    .eq("guest_access_token", token)
    .maybeSingle()

  if (!order) return null

  // Check expiry
  if (order.guest_access_token_expires_at) {
    const expires = new Date(order.guest_access_token_expires_at)
    if (expires < new Date()) return { expired: true as const, order: null }
  }

  // Load seller profile (safe fields only)
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", order.seller_user_id)
    .maybeSingle()

  return { expired: false as const, order, seller }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***@***"
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 3))}@${domain}`
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount)
}

// ---------------------------------------------------------------------------
// Status display helpers
// ---------------------------------------------------------------------------

type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "refunded" | string

function StatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/20">
        <CheckCircle className="h-4 w-4" />
        Payment confirmed
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/20">
        <XCircle className="h-4 w-4" />
        Payment failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
      <Clock className="h-4 w-4" />
      Awaiting payment
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const guard = requireMarketplaceEnabled()
  if (guard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <p className="text-slate-400 text-sm">Marketplace is not available.</p>
      </div>
    )
  }

  const { token } = await params
  const { checkout } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <p className="text-slate-400 text-sm">Invalid order link.</p>
      </div>
    )
  }

  const result = await loadOrderByToken(token)

  // Expired token
  if (result && "expired" in result && result.expired) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <XCircle className="h-12 w-12 text-slate-500 mx-auto" />
          <h1 className="text-xl font-semibold text-white">Order link expired</h1>
          <p className="text-slate-400 text-sm">
            This order access link has expired. If you have a Tourify account, you can view your
            orders from your account dashboard.
          </p>
          <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
        </div>
      </main>
    )
  }

  // Token not found
  if (!result || !result.order) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <ShoppingBag className="h-12 w-12 text-slate-500 mx-auto" />
          <h1 className="text-xl font-semibold text-white">Order not found</h1>
          <p className="text-slate-400 text-sm">
            We couldn&apos;t find an order matching this link. It may have been removed or the link may be incorrect.
          </p>
          <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
        </div>
      </main>
    )
  }

  const { order, seller } = result
  const items = (order.marketplace_order_items ?? []) as Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
    line_total: number
    product_type: string
    fulfillment_status: string
  }>
  const isPaid = order.payment_status === "paid"
  const isFailed = order.payment_status === "failed"
  const isGuest = !order.buyer_user_id

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-slate-400 text-sm">
                {order.order_number ? (
                  <span>Order <span className="font-mono text-slate-300">{order.order_number}</span></span>
                ) : (
                  "Your order"
                )}
              </p>
              <h1 className="text-2xl font-bold text-white mt-1">
                {isPaid ? "Order confirmed" : isFailed ? "Payment failed" : "Awaiting payment"}
              </h1>
            </div>
            <StatusBadge status={order.payment_status} />
          </div>

          {isPaid && (
            <p className="text-slate-400 text-sm">
              Thank you for your purchase. The seller has been notified and will begin fulfillment shortly.
            </p>
          )}
          {isFailed && (
            <p className="text-red-400 text-sm">
              Your payment could not be processed. No charge was made. Please try again or use a different payment method.
            </p>
          )}
          {!isPaid && !isFailed && checkout === "success" && (
            <p className="text-yellow-400 text-sm">
              Payment is being processed. This page will reflect confirmed status once Stripe confirms.
            </p>
          )}
        </div>

        {/* Seller */}
        {seller && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            {seller.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.avatar_url}
                alt={seller.full_name ?? seller.username ?? "Seller"}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-medium">
                {(seller.full_name ?? seller.username ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sold by</p>
              <p className="text-white font-medium truncate">{seller.full_name ?? seller.username}</p>
              {seller.username && (
                <Link
                  href={`/profile/${seller.username}`}
                  className="text-slate-400 hover:text-white text-xs transition-colors"
                >
                  @{seller.username}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-medium text-slate-300">Items ordered</h2>
          </div>
          <ul className="divide-y divide-slate-800">
            {items.map(item => (
              <li key={item.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Qty: {item.quantity}
                    {item.fulfillment_status && item.fulfillment_status !== "pending" && (
                      <> &middot; <span className="capitalize">{item.fulfillment_status.replace(/_/g, " ")}</span></>
                    )}
                  </p>
                </div>
                <p className="text-white text-sm font-medium whitespace-nowrap">
                  {formatCurrency(Number(item.line_total), order.currency)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="px-4 py-3 border-t border-slate-800 space-y-1.5 bg-slate-900/50">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(order.subtotal_amount), order.currency)}</span>
            </div>
            {Number(order.platform_fee_amount) > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Platform fee</span>
                <span>{formatCurrency(Number(order.platform_fee_amount), order.currency)}</span>
              </div>
            )}
            {Number(order.tax_amount) > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tax</span>
                <span>{formatCurrency(Number(order.tax_amount), order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-white pt-1 border-t border-slate-800">
              <span>Total</span>
              <span>{formatCurrency(Number(order.total_amount), order.currency)}</span>
            </div>
          </div>
        </div>

        {/* Guest email */}
        {order.guest_email && isGuest && (
          <p className="text-slate-400 text-sm text-center">
            Confirmation sent to{" "}
            <span className="text-slate-300 font-medium">{maskEmail(order.guest_email)}</span>
          </p>
        )}

        {/* Guest claim prompt */}
        {isGuest && isPaid && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-5 space-y-3">
            <div>
              <h3 className="text-white font-semibold text-sm">Save your order to a Tourify account</h3>
              <p className="text-slate-400 text-sm mt-1">
                Create a free account or sign in to permanently link this order, get faster future
                checkouts, and access your digital downloads any time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href={`/auth/sign-up?redirect=/marketplace/order/${token}`}>
                  Create account
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                <Link href={`/auth/sign-in?redirect=/marketplace/order/${token}`}>
                  Sign in
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Failed payment retry */}
        {isFailed && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-5 space-y-3">
            <p className="text-red-300 text-sm">
              If you believe this is an error, please try again or contact support.
            </p>
            <Button asChild size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:text-white">
              <Link href="/marketplace">Return to marketplace</Link>
            </Button>
          </div>
        )}

        {/* Support footer */}
        <div className="text-center text-slate-500 text-xs space-y-1 pt-4 border-t border-slate-800">
          <p>
            Questions about this order?{" "}
            <Link href="/support" className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors">
              Contact support
            </Link>
          </p>
          <p>
            <Link href="/marketplace" className="text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1">
              Continue shopping <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
