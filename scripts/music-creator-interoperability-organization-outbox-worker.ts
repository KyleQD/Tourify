import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-interoperability-organization",
  table: "creator_interop_org_outbox",
  eventField: "event_type",
  launchCapability: "creator_interoperability_organization",
})
