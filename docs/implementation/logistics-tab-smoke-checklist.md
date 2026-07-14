# Operations Logistics Tab Smoke Checklist

Use this checklist against `/admin/dashboard/logistics` after migrations are applied.

## Scoped View

- Open `/admin/dashboard/logistics?tab=overview&eventId=<event-id>`.
- Confirm Overview, Equipment, Backline, Hotels & Flights, Communication, and Site Maps show event-scoped data only.
- Change tabs and confirm the URL `tab` param updates without losing `eventId`.

## Generic Logistics Items

- Create a transportation item and confirm it appears in the selected event scope.
- Edit title, description, status, priority, assignee, due date, budget, actual cost, notes, and tags.
- Cancel an edit and confirm the original values return.
- Mark an item in progress, complete, and cancelled.
- Bulk-select items and mark them complete.
- Attach an equipment asset to an equipment/backline task and confirm the attached asset is displayed.

## Hotels, Flights, And Transport

- Create a travel group.
- Add group members.
- Use Add in Flight Coordination and confirm the flight appears.
- Use Add in Ground Transportation and confirm the run appears.
- Use Add in Hotel Accommodations with a valid provider and room type and confirm the booking appears.
- Run Auto-Coordinate for a group and confirm the coordination status/timeline updates.

## Backline Rentals

- Confirm active rental agreements render for the selected event/tour.
- Use Edit to update rental status.
- Use Extend to change the end date.
- Use Return to complete the rental.

## Communications

- Send a logistics update.
- Refresh the Communication tab and confirm the message remains visible only in the selected event/tour context.

## Site Maps

- Create a site map with and without a background image.
- Add/edit/delete an element, zone, tent, layer, measurement, note, issue, and map task.
- Export, import, duplicate, save as template, generate a public link, and share with a collaborator.
- Publish to Work Mode and confirm the target event/tour sees the publication.
- Open a shared/public site-map token and verify access is read-only unless the user has collaborator permissions.
