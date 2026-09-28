#!/usr/bin/env node

import { readFileSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8")
const compose = read("docker/local/docker-compose.yml")
const dockerfile = read("docker/local/Dockerfile")
const nextConfig = read("next.config.ts")
const failures = []

for (const required of ["app:", "redis:", "postgres:", "../../.env.local", "NODE_ENV: development"]) {
  if (!compose.includes(required)) failures.push(`docker/local/docker-compose.yml is missing ${required}`)
}
for (const required of [
  "FROM node:24-alpine",
  "RUN npm install --global npm@11.17.0",
  "RUN npm ci",
  "CMD [\"npm\", \"run\", \"dev\"]",
]) {
  if (!dockerfile.includes(required)) failures.push(`docker/local/Dockerfile is missing ${required}`)
}
if (!nextConfig.includes("output: 'standalone'")) {
  failures.push("next.config.ts must retain standalone output for Docker/Vercel build parity")
}

if (failures.length > 0) {
  console.error(`Local Docker readiness failed (${failures.length}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log("Local Docker readiness passed: development Compose inputs and standalone build output are present.")
}
