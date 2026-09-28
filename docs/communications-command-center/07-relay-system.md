# 07 - Relay System

## Purpose

Relays let admins share only relevant operational information from a private source to selected Tourify audiences.

## Sources

Relay sources can be:

- external email/WhatsApp/weather event;
- direct message;
- group message;
- event bulletin;
- event group message;
- workflow/logistics task update.

## Targets

Relay targets should resolve from existing Tourify data:

- user IDs;
- `thread_members`;
- `event_participants`;
- `tour_team_members`;
- `staff_members.department`;
- future department/team tables if introduced.

No hard-coded department membership is allowed.

## Output

Relays can produce:

- group message;
- event bulletin;
- notification;
- acknowledgement requirement;
- task/schedule action link.

The relay record must keep source pointers for admins while exposing only relay text to recipients.
