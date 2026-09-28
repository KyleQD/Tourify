# 09 - Weather Integration

## Current State

The audit found weather-related fields in legacy/site-map schema, but no dedicated Logistics Comms weather-alert adapter or command feed.

## Required Design

Weather alerts should be operational events with deterministic stop/event context:

- provider alert ID;
- severity;
- affected geo/time window;
- matched tour stops/events;
- source provider metadata in private refs;
- approved alert summary for relay/broadcast.

Weather alert routing must not depend on AI. Geo/time matching should be deterministic and auditable.

## First Rollout

Start read-only/inbound. Do not auto-broadcast until severity thresholds, recipients, and acknowledgement rules are configured and tested.
