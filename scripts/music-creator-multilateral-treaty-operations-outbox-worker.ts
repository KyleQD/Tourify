import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-multilateral-treaty-operations",
  table: "creator_treaty_ops_outbox",
  eventField: "event_type",
  launchCapability: "creator_multilateral_treaty_operations",
})
