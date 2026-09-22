import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-treaty-system-legacy",
  table: "creator_treaty_legacy_outbox",
  eventField: "event_type",
  launchCapability: "creator_treaty_system_legacy",
})
