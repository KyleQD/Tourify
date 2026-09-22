import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-cooperative",
  table: "creator_cooperative_outbox",
  eventField: "event_type",
  launchCapability: "creator_cooperative",
})
