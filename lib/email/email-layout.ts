/**
 * Shared branded email layout for all Tourify transactional emails.
 * Uses table-based HTML with inline styles for maximum email-client compatibility.
 */

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
}

const FONT_STACK =
  "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"

const DEFAULT_FOOTER = `This message was sent by Tourify. If you did not expect it, you can safely ignore this email.<br />
Questions? Contact <a href="mailto:support@tourify.com" style="color:#a78bfa;text-decoration:none;">support@tourify.com</a>`

export function emailLayout(options: EmailLayoutOptions): string {
  const title = escapeHtml(options.title)
  const preheader = escapeHtml(options.preheader)
  const subtitle = options.subtitle ? escapeHtml(options.subtitle) : ""
  const footer = options.footerHtml ?? DEFAULT_FOOTER

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:${FONT_STACK};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:0;line-height:0;max-height:0;max-width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:linear-gradient(145deg,#1e1b4b 0%,#0f172a 40%,#1e293b 100%);border-radius:20px;border:1px solid rgba(148,163,184,0.25);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;background:linear-gradient(90deg,#c084fc,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Tourify</div>${subtitle ? `
              <div style="margin-top:6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">${subtitle}</div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;color:#e2e8f0;font-size:15px;line-height:1.6;">
              ${options.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;font-size:12px;color:#64748b;line-height:1.5;">
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px 28px;font-size:11px;color:#475569;text-align:center;">
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
  const gradient = args.gradient ?? "linear-gradient(90deg,#9333ea,#2563eb)"
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
  <tr>
    <td style="border-radius:12px;background:${gradient};">
      <a href="${args.href}" style="display:inline-block;padding:14px 28px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px;">${args.label}</a>
    </td>
  </tr>
</table>`
}

export function emailFallbackUrl(href: string): string {
  return `<p style="margin:0 0 12px 0;color:#94a3b8;font-size:13px;">
  If the button does not work, copy and paste this link into your browser:<br />
  <a href="${href}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(href)}</a>
</p>`
}
