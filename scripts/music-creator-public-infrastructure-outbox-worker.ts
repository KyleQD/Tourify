import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-public-infrastructure",
  table: "creator_public_outbox",
  eventField: "event_type",
  attemptsField: "attempt_count",
  launchCapability: "creator_public_infrastructure",
})
