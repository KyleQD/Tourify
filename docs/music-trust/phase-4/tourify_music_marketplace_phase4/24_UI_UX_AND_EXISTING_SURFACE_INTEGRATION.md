# UI/UX and Existing Surface Integration

Phase 4 adds financial surfaces without changing how listeners upload, buy, or play music.

## Routes

Potential routes:

- `/artist/music/financing` — eligibility and offering readiness;
- `/artist/music/financing/[offeringId]` — issuer workspace;
- `/marketplace/music-rights` — approved offerings only;
- `/marketplace/music-rights/[offeringId]` — public disclosure page;
- `/investments/music` — partner-synchronized portfolio;
- `/investments/music/[positionId]` — position, distributions, restrictions, documents;
- `/admin/dashboard/music-marketplace` — operations and compliance.

Audit existing information architecture before final paths.

## Offering page order

1. risk and status banner;
2. legal issuer and partner;
3. exact economic interest and term;
4. rights and revenue scope;
5. historical reconciled results;
6. governed valuation range;
7. fees, deductions, conflicts, and use of proceeds;
8. transfer restrictions and liquidity warning;
9. complete documents;
10. partner-controlled eligibility and subscription call to action.

## Portfolio

Clearly label official quantity, pending settlements, current restrictions, distributions, tax documents, source timestamps, and venue availability. Use empty, pending, suspended, stale, and reconciliation-break states—not just success states.

## Existing music surfaces

Artist profile, EPK, feed, and music catalog may show a restrained “financing available” badge only when approved. Jukebox playback, music purchase, library, feed sharing, and external DSP links remain unchanged. Do not display investor metrics in fan playback UI by default.

## Accessibility and comprehension

Use plain-language summaries, expandable definitions, scenario examples, screen-reader-compatible tables, keyboard-safe partner embeds, localized currency/date display, and confirmation screens that restate irreversible actions.
