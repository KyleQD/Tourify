# Agent tools

The control-plane utility bootstraps durable records, generates SHA-stamped maps, manages task state, builds bounded context packets, and validates agent state.

Use the package commands documented in `AGENTS.md`. Individual map commands are available for project, routes and APIs, components, database objects, permissions, and integrations.

The bootstrap command creates only missing human-maintained files. The generate command replaces only files under `docs/engineering/generated/`.
