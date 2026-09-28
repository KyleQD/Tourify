#!/usr/bin/env node

import { execFileSync } from "node:child_process"

const npmCli = process.env.npm_execpath
if (!npmCli) {
  console.error("✗ Run this check through npm so npm_execpath is available")
  process.exit(1)
}

try {
  execFileSync(
    process.execPath,
    [
      npmCli,
      "ls",
      "@base-ui/react",
      "date-fns",
      "react-day-picker",
      "react",
      "react-dom",
      "--depth=1",
      "--json",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  )
  console.log("✓ Base UI, DayPicker, date-fns, and React peer graph is valid")
} catch (error) {
  const stdout = typeof error?.stdout === "string" ? error.stdout : ""
  const stderr = typeof error?.stderr === "string" ? error.stderr : ""
  console.error("✗ Peer dependency graph is invalid")
  if (stdout) console.error(stdout)
  if (stderr) console.error(stderr)
  process.exit(1)
}
