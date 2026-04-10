# Locale Matrix and Translation Workflow

## Scope

This document defines launch locales, ownership, QA gates, and fallback rules for App Store and Google Play metadata and screenshots.

## Launch Locale Matrix

| Locale Code | Language | Region | Priority | Metadata Owner | Screenshot Owner | QA Owner | Fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| en-US | English | United States | P0 | Product Marketing | Design | QA | none (source locale) |
| es-ES | Spanish | Spain | P0 | Localization | Design | QA | en-US |
| fr-FR | French | France | P0 | Localization | Design | QA | en-US |
| de-DE | German | Germany | P1 | Localization | Design | QA | en-US |
| pt-BR | Portuguese | Brazil | P1 | Localization | Design | QA | en-US |
| ja-JP | Japanese | Japan | P1 | Localization | Design | QA | en-US |

## Rollout Policy

- P0 locales must ship on day 0 for both iOS and Android
- P1 locales can launch in wave 2 after day-0 stability if needed
- If a locale fails content QA, publish with fallback copy from `en-US` and mark hotfix owner

## Translation Workflow

1. Copy source strings from `en-US` templates into translation sheet
2. Localization owner translates and flags copy requiring product review
3. Product marketing reviews tone and policy-sensitive claims
4. QA validates store character limits and in-app terminology alignment
5. Release manager signs off and locks locale for submission

## Localization QA Checklist

- App name, subtitle, and short description are under per-store character limits
- No unsupported claims (for example: guarantees, medical/financial claims)
- Terms are consistent with in-app labels and onboarding text
- Punctuation and capitalization follow locale norms
- Screenshot text is readable and not clipped on target devices
- Dates, units, and currency format match locale expectations

## Fallback Rules

- Missing metadata field: use `en-US`
- Missing screenshot set: use `en-US` only for internal/pre-release tracks
- Missing legal text (privacy/support): block production submission
- Inconsistent terminology found in QA: block locale, allow other locales to ship

## Governance

- Source of truth: this file plus artifacts in `apps/mobile/docs/launch`
- Change approval required from Product Marketing + Engineering Release Manager
- Any locale additions must include metadata, screenshots, and compliance updates
