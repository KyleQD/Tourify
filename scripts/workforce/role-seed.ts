/** Prints the deterministic v1 SQL seed; never connects to a database. */
import { LIVE_EVENT_ROLE_CATALOG } from '../../lib/staff/live-event-role-catalog'
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
process.stdout.write('insert into public.workforce_recognition_roles(role_key,label,family,definition) values\n' + LIVE_EVENT_ROLE_CATALOG.map(r => `(${quote(r.key)},${quote(r.label)},${quote(r.role_category)},${quote(JSON.stringify(r))}::jsonb)`).join(',\n') + ';\n')
