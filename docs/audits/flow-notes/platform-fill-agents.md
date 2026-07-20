# Platform fill agents — run report

**Mode:** UI only (no seed inserts for profile content or posts)  
**Base:** http://localhost:3000  
**Command:** `npm run qa:agents:fill-profiles`

## Campaign result

| Actor | Profile fills | Post | Notes |
|-------|---------------|------|-------|
| Artist1 (River Quinn) | Pass — `/artist/profile` (basic/social/professional/settings), `/artist/settings`, EPK, `/settings` | Pass (`/artist`) | Full 15/15 in artist pass |
| Artist2 (Sage Ortega) | Pass — same surfaces | Pass | Occasional `/artist` compile timeout; profile + post OK |
| Artist3 (Morgan Hale) | Pass — same surfaces | Pass | Same |
| Org (West Coast Touring Co) | Pass — admin settings + personal `/settings` | Pass (feed/dashboard) | ToS overlay flaky once; still completed fills + post |
| Worker1 (Casey Stage) | Pass — settings tabs, experience, portfolio, `/profile` | Pass (`/dashboard`) | Cert tab needs clearer Add form labels |
| Worker2 (Jamie Security) | Pass — same | Pass | Cert tab same gap |
| Worker3 (Taylor Bar) | Pass — same | Pass | Cert tab same gap |

**Org + workers run:** 42/47 steps passed  
**Artists run (prior pass):** artist1 15/15; artist2/3 posts + profile tabs completed

## What agents did (live UI)

1. Authenticate (login portal preferred; cookie session fallback when portal stalls under turbopack)
2. Accept mandatory ToS gate when shown
3. Fill every reachable settings/profile tab with persona-relevant copy
4. Publish one post each

## UX findings

### P1
- **Mandatory ToS gate** blocks pointer events until Agree; must be dismissed before any profile work
- **`/login` portal** can hang under turbopack load after many sessions (agents fall back to session cookie, then continue UI fills)
- **Admin dashboard routes** (`/admin/dashboard`, `/admin/dashboard/feed`) can exceed 60–90s first compile

### P2
- **Certifications tab:** “Add” flow labels are ambiguous (`getByLabel(/name|certification/)` matches the tabpanel)
- **Account switcher** unusable while ToS overlay is open

## Reproduce

```bash
npm run dev
npm run qa:agents:fill-profiles
# optional: QA_AGENT_ONLY=artists|org,workers QA_AGENT_HEADED=1 npm run qa:agents:fill-profiles
```

Runbook: [`.agents/flows/west-coast-tour/06-fill-profiles-and-post.md`](../../../.agents/flows/west-coast-tour/06-fill-profiles-and-post.md)
