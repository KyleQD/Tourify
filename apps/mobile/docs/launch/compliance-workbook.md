# Compliance Workbook (iOS + Android)

## Purpose

Track all compliance, policy, and review requirements needed for production submission.

## Contacts

| Area | Owner Role | Backup Role |
| --- | --- | --- |
| Privacy policy and legal terms | Legal | Product |
| Data safety declarations | Security | Engineering |
| Store reviewer notes | Release Manager | Engineering |
| Support operations | Customer Support | Operations |

## Required Public URLs

| Item | Value | Status |
| --- | --- | --- |
| Privacy Policy URL | `https://tourify.app/privacy` | pending verification |
| Terms of Service URL | `https://tourify.app/terms` | pending verification |
| Support URL | `https://tourify.app/support` | pending verification |
| Support Email | `support@tourify.app` | pending verification |

## Apple App Store Compliance Checklist

- [ ] Privacy Nutrition Labels completed in App Store Connect
- [ ] Data collection categories align with app behavior
- [ ] Tracking declaration set correctly
- [ ] Age rating questionnaire completed
- [ ] Export compliance confirmed
  - Current config sets `ITSAppUsesNonExemptEncryption = false` in `app.config.ts`
  - Confirm this remains accurate for production build
- [ ] App Review notes include login and test account details
- [ ] Permission text verified (location and any future permissions)

## Google Play Compliance Checklist

- [ ] Data safety form completed and reviewed by Security
- [ ] App content declarations completed
- [ ] Target audience and content rating completed
- [ ] Ads declaration set correctly
- [ ] Privacy policy linked in listing and app content
- [ ] Account deletion policy compliance confirmed if applicable
- [ ] Test account/reviewer instructions attached if login required

## Data Handling Inventory (Launch Baseline)

| Data Type | Why Collected | Stored | Shared | Required for Core Function |
| --- | --- | --- | --- | --- |
| Account identity | Authentication and account ownership | Yes | No | Yes |
| Location (when in use) | Discover personalization | Optional | No | No |
| Booking activity | Reservation management | Yes | No | Yes |
| Device diagnostics | Stability and support triage | Yes | No | No |

## Reviewer Notes Package

Prepare and attach:

- Test account credentials with reset process
- Demo path for key flows: login, discover, booking, notifications
- Feature flags enabled for review build
- Known limitations by region or account mode
- Contact for urgent review clarification

Template: `apps/mobile/docs/launch/templates/reviewer-notes-template.md`

## Approval Gate

Before submit, all rows below must be `approved`:

| Item | Owner | Status | Date |
| --- | --- | --- | --- |
| Apple privacy labels | Legal | pending | |
| Play data safety | Security | pending | |
| Ratings/content forms | Product | pending | |
| Export compliance | Engineering | pending | |
| Reviewer notes | Release Manager | pending | |
