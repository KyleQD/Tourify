# Tourify opencode agent team

This directory defines the opencode-side agent team for Tourify. Each
`<agent>.md` is a small prompt that binds one entry from the engineering
agent registry to opencode, including the startup protocol and operating
rules.

## Source of truth

- `docs/engineering/agents/registry.yaml` — agent list and purposes.
- `docs/engineering/agents/<id>/CHARTER.md` — mission statement.
- `docs/engineering/agents/<id>/STATE.md` — current domain state (read at runtime, not generated).

## Generated, do not hand-edit

The files here are build output. Regenerate and check with:

```bash
npm run agents:opencode:sync    # rewrite .opencode/agent/*.md
npm run agents:opencode:check   # drift report (exits 2 on drift)
```

The generator applies:

- `mode: primary` for `orchestrator`; `mode: subagent` for all other domains.
- `mode: subagent` + `permission: { edit: deny, bash: ask }` for `qa` and
  `release` so they verify without mutating implementation code.

## Loading

opencode loads these definitions at startup and does not hot-reload. After
any sync (or a registry/CHART change that affects a prompt), quit and restart
opencode.

Default working agent remains `build`. Talk to the team by invoking agents by
name, e.g. "Orchestrator: continue ADMUX-0102" or "work agent: complete
WORK-042", or delegate explicitly through the Task tool with
`subagent_type` set to the agent id.