import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { resolvePushNotificationHref } from "./push-routing"

describe("resolvePushNotificationHref", () => {
  it("returns relative app paths", () => {
    assert.equal(resolvePushNotificationHref("/events/123"), "/events/123")
    assert.equal(resolvePushNotificationHref("/checkout"), "/checkout")
  })

  it("maps tourify scheme URLs", () => {
    assert.equal(resolvePushNotificationHref("tourify://notifications"), "/notifications")
    assert.equal(resolvePushNotificationHref("tourify://chat/abc"), "/chat/abc")
  })

  it("maps https tourify.app URLs", () => {
    assert.equal(
      resolvePushNotificationHref("https://tourify.app/connect/claim?token=1"),
      "/connect/claim?token=1"
    )
  })

  it("rejects invalid payloads", () => {
    assert.equal(resolvePushNotificationHref(null), null)
    assert.equal(resolvePushNotificationHref(""), null)
    assert.equal(resolvePushNotificationHref("https://evil.com/phish"), null)
    assert.equal(resolvePushNotificationHref("javascript:alert(1)"), null)
  })
})
