import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-protocol-constitution",
  table: "creator_protocol_outbox",
  eventField: "event_type",
  launchCapability: "creator_protocol_constitution",
})
