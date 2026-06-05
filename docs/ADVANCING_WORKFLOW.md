# Advancing Workflow

The **advancing** system lets you collect, track, and distribute production requirements for each event.

---

## Accessing Advancing

`/admin/dashboard/events/[event-id]/advancing`

---

## Sections

| Tab | Purpose |
|-----|---------|
| Tech Rider | Stage plot, input list, monitoring, power requirements |
| Hospitality | Catering, dressing rooms, guest list |
| Travel | Artist and crew travel info |
| Production | Load-in schedule, crew counts |
| Security | Venue access, wristbands |
| Marketing | Press assets, social handles |

---

## Day Sheet

The day sheet at `/admin/dashboard/events/[id]/day-sheet` auto-populates from:
- Event start/end time
- Venue name and address
- Artist lineup from `event_participants`
- Load-in time from advancing

### Distributing a Day Sheet
1. Open day sheet page
2. Click **Generate** — system fills fields from event data
3. Click **Distribute** → email sent to all event participants

---

## Calendar Sync

Tour calendar sync (`/admin/dashboard/calendar`) provides iCal/Google/Outlook subscription feeds.  
Subscribe from any calendar app using the generated `.ics` URL.

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/admin/events/[id]/advancing` | Fetch advancing doc |
| POST | `/api/admin/events/[id]/advancing` | Save/update advancing doc |
| GET | `/api/admin/events/[id]/day-sheet` | Fetch day sheet |
| POST | `/api/admin/events/[id]/day-sheet/distribute` | Send day sheet to participants |
| GET | `/api/admin/events/[id]/advancing/export` | Export as PDF/CSV |
