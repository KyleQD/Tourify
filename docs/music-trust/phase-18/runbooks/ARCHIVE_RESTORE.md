# Runbook: Archive Restore Drill

1. Verify archive package fixity via `evaluateArchivePackage`.
2. Run restore exercise stub; record result in restore_exercises table.
3. On failure: open incident, freeze public projections if integrity uncertain.
4. Activation gate requires archiveRestorePassed.
