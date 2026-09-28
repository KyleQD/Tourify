# 11 - Automation Rules

## Policy

Automation must be deterministic. AI may suggest recipients or summaries, but production routing, emergency delivery, access control, and acknowledgement requirements cannot require AI.

## Rule Shape

A rule should include:

- `org_id`
- `name`
- `enabled`
- `trigger_type`
- `conditions`
- `actions`
- `schema_version`
- `created_by`
- timestamps

## Example Triggers

- source provider is weather and severity is severe;
- email subject/body matches dock/load-in keywords and context is a tour stop;
- relay is urgent and unacknowledged after N minutes;
- task derived from communication is blocked.

## Actions

- create command event;
- suggest relay;
- require acknowledgement;
- notify dispatcher;
- create task;
- escalate to selected admin group.
