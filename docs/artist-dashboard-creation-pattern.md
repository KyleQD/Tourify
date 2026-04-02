# Artist Dashboard Creation Pattern

This pattern standardizes all "create/edit" experiences in the artist dashboard so modules feel consistent, sleek, and production-grade.

## Canonical Event Creation Entry Points

- `app/artist/events/page.tsx` -> launches `components/events/enhanced-event-creator.tsx`
- `components/events/enhanced-discover-events.tsx` -> launches `components/events/enhanced-event-creator.tsx`

Use `components/events/enhanced-event-creator.tsx` as the source of truth for future event creation behavior and visual style.

## Reusable Style Recipe

Use `components/dashboard/dashboard-create-pattern.ts` for shared classes:

- `dashboardCreatePattern.modalContent` for dialog shell
- `dashboardCreatePattern.shell` for inner container/background treatment
- `dashboardCreatePattern.stepRail` and `getStepPillClasses()` for wizard step UI
- `dashboardCreatePattern.panel` for section cards
- `dashboardCreatePattern.fieldGroup` for form spacing
- `dashboardCreatePattern.input` and `dashboardCreatePattern.selectTrigger` for controls
- `dashboardCreatePattern.footer` for sticky action row

## Visual Rules

- Round primary containers to `rounded-2xl`
- Use dark layered surfaces (`bg-slate-900/50` or darker) with subtle borders
- Reserve gradient accents for primary actions and icon shells
- Keep body copy muted (`text-slate-400`) and labels bright (`text-white`)
- Preserve strong spacing rhythm (`p-4/p-6`, `gap-4/gap-6`, `space-y-4/space-y-6`)

## Interaction Rules

- Use step-level validation before moving to next wizard step
- Keep primary action in a fixed/sticky footer for long forms
- Keep "Cancel/Back" action visual weight lower than submit/next
- Show progress at top for 3+ step flows

## Adoption Checklist For New Modules

- Build modal using `Dialog` + `dashboardCreatePattern.modalContent`
- Structure body with `shell`, then section `panel` blocks
- Apply shared input/select classes instead of one-off field styles
- Use one gradient primary CTA style across module actions
- Confirm responsive behavior for mobile and laptop widths
