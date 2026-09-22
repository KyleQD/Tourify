import { runCreatorOutboxWorkerFromEnv } from "../lib/music/creator-outbox-runner"

runCreatorOutboxWorkerFromEnv({
  workerId: "creator-digital-commons",
  table: "creator_commons_outbox",
  eventField: "topic",
  launchCapability: "creator_digital_commons",
})
