# Tourify Auth Email Templates

Supabase Auth is the single source of truth for signup, login, social callback, and password reset flows.

## Source template files

Use these repo files as the canonical HTML sources:

- Confirm signup: `auth-email-confirm-signup.html`
- Magic link: `auth-email-magic-link.html`
- Reset password: `auth-email-reset-password.html`
- Invite user: `auth-email-invite-user.html`

Each file includes the **Tourify logo** as an absolute URL to `/tourify-logo-white-email.jpg` on your public site (JPEG for broad email client support), plus a visible **Tourify** wordmark when images are blocked.

### Logo URL (important)

Supabase templates cannot read environment variables. The repo HTML defaults to the same canonical origin as `app/layout.tsx` when `NEXT_PUBLIC_SITE_URL` is unset:

`https://demo.tourify.live/tourify-logo-white-email.jpg`

If production uses another host (for example `https://www.tourify.live`), **search and replace** `https://demo.tourify.live` in all four `auth-email-*.html` files with your real **Site URL** origin before pasting into the dashboard, so the image and header links match the app users see.

Ensure `tourify-logo-white-email.jpg` is deployed under `public/` at the root of that host (same path as in the repo).

## Per-environment checklist (Vercel + Supabase)

1. Set **`NEXT_PUBLIC_SITE_URL`** in Vercel to the exact public origin (no trailing slash), e.g. `https://demo.tourify.live`.
2. In Supabase → **Authentication** → **URL Configuration**, set **Site URL** to that same **origin only** (no `/auth/callback` path or query string; apex and `www` are different hosts—pick one and redirect the other).
3. Under **Additional Redirect URLs**, prefer `{SITE_URL}/**` on production so OAuth (`/auth/callback?...&authType=social`), password reset (`/reset-password`), and signup confirmation all match. Otherwise add at least:
   - `{SITE_URL}/**` (recommended), or enumerate:
   - `{SITE_URL}/auth/callback` (and any fixed `emailRedirectTo` query strings you use)
   - `{SITE_URL}/reset-password`
   - `{SITE_URL}/login`
   - `{SITE_URL}/dashboard`
   - `{SITE_URL}/onboarding`
   - `{SITE_URL}/auth/verification`
4. Confirm signup emails use `emailRedirectTo` built in [`lib/auth/auth-email-redirect.ts`](../lib/auth/auth-email-redirect.ts); that full URL (including query string) must be allow-listed, or use the `{SITE_URL}/**` wildcard.
5. **Preview deployments:** either add each preview origin to Additional Redirect URLs (noisy) or avoid email signup on previews / use a separate Supabase project for staging.

## Custom SMTP (deliverability)

Supabase’s built-in mail is fine for development; production inboxes often require your own domain.

1. Supabase Dashboard → **Project Settings** → **Authentication** (or **Auth** → **SMTP Settings**, depending on UI version).
2. Enable **custom SMTP** with your provider (e.g. Resend, Postmark, SES).
3. Configure **SPF**, **DKIM**, and optionally **DMARC** for the sending domain so messages are not filed as spam.
4. Re-send a test confirmation after switching SMTP.

Application transactional mail (Resend) for product emails is separate; auth confirmation is still driven by Supabase until you use a custom Auth hook.

## Supabase dashboard setup

1. Open Supabase Dashboard -> Authentication -> Email Templates.
2. For each template type, paste the corresponding HTML file above.
3. Set subjects:
   - Confirm signup: `Confirm your Tourify account`
   - Magic link: `Your Tourify magic link`
   - Reset password: `Reset your Tourify password`
   - Invite user: `You are invited to Tourify`

## Redirect URL configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: your production app origin only (no auth path)
- Additional Redirect URLs: include `https://<your-domain>/**` when supported, or list:
  - `https://<your-domain>/auth/callback` (plus query-specific URLs if not using `/**`)
  - `https://<your-domain>/reset-password`
  - `https://<your-domain>/login`
  - `https://<your-domain>/dashboard`
  - `https://<your-domain>/onboarding`
  - `https://<your-domain>/auth/verification`

## Social providers

Enable and configure OAuth providers in Supabase Auth:

- Google
- Apple
- Facebook

Each provider callback should use Supabase defaults and return to your app through:

- `https://<your-domain>/auth/callback`

## Variables available in templates

Supabase template variables:

- `{{ .ConfirmationURL }}`
- `{{ .Email }}`
- `{{ .Token }}`
- `{{ .TokenHash }}`
- `{{ .RedirectTo }}`

## Programmatic / transactional email (Next.js)

Shared layout and logo URL resolution (from `NEXT_PUBLIC_SITE_URL`) live in:

- [`lib/email/email-layout.ts`](../lib/email/email-layout.ts)
- [`lib/email/email-branding.ts`](../lib/email/email-branding.ts)

Contract and organization invite emails use `emailLayout()` and pick up the logo automatically.

## Promotional emails (campaigns, manual sends)

Reusable HTML and plain-text builders per account type (no automated onboarding send):

- [`lib/email/account-promotional-templates.ts`](../lib/email/account-promotional-templates.ts) — `buildGeneralPromotionalEmail`, `buildArtistPromotionalEmail`, `buildVenuePromotionalEmail`, `buildOrganizationPromotionalEmail`, `buildAdminPromotionalEmail`

Optional Resend send helper (requires `RESEND_API_KEY`):

- [`lib/email/send-promotional-email.ts`](../lib/email/send-promotional-email.ts) — `sendPromotionalEmailViaResend`

## Smoke-test checklist

- Email signup sends confirmation and lands user in login flow.
- Magic link sign-in lands user in callback then dashboard.
- Reset password email link reaches reset flow.
- Invite email link reaches auth flow.
- Google/Apple/Facebook sign-in returns to `/auth/callback`.
- Logo image loads from your production domain; with images off, **Tourify** wordmark still appears.
