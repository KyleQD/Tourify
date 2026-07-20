# Achievement System Summary

Tourify recognition is a three-layer system:

| Layer | Meaning | How earned |
|-------|---------|------------|
| **Achievements** | Personal progression | Auto via metric engine |
| **Badges** | Scarce status / role identity | Manager grant, verification, or rare system grant |
| **Endorsements** | Peer social proof | People who shared real work (prefer job/event/collab context) |

## Architecture

```
User action → achievementEngine.recordMetricEvent
  → user_achievements progress
  → on unlock: reward_transactions + resume highlights + achievement_unlocked notification
  → client AchievementUnlockProvider shows rarity-aware toast

Manager grant → POST /api/badges → user_badges + badge_granted notification
Peer endorse → POST /api/endorsements → endorsements (+ verified when work context) + endorsement_received
```

### Core files

- Engine: `lib/services/achievement-engine.service.ts`
- Service: `lib/services/achievement.service.ts`
- Triggers: `lib/services/achievement-trigger.service.ts` + `lib/services/achievement-metric-events.service.ts`
- Hub: `app/achievements/page.tsx` (+ `achievements-page-client.tsx`)
- Cards / showcase: `components/achievements/*`
- Unlock toast provider: `components/achievements/achievement-unlock-provider.tsx` (mounted in `AppChrome`)
- Icons / labels: `lib/achievements/resolve-achievement-icon.tsx`, `lib/achievements/labels.ts`
- Resume: `lib/services/resume-achievement.service.ts`
- Hiring signal: `lib/services/hiring-eligibility.service.ts` (verified endorsements + completed achievements + reward tier)

## Database (active Supabase path)

- Catalog + user state: `supabase/migrations/20260327123000_achievements_engine_catalog.sql`
- Rewards / resume: `supabase/migrations/20260409170000_work_achievements_rewards_resume.sql`
- Notification types + badge seeds + prefs: `supabase/migrations/20260719220000_recognition_notifications_and_badge_seeds.sql`

Legacy root `migrations/0016*` / `0017*` are historical and not the source of truth for Supabase deploys.

## Notifications

| Type | When |
|------|------|
| `achievement_unlocked` | Metric unlock (engine) |
| `badge_granted` | Manager awards badge |
| `endorsement_received` | Peer endorsement |

Prefs: `enable_achievements` column + JSON preferences keys under notification settings. Quiet hours still apply for normal priority.

## UX notes

- Achievements hub uses dark glass cards, humanized category chips (`Business · 1 completed`), series groups by `group_key`, and earned vs available badge silhouettes.
- Profile section shows featured badges/achievements, verified endorsement counts, and an Endorse CTA for visitors.
- Team panel requires a grant reason and previews the selected badge.

## Endorsement credibility

- Writes go to canonical `endorsements` (legacy `/api/skills/endorse` dual-writes when possible).
- `is_verified` is set when `job_id` / `event_id` / `collaboration_id` / `project_id` is present, or when a shared work context is found.
- Post-hire approval nudges the manager to recognize the new hire from the jobs team panel.

## Points

Total points count **completed** achievements only (wallet + stats + profile).

## Out of scope / deferred

- Account/org-scoped achievement wallets
- Public leaderboards
- Open Badges / blockchain credentials
