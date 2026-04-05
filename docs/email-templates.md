# Tourify Auth Email Templates

Supabase Auth is the single source of truth for signup, login, social callback, and password reset flows.

## Source template files

Use these repo files as the canonical HTML sources:

- Confirm signup: `auth-email-confirm-signup.html`
- Magic link: `auth-email-magic-link.html`
- Reset password: `auth-email-reset-password.html`
- Invite user: `auth-email-invite-user.html`

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

- Site URL: your production app origin
- Additional Redirect URLs must include:
  - `https://<your-domain>/auth/callback`
  - `https://<your-domain>/login`
  - `https://<your-domain>/dashboard`
  - `https://<your-domain>/onboarding`

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

## Smoke-test checklist

- Email signup sends confirmation and lands user in login flow.
- Magic link sign-in lands user in callback then dashboard.
- Reset password email link reaches reset flow.
- Invite email link reaches auth flow.
- Google/Apple/Facebook sign-in returns to `/auth/callback`.
