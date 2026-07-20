# West Coast Tour / Hiring Flow Agents

Multi-agent campaign for:

1. Three artists → one shared band (**Pacific Signal**)
2. Org (**West Coast Touring Co**) → tour + hire crew
3. Three workers → three jobs / onboarding templates
4. Full 10-city West Coast logistics plan

## Quick start

```bash
npm run dev   # separate terminal
npm run qa:seed:flow
npm run qa:seed:flow:scenario
npm run qa:flow:clickthrough
```

## Runbooks

| File | Purpose |
|------|---------|
| [00-orchestrator.md](./00-orchestrator.md) | Order of operations |
| [01-artist-band.md](./01-artist-band.md) | Artists + band roster |
| [02-org-tour-admins.md](./02-org-tour-admins.md) | Tour + admin grants |
| [03-org-jobs-hire.md](./03-org-jobs-hire.md) | Jobs + hire tokens |
| [04-org-tour-plan.md](./04-org-tour-plan.md) | 10-city planning |
| [05-ux-notes.md](./05-ux-notes.md) | Notes template |
| [06-fill-profiles-and-post.md](./06-fill-profiles-and-post.md) | UI-only profile fill + post for all 7 accounts |

```bash
npm run qa:agents:fill-profiles
```

## Cursor Automations

See [AUTOMATIONS.md](./AUTOMATIONS.md) for drafts to finish in the Agents Window.
