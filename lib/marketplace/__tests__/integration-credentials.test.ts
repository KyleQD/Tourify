jest.mock("server-only", () => ({}))

describe("marketplace integration credentials", () => {
  beforeAll(() => {
    process.env.MARKETPLACE_INTEGRATION_SECRET = "test-marketplace-secret"
  })

  it("encrypts and decrypts provider secrets", () => {
    const {
      decryptIntegrationSecret,
      encryptIntegrationSecret,
      resolveIntegrationAccessToken,
      sanitizeMarketplaceIntegration,
    } = require("../integration-credentials")

    const envelope = encryptIntegrationSecret("provider-token-123")
    expect(envelope.ciphertext).not.toContain("provider-token-123")
    expect(decryptIntegrationSecret(envelope)).toBe("provider-token-123")
    expect(resolveIntegrationAccessToken({ token_envelope: envelope })).toBe("provider-token-123")

    const safe = sanitizeMarketplaceIntegration({
      id: "integration-1",
      access_token: "plaintext",
      refresh_token: "refresh",
      token_envelope: envelope,
      refresh_token_envelope: envelope,
      provider: "printful",
    })
    expect(safe).toMatchObject({ id: "integration-1", provider: "printful", hasToken: true, hasRefreshToken: true })
    expect(safe.access_token).toBeUndefined()
    expect(safe.token_envelope).toBeUndefined()
  })
})
