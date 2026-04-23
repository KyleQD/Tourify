/**
 * Shared branded email layout for all Tourify transactional emails.
 * Uses table-based HTML with inline styles for maximum email-client compatibility.
 */

import { buildEmailLogoBlock, getSiteOrigin } from "./email-branding"

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export interface EmailLayoutOptions {
  title: string
  preheader: string
  bodyHtml: string
  subtitle?: string
  footerHtml?: string
  /** Base URL for logo image; defaults from NEXT_PUBLIC_SITE_URL or tourify.live */
  logoOrigin?: string
}

const FONT_STACK =
  "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"

const DEFAULT_FOOTER = `This message was sent by Tourify. If you did not expect it, you can safely ignore this email.<br />
Questions? Contact <a href="mailto:support@tourify.com" style="color:#94a3b8;text-decoration:underline;">support@tourify.com</a>`

export interface EmailPlainTextOptions {
  title: string
  bodyLines: string[]
  ctaUrl?: string
  ctaLabel?: string
  footerLines?: string[]
}

export function emailLayoutPlainText(options: EmailPlainTextOptions): string {
  const parts: string[] = [options.title, "", ...options.bodyLines, ""]
  if (options.ctaUrl && options.ctaLabel) {
    parts.push(`${options.ctaLabel}: ${options.ctaUrl}`, "")
  }
  parts.push(...(options.footerLines ?? []))
  parts.push("", `© ${new Date().getFullYear()} Tourify`)
  return parts.join("\n").trim()
}

export function emailLayout(options: EmailLayoutOptions): string {
  const title = escapeHtml(options.title)
  const preheader = escapeHtml(options.preheader)
  const subtitle = options.subtitle ? escapeHtml(options.subtitle) : ""
  const footer = options.footerHtml ?? DEFAULT_FOOTER
  const logoOrigin = options.logoOrigin ?? getSiteOrigin()
  const logoBlock = buildEmailLogoBlock(logoOrigin)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:0;line-height:0;max-height:0;max-width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#111827;border-radius:16px;border:1px solid #334155;overflow:hidden;">
          <tr>
            <td style="padding:26px 28px 6px 28px;text-align:center;border-bottom:1px solid rgba(51,65,85,0.6);">
              ${logoBlock}
              ${subtitle ? `<div style="margin-top:14px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em;font-weight:600;">${subtitle}</div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;color:#e2e8f0;font-size:15px;line-height:1.65;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;font-size:12px;color:#94a3b8;line-height:1.55;border-top:1px solid rgba(51,65,85,0.45);">
              <div style="padding-top:20px;">${footer}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;font-size:11px;color:#64748b;text-align:center;">
              &copy; ${new Date().getFullYear()} Tourify. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function emailButton(args: {
  href: string
  label: string
  gradient?: string
}): string {
  const gradient = args.gradient ?? "linear-gradient(90deg,#7c3aed,#2563eb)"
  const href = escapeHtml(args.href)
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;">
  <tr>
    <td style="border-radius:10px;background:${gradient};">
      <a href="${href}" style="display:inline-block;padding:14px 26px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:10px;">${args.label}</a>
    </td>
  </tr>
</table>`
}

export function emailFallbackUrl(href: string): string {
  const safe = escapeHtml(href)
  return `<p style="margin:0 0 14px 0;color:#94a3b8;font-size:13px;line-height:1.5;">
  If the button does not work, copy and paste this link into your browser:<br />
  <a href="${safe}" style="color:#a78bfa;word-break:break-all;">${safe}</a>
</p>`
}
