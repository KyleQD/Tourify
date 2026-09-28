# Admin Tour Manager verification

- Validate each record against `docs/engineering/admin-reviews/review.schema.json`.
- Confirm reviewer, review type, source SHA, environment, actor goal, evidence, expected outcome, severity, recommendation, proposed specialist, disposition, rationale, and linked task IDs are present.
- Confirm every evidence reference is reproducible and contains no production secrets or personal data.
- Confirm the proposed specialist exists in the central segment map.
- Confirm review files are the only changed paths owned by this manager.
- For workflow simulations, verify both sender and receiving-side outcomes; UI claims require UI evidence.

A valid review is not proof that implementation or release certification is complete.

