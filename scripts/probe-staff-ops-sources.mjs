import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/** Prints only env var NAMES relevant to direct DB access - never values. */
const names = Object.keys(process.env).filter((k) =>
  /DATABASE|POSTGRES|SUPABASE|PG/i.test(k) && !/KEY|TOKEN|SECRET/i.test(k),
)
console.log("DB-related env var names:", names.join(", ") || "(none)")
try {
  require.resolve("pg")
  console.log("pg driver: available")
} catch {
  console.log("pg driver: NOT installed")
}
try {
  require.resolve("@prisma/client")
  console.log("prisma client: available")
} catch {
  console.log("prisma client: NOT installed")
}
