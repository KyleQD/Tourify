# Fix: promoter_contact.email Validation Error on Event Creation

## Overview

When creating an event in the admin event creator, saving fails with:
```
Could not save event
[{ "validation": "email", "code": "invalid_string", "message": "Invalid email", "path": ["promoter_contact", "email"] }]
```

The promoter contact fields are optional and should not block event creation. The bug is caused by two converging issues:

1. **Builder always sends an empty object** — `lib/admin/event-producer-builder.ts` unconditionally sends `promoter_contact: { name: "", email: "", phone: "" }` even when all fields are blank.
2. **Empty string fails `.email()` validation** — `emailSchema` is `z.string().email().nullable().optional()`. An empty string `""` is not `null`/`undefined`, so it passes the truthiness guard in `normalizeEventSetupFields` and then fails Zod's `.email()` validator.

`app/admin/dashboard/events/create/page.tsx` already handles this correctly (only sends the object when at least one field has a value), but the builder utility does not.

---

## Sub-Tasks

### Task 1 — Fix the builder payload to omit promoter_contact when all fields are empty

**Status:** `[x] done`

**Intent:**
Mirror the guard already used in `create/page.tsx` inside `buildEventProducerPayload()` in the builder utility so that `promoter_contact` is `null` (not an empty object) when all three fields are blank.

**Expected Outcomes:**
- When no promoter fields are filled in, `promoter_contact` is sent as `null` (or omitted).
- The `normalizeEventSetupFields` guard `if (parsed.promoter_contact && ...)` evaluates to false and skips validation entirely.
- Event saves successfully without touching promoter fields.

**Todo List:**
1. Open `lib/admin/event-producer-builder.ts` around line 348.
2. Replace the unconditional object with the same conditional guard used in `create/page.tsx`:
   ```ts
   promoter_contact: form.promoterName || form.promoterEmail || form.promoterPhone
     ? { name: form.promoterName, email: form.promoterEmail, phone: form.promoterPhone }
     : null,
   ```

**Relevant Context:**
- `lib/admin/event-producer-builder.ts` lines 348–352 — current unconditional assignment
- `app/admin/dashboard/events/create/page.tsx` lines 377–381 — correct conditional guard to copy

---

### Task 2 — Harden emailSchema to coerce empty string to null

**Status:** `[x] done`

**Intent:**
Prevent future payloads from other callers passing `""` as an email from triggering a validation error. Treat empty string as "not provided" rather than "invalid email".

**Expected Outcomes:**
- `emailSchema` accepts `""` and treats it as `null`.
- Any existing or future code path that sends `email: ""` will silently pass.
- A genuinely invalid email like `"notanemail"` still fails validation.

**Todo List:**
1. Open `lib/admin/event-setup-fields.ts` line 17.
2. Update `emailSchema` to preprocess empty strings to null before validation:
   ```ts
   const emailSchema = z.preprocess(
     (v) => (v === "" ? null : v),
     z.string().email().nullable().optional()
   )
   ```

**Relevant Context:**
- `lib/admin/event-setup-fields.ts` line 17 — `emailSchema` definition
- `eventVenueRelationSchema` line 51 also uses `emailSchema` — this fix covers venue contact email too (same desired behavior)
