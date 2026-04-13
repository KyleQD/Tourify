/** Branded HTML for Tourify contract emails — uses shared layout for consistency */

import { escapeHtml, emailLayout, emailButton, emailFallbackUrl } from "./email-layout"

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
    ${emailButton({ href: args.signUrl, label: "Review &amp; sign" })}
    ${emailFallbackUrl(args.signUrl)}
    <p style="margin:16px 0 0 0;color:#64748b;font-size:13px;">
      <strong style="color:#94a3b8;">First time on Tourify?</strong> After you open the link, choose <strong style="color:#94a3b8;">Sign up</strong> and register with this email — you will be returned to this agreement once you are logged in.<br /><br />
      <strong style="color:#94a3b8;">Already have an account?</strong> Choose <strong style="color:#94a3b8;">Sign in</strong> on that page, or use this link: <a href="${args.loginUrl}" style="color:#a78bfa;">open sign-in</a>. You will be sent back to the contract after you authenticate.
    </p>
  `
  return {
    subject: `Action required: sign "${args.contractTitle}" on Tourify`,
    html: emailLayout({
      title: "Contract to sign",
      preheader: `${args.senderDisplayName} sent you an agreement to sign on Tourify.`,
      subtitle: "Contracts",
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
    ${emailButton({ href: args.signUrl, label: "Review &amp; sign now" })}
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      <a href="${args.signUrl}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(args.signUrl)}</a>
    </p>
  `
  return {
    subject: `Reminder: sign "${args.contractTitle}" on Tourify`,
    html: emailLayout({
      title: "Signature reminder",
      preheader: `Reminder: please sign the agreement from ${args.senderDisplayName}.`,
      subtitle: "Contracts",
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
    ${emailButton({ href: args.viewUrl, label: "View completed contract", gradient: "linear-gradient(90deg,#059669,#2563eb)" })}
    <p style="margin:0;color:#94a3b8;font-size:13px;">
      <a href="${args.viewUrl}" style="color:#a78bfa;word-break:break-all;">${escapeHtml(args.viewUrl)}</a>
    </p>
  `
  return {
    subject: `Completed: "${args.contractTitle}" — all signatures received`,
    html: emailLayout({
      title: "Contract completed",
      preheader: `All parties have signed "${args.contractTitle}".`,
      subtitle: "Contracts",
      bodyHtml,
    }),
  }
}
