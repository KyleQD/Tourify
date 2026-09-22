# Tourify Music Page — Kimi Implementation Suite

This folder is the complete implementation handoff for redesigning and finishing the Tourify Music page.

The suite is designed for Kimi or another coding agent to execute in a strict sequence. It includes:

- Product and UX requirements
- Current-state audit instructions
- Technical architecture guidance
- Page-by-page feature specifications
- Global player and provider integration rules
- Accessibility, responsive, loading, error, and empty-state requirements
- A phased implementation plan with completion gates
- Test and validation requirements
- A machine-readable progress tracker
- Templates for audit, decisions, changes, validation, and final handoff

## Primary outcome

The finished Music page must feel like a polished, complete, production-ready music destination inside Tourify. It must support native Tourify music, Audius content, saved music, playlists, discovery, search, account-aware creator actions, and persistent playback through the existing global player.

## Non-negotiable rules

1. Audit before editing.
2. Do not remove working functionality.
3. Do not reset or destructively modify the database.
4. Reuse existing architecture before creating replacements.
5. Execute phases in numerical order.
6. Do not mark a phase complete until its completion gate passes.
7. Update `tracking/progress.json` after every material task.
8. Record every modified and created file.
9. Do not fabricate metrics, data, personalization, or API behavior.
10. Do not stop at a static mockup.
11. Do not claim completion while build, type, lint, test, or critical acceptance checks are failing.
12. Document pre-existing blockers separately from regressions introduced by this work.

## Start here

Kimi must read these files in order:

1. `00_AGENT_OPERATING_RULES.md`
2. `01_PRODUCT_OBJECTIVE.md`
3. `02_BASELINE_AUDIT.md`
4. `MASTER_EXECUTION_ORDER.md`
5. `KIMI_MASTER_PROMPT.md`

Then execute the numbered implementation documents in sequence.

## Reference image

The current page screenshot is included at:

`reference/current-music-page.png`

Use it only as the baseline for identifying current UX problems. Do not reproduce the current page as the final design.

## Required final artifacts

At completion, Kimi must produce:

- Completed audit report
- Updated architecture notes
- Completed implementation
- Updated `tracking/progress.json`
- Completed change log
- Completed validation report
- Final known-limitations list
- Rollback notes
- Final implementation summary
