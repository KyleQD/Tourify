# 07 — Geolocation, Ranking and Personalization

## Nearby-first requirement

When a usable location exists, the default organic event feed must rank eligible events by geographic distance first.

Strict default:

```text
sort=nearby
distance ASC
start_at ASC
quality_score DESC
event_id ASC
```

This directly satisfies “show users events closest to them first.”

## Location acquisition

### Priority order

1. Explicit location in the current URL or search form.
2. Browser geolocation granted by the user.
3. Saved event-discovery location.
4. Last manually selected location, subject to retention policy.
5. Non-location fallback.

### Browser geolocation behavior

- Ask only in a context where the benefit is clear.
- Explain that location is used to sort nearby events.
- Do not request high accuracy by default.
- Use a bounded timeout.
- Treat denied, unavailable and timed-out states distinctly.
- Do not show raw browser error messages.
- Provide manual city/ZIP entry.
- Make it easy to change or clear location.
- Use HTTPS.

Suggested browser options:

```ts
{
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 15 * 60 * 1000
}
```

Kimi should adjust after testing mobile and desktop behavior.

## Location precision

Use the least precision required:

| Use case | Recommended precision |
|---|---|
| Nearby sorting in current session | Device coordinates in memory |
| Saved home discovery area | City center or user-selected point |
| Analytics | Aggregated region, not raw coordinates |
| Public profile | Never expose private user coordinates |
| Event venue | Exact public venue coordinates where permitted |

## Radius behavior

Default radius should depend on density and user choice.

Suggested initial values:

- Dense metro: 25 miles.
- General default: 50 miles.
- Rural fallback: 100 miles.
- User-selectable: 10, 25, 50, 100, 250 miles.
- Map view: current viewport bounds.

Do not silently expand the radius without telling the user. A “Show events farther away” section may appear after nearby results are exhausted.

## Distance display

- Less than one mile: show one decimal or “under 1 mile.”
- One mile and above: rounded according to design.
- Respect miles/kilometers preference.
- Label distance as approximate.
- Do not show distance when the location source is too imprecise.

## Recommended sort modes

### Nearby

Strict distance-first organic ranking.

### Soonest

```text
start_at ASC
distance ASC
quality_score DESC
```

### Recommended

Future opt-in ranking:

```text
recommended_score =
  0.30 proximity_score +
  0.25 artist_affinity +
  0.15 genre_affinity +
  0.10 social_signal +
  0.10 event_quality +
  0.05 freshness +
  0.05 popularity
```

Weights must be configurable and tested. Do not launch personalized ranking until tracking, explanations and controls are ready.

### Popular

Popularity should use Tourify engagement and approved source signals with anti-manipulation safeguards.

### Recently added

Sort by canonical publication or ingestion date, not provider payload fetch timestamp alone.

## Distance buckets for presentation

Even with strict distance ordering, the UI may visually group results:

- Within 10 miles.
- 10–25 miles.
- 25–50 miles.
- 50–100 miles.
- Farther away.

Buckets must not hide closer events behind promoted or popular records.

## Promoted events

Future promoted events must be:

- Clearly labeled.
- Eligibility-filtered by date and location.
- Inserted in dedicated slots.
- Excluded from the organic distance rank calculation.
- Frequency capped.
- Auditable.

## No-location fallback

When no location is available:

1. Use a manually selected market when present.
2. Show platform-wide featured events.
3. Prioritize upcoming dates.
4. Prompt the user to choose a city without blocking the page.
5. Never infer a precise location from sensitive data.

## Timezone rules

- Store event times as `timestamptz`.
- Store the event timezone explicitly.
- Display in event-local timezone by default.
- For date presets, calculate search boundaries using the selected search location timezone.
- Clarify cross-timezone virtual events.
- Test daylight-saving transitions.

## Cursor stability

Distance pagination must use a stable tuple:

```text
(distance_meters, start_at, quality_score, event_id)
```

The cursor should be signed or encoded server-side and validated.

## Analytics

Track:

- Location prompt shown.
- Permission granted, denied, unavailable or timeout.
- Manual location selected.
- Radius changed.
- Sort changed.
- Filter applied.
- Result clicked.
- “Farther away” expanded.

Do not log raw exact device coordinates into general analytics.
