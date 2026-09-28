# Social architecture

## Boundary

Own feed, posts, follows, friends, groups, messaging, notifications, and collaboration.

## Primary working set

- `app/feed/**`
- `app/posts/**`
- `app/friends/**`
- `app/groups/**`
- `app/messages/**`
- `app/notifications/**`
- `app/collaboration/**`
- `components/feed/**`
- `components/social/**`
- `components/messaging/**`
- `lib/social/**`
- `__tests__/social/**`
- `__tests__/messaging/**`

Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.

If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.
