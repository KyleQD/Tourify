# Agent 06 — Fill all profile fields + post (UI only)

**Do not seed.** Log into the live app with existing `QA_FLOW_*` accounts and fill every available profile surface via the UI. Each actor must publish one post.

## Command

```bash
npm run dev   # if needed
npm run qa:agents:fill-profiles
# optional headed: QA_AGENT_HEADED=1 npm run qa:agents:fill-profiles
```

## Actors

| Actor | Login | Surfaces | Post |
|-------|-------|----------|------|
| Artist1–3 | `QA_FLOW_ARTIST_*` | `/artist/profile` (all tabs), `/artist/settings`, `/artist/epk`, `/settings` | `/artist` or `/artist/content?tab=compose` |
| Org | `QA_FLOW_ORG_*` | `/admin/dashboard/settings` (profile + public), `/settings` | `/admin/dashboard/feed` Compose |
| Worker1–3 | `QA_FLOW_WORKER_*` | `/settings` (Profile/About/Professional/Experience/Certs/Portfolio/Appearance), `/profile` | `/dashboard` QuickPost |

## Pass criteria

- Login via `/login` portal (not service-role inserts)
- Relevant text fields filled and Save clicked where present
- One post published per account
- Report at `docs/audits/flow-notes/platform-fill-agents.md`
