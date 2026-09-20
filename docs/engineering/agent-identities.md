# Tourify agent identities

Engineering agents use service principals, not shared human passwords. The
directory is seeded by
`supabase/migrations/20260908130000_agent_service_identities.sql` and starts
with every agent in `docs/engineering/agents/registry.yaml` in `pending`
status.

## Security model

- `agent_identities` is the durable principal and scope directory.
- `agent_credentials` stores only SHA-256 hashes of revocable `ta_...` keys.
- `agent_audit_events` records server-side attribution for agent actions.
- No browser role can read or write these tables; service-role access stays on
  the server.
- An identity is not usable until an operator explicitly provisions it and
  changes it to `active`.
- Optional Supabase Auth linkage uses `app_metadata.actor_type = agent` and
  `app_metadata.agent_id`; authorization must never rely on editable user
  metadata.

## Provisioning

Provision one identity at a time in a non-production environment first:

```bash
npm run agents:identity:provision -- --agent admin --email admin-agent@example.test
```

The command requires `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. It creates an email-confirmed service user, an
active identity link, and one API key, then prints the one-time credentials.
Store them in a secret manager immediately; Tourify never stores the raw API
key or password.

Provisioning does not grant organization membership, Admin capabilities, or
access to arbitrary routes. Each route that supports agents must explicitly
call `authenticateAgentRequest`, enforce a scope and resource boundary, and
write an `agent_audit_events` row.

## Lifecycle

Use `suspended` for temporary stops, `revoked` for permanent retirement, and
revoke individual credentials on rotation. Never reuse an agent key or share
one agent's credential with another principal.
