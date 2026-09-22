import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-federation",
  table: "creator_federation_outbox_events",
  eventField: "event_type",
  launchCapability: "creator_federation",
})
