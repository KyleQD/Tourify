# Task Status Guide

## not_started

No implementation work has begun.

## in_progress

Work has begun but acceptance criteria are not fully validated.

Required fields:

- started_at
- current notes
- expected next action

## blocked

A dependency prevents completion.

Required fields:

- blocker description
- whether blocker is pre-existing
- impact
- attempted resolution
- safest next action

## complete

Allowed only when:

- implementation exists,
- acceptance criteria pass,
- evidence is recorded,
- files are listed,
- tests are recorded,
- completion gate passes.

## deferred

Use only when:

- the work is explicitly out of scope,
- the reason is documented,
- impact is documented,
- future implementation path is recorded.

Deferred tasks do not count as complete.
