/**
 * Guest order claim navigation contract.
 *
 * A paid guest order is linked to a Tourify account by sending the buyer to the
 * canonical login portal (`/login?tab=signup|signin`) with `redirectTo` pointing
 * back at the order page carrying `?claim=1`. The order page's claim trigger then
 * POSTs to `/api/marketplace/order/<token>/claim` and reloads the clean order URL
 * so the server-rendered page reflects the claimed state (the "Save your order"
 * prompt disappears and the buyer gains purchase-history and download access).
 *
 * These helpers are deliberately tiny and pure so both the client claim trigger
 * and the link-contract tests share one source of truth.
 */

/** Order page URL that instructs the claim trigger to link the order after login. */
export function buildOrderClaimRedirectUrl(token: string): string {
  return `/marketplace/order/${encodeURIComponent(token)}?claim=1`
}

/** Order page URL without the claim flag (used after a successful claim reload). */
export function buildOrderCleanUrl(token: string): string {
  return `/marketplace/order/${encodeURIComponent(token)}`
}

/**
 * Canonical login portal href for a guest order claim CTA.
 *
 * The unified portal lives at `/login` (never `/auth/sign-in` or
 * `/auth/sign-up`, which do not exist). `tab` selects the sign-up/sign-in tab
 * and `redirectTo` is honored by `normalizePostLoginRedirect`.
 */
export function buildOrderClaimLoginHref(token: string, tab: "signup" | "signin"): string {
  return `/login?tab=${tab}&redirectTo=${encodeURIComponent(buildOrderClaimRedirectUrl(token))}`
}