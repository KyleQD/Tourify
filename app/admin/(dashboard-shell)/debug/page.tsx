import { notFound } from "next/navigation"

/**
 * Admin Dashboard Builder (orp-shell-debug): wont-fix in production surfaces.
 * Keep debug tooling out of the organizer admin shell.
 */
export default function DebugDisabledPage() {
  notFound()
}
