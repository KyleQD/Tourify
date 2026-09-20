import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-treaty-system-renewal",
  table: "creator_treaty_renewal_outbox",
  eventField: "event_type",
  launchCapability: "creator_treaty_system_renewal",
})
