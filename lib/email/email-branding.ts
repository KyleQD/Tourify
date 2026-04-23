/**
 * Public site origin and logo URL for emails. Kept separate from email-layout
 * to avoid circular imports (layout imports branding only).
 */

export const EMAIL_LOGO_PATH = "/tourify-logo-white-email.jpg"

/** Escape double-quoted HTML attribute values */
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}

/**
 * Base URL for absolute asset links in HTML email (no trailing slash).
 * Align with NEXT_PUBLIC_SITE_URL used elsewhere (e.g. org invites).
 */
export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (raw) return raw.replace(/\/+$/, "")
  return "https://www.tourify.live"
}

export function getEmailLogoAssetUrl(logoOrigin: string): string {
  const base = logoOrigin.replace(/\/+$/, "")
  return `${base}${EMAIL_LOGO_PATH}`
}

/**
 * Centered logo block: linked image (JPEG for client support) + visible wordmark
 * when images are blocked.
 */
export function buildEmailLogoBlock(logoOrigin: string): string {
  const homeUrl = escapeAttr(logoOrigin.replace(/\/+$/, ""))
  const src = escapeAttr(getEmailLogoAssetUrl(logoOrigin))
  return `<a href="${homeUrl}" style="text-decoration:none;color:#f8fafc;">
  <img src="${src}" width="168" height="44" alt="Tourify" border="0" style="display:block;margin:0 auto 10px;border:0;outline:none;text-decoration:none;width:168px;height:auto;max-width:168px;font-size:0;line-height:0;" />
  </a>
  <div style="font-size:17px;font-weight:700;color:#f8fafc;letter-spacing:-0.02em;line-height:1.25;font-family:inherit;">Tourify</div>`
}
