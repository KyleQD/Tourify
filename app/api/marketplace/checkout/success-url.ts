export function marketplaceCheckoutSuccessUrl({
  siteUrl,
  orderId,
  guestAccessToken,
}: {
  siteUrl: string
  orderId: string
  guestAccessToken: string | null
}) {
  if (guestAccessToken) {
    return `${siteUrl}/marketplace/order/${guestAccessToken}?checkout=success`
  }
  return `${siteUrl}/marketplace/order/${orderId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`
}
