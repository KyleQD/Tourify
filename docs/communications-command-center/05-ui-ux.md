# 05 - UI / UX

## Placement

Primary placement remains Logistics -> Comms in `app/admin/dashboard/logistics/logistics-page-client.tsx`.

The new first screen should work at organization and tour scope. Event selection should refine the feed, not be required to see communications.

## Layout

The Comms tab should become a command-center surface with:

- scope summary from the existing Logistics scope bar;
- operational alert strip;
- command feed;
- native Team Comms preview;
- event bulletins and group channels when event/tour context exists;
- relay/action panel;
- acknowledgement status panel;
- search and filters.

## Preserve Existing UI

Keep `components/admin/logistics-collaboration.tsx` for event Team Comms. Wrap it in a broader command center instead of deleting it.

Preserve links to the full group chat at `/groups/[id]` and the work inbox at `/messages?tab=work`.

## Empty States

At org scope, do not say "Select an event to use Team Comms" as the entire Comms experience. Instead show:

- org/tour command feed;
- event-scoped Team Comms unavailable state inside only that panel;
- provider setup unavailable cards for email/weather/WhatsApp until integrations exist.

## Safety UX

Relays must show the approved outgoing body separately from private source content. Required acknowledgement should be explicit before sending. Recipient previews should be deterministic and explainable, based on Tourify assignments/departments.
