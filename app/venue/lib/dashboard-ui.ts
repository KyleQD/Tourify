/** Radix `TabsList` on dark venue dashboard — scrolls horizontally on narrow viewports */
export const venueDashboardTabListClass =
  "h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto bg-gray-800 p-1 text-muted-foreground [&>*]:shrink-0"

/** Underline-style tabs (e.g. team detail) — still scrolls when many triggers */
export const venueDashboardTabListUnderlineClass =
  "h-auto w-full min-w-0 flex-nowrap justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0 [&>*]:shrink-0"

/** Light cards / default theme (e.g. nested dashboard settings) — wraps on small widths */
export const venueDashboardTabListLightClass =
  "h-auto w-full flex-wrap justify-center gap-1 overflow-x-auto rounded-md bg-muted/40 p-1 text-foreground sm:justify-start [&>*]:shrink-0"
