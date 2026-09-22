# Runbook — Local Exit Preservation

Lawful local exit must remain available across legacy continuity planning.

1. Keep `creator_treaty_legacy_local_exit_block_enabled` hard-disabled.
2. Successor-custody and identifier stubs must record `local_exit_preserved=true` by default.
3. Activation denied if exit is blocked.
4. Continuity plans that prevent exit are rehearsal-only and non-executable.
