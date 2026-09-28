import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-interoperability-institution",
  table: "creator_interop_institution_outbox",
  eventField: "event_type",
  launchCapability: "creator_interoperability_institution",
})
