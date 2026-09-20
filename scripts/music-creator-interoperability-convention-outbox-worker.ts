import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-interoperability-convention",
  table: "creator_interop_outbox",
  eventField: "event_type",
  launchCapability: "creator_interoperability_convention",
})
