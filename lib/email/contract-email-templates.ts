/** Branded HTML for Tourify contract emails — keep inline styles for client compatibility */

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function layout(inner: { title: string; preheader: string; bodyHtml: string }) {
  const title = escapeHtml(inner.title)
  const preheader = escapeHtml(inner.preheader)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:linear-gradient(145deg,#1e1b4b 0%,#0f172a 40%,#1e293b 100%);border-radius:20px;border:1px solid rgba(148,163,184,0.25);overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;background:linear-gradient(90deg,#c084fc,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Tourify</div>
              <div style="margin-top:6px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.12em;">Contracts</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;color:#e2e8f0;font-size:15px;line-height:1.6;">
              ${inner.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;font-size:12px;color:#64748b;line-height:1.5;">
              This message was sent by Tourify on behalf of a user. If you did not expect it, you can ignore this email.
              Questions? Reply to your contact on Tourify or visit our help center from your account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildContractInviteEmail(args: {
  contractTitle: string
  senderDisplayName: string
  signUrl: string
  loginUrl: string
}) {
  const t = escapeHtml(args.contractTitle)
  const sender = escapeHtml(args.senderDisplayName)
  const bodyHtml = `
    <p style="margin:0 0 16px 0;color:#cbd5e1;">Hello,</p>
    <p style="margin:0 0 16px 0;"><strong style="color:#f8fafc;">${sender}</strong> has sent you an agreement on Tourify for review and signature.</p>
    <p style="margin:0 0 8px 0;color:#cbd5e1;"><strong style="color:#f8fafc;">Agreement:</strong> ${t}</p>
    <p style="margin:0 0 24px 0;color:#94a3b8;font-size:14px;">
      Open the <strong style="color:#cbd5e1;">Review &amp; sign</strong> link below to read the agreement. If you already use Tourify, sign in with your account. If you are new, create an account using <strong style="color:#cbd5e1;">the same email address this message was sent to</strong> so we can connect you to this invitation and bring you back to sign.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(90deg,#9333ea,#2563eb);">
          <a href="${args.signUrl}" style="display:inline-block;padding:14px 28px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px;">Review &amp; sign</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px 0;color:#94a3b8;font-size:13px;">
      If the button does not work, copy and paste this link into your browser:<br />
      <a href="${args.signUrl}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(args.signUrl)}</a>
    </p>
    <p style="margin:16px 0 0 0;color:#64748b;font-size:13px;">
      <strong style="color:#94a3b8;">First time on Tourify?</strong> After you open the link, choose <strong style="color:#94a3b8;">Sign up</strong> and register with this email — you will be returned to this agreement once you are logged in.<br /><br />
      <strong style="color:#94a3b8;">Already have an account?</strong> Choose <strong style="color:#94a3b8;">Sign in</strong> on that page, or use this link: <a href="${args.loginUrl}" style="color:#a78bfa;">open sign-in</a>. You will be sent back to the contract after you authenticate.
    </p>
  `
  return {
    subject: `Action required: sign “${args.contractTitle}” on Tourify`,
    html: layout({
      title: "Contract to sign",
      preheader: `${args.senderDisplayName} sent you an agreement to sign on Tourify.`,
      bodyHtml,
    }),
  }
}

export function buildContractReminderEmail(args: {
  contractTitle: string
  senderDisplayName: string
  signUrl: string
  reminderLabel: string
}) {
  const t = escapeHtml(args.contractTitle)
  const sender = escapeHtml(args.senderDisplayName)
  const bodyHtml = `
    <p style="margin:0 0 16px 0;color:#cbd5e1;">Hello,</p>
    <p style="margin:0 0 16px 0;">This is a friendly <strong style="color:#f8fafc;">${escapeHtml(args.reminderLabel)}</strong> from Tourify.</p>
    <p style="margin:0 0 16px 0;"><strong style="color:#f8fafc;">${sender}</strong> is still waiting for your signature on:</p>
    <p style="margin:0 0 24px 0;color:#f8fafc;font-weight:600;">${t}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(90deg,#9333ea,#2563eb);">
          <a href="${args.signUrl}" style="display:inline-block;padding:14px 28px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px;">Review &amp; sign now</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      <a href="${args.signUrl}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(args.signUrl)}</a>
    </p>
  `
  return {
    subject: `Reminder: sign “${args.contractTitle}” on Tourify`,
    html: layout({
      title: "Signature reminder",
      preheader: `Reminder: please sign the agreement from ${args.senderDisplayName}.`,
      bodyHtml,
    }),
  }
}

export function buildContractCompletedEmail(args: {
  contractTitle: string
  viewUrl: string
  recipientRole: "owner" | "counterparty"
}) {
  const t = escapeHtml(args.contractTitle)
  const intro =
    args.recipientRole === "owner"
      ? "All parties have signed your agreement. A copy is available in your Tourify account."
      : "All parties have signed the agreement you were invited to. You can review the completed record anytime in Tourify."
  const bodyHtml = `
    <p style="margin:0 0 16px 0;color:#cbd5e1;">Hello,</p>
    <p style="margin:0 0 16px 0;">${intro}</p>
    <p style="margin:0 0 8px 0;color:#cbd5e1;"><strong style="color:#f8fafc;">Agreement:</strong> ${t}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 0 0;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(90deg,#059669,#2563eb);">
          <a href="${args.viewUrl}" style="display:inline-block;padding:14px 28px;font-weight:600;font-size:15px;color:#ffffff;text-decoration:none;border-radius:12px;">View completed contract</a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;color:#94a3b8;font-size:13px;">
      <a href="${args.viewUrl}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(args.viewUrl)}</a>
    </p>
  `
  return {
    subject: `Completed: “${args.contractTitle}” — all signatures received`,
    html: layout({
      title: "Contract completed",
      preheader: `All parties have signed “${args.contractTitle}”.`,
      bodyHtml,
    }),
  }
}
