import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("E2E: Refresh Token Flow", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    // Reset instance state
    (CrudifyInstance as any).token = "";
    (CrudifyInstance as any).refreshToken = "";
    (CrudifyInstance as any).tokenExpiresAt = 0;
    (CrudifyInstance as any).refreshExpiresAt = 0;
    (CrudifyInstance as any).endpoint = "";
    (CrudifyInstance as any).apiKey = "";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should auto-refresh token when expired before CRUD operation", async () => {
    // Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    // Set expired token
    const expiredToken = createMockToken(-60); // Expired 1 minute ago
    (CrudifyInstance as any).token = expiredToken;
    (CrudifyInstance as any).refreshToken = "valid-refresh-token";
    (CrudifyInstance as any).tokenExpiresAt = Date.now() - 60000;
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    // Mock refresh token response
    const newToken = createMockToken(3600);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              token: newToken,
              refreshToken: "new-refresh-token",
              expiresIn: 900,
              refreshExpiresIn: 604800,
            }),
          },
        },
      }),
    });

    // Mock CRUD operation response
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "123", name: "Test User" }),
          },
        },
      }),
    });

    // Perform CRUD operation - should auto-refresh first
    const result = await CrudifyInstance.readItem("users", { _id: "123" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ _id: "123", name: "Test User" });

    // Verify token was refreshed
    const tokenData = CrudifyInstance.getTokenData();
    expect(tokenData.accessToken).toBe(newToken);
    expect(tokenData.refreshToken).toBe("new-refresh-token");
  });

  it("should retry operation after receiving 401 and refreshing token", async () => {
    // Initialize and set token
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    const token = createMockToken(3600);
    (CrudifyInstance as any).token = token;
    (CrudifyInstance as any).refreshToken = "valid-refresh-token";
    (CrudifyInstance as any).tokenExpiresAt = Date.now() + 3600000;
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    // First request fails with auth error
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        errors: [
          {
            message: "Unauthorized",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      }),
    });

    // Refresh token succeeds
    const newToken = createMockToken(3600);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              token: newToken,
              refreshToken: "new-refresh-token",
              expiresIn: 900,
            }),
          },
        },
      }),
    });

    // Retry request succeeds
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "123", name: "Test User" }),
          },
        },
      }),
    });

    const result = await CrudifyInstance.readItem("users", { _id: "123" });

    expect(result.success).toBe(true);
    // Should make: init + failed request + refresh + retry
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("should clear tokens when refresh token fails", async () => {
    // Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    // Set expired token
    const expiredToken = createMockToken(-60);
    (CrudifyInstance as any).token = expiredToken;
    (CrudifyInstance as any).refreshToken = "invalid-refresh-token";
    (CrudifyInstance as any).tokenExpiresAt = Date.now() - 60000;
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    // Refresh token fails
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "ERROR",
            data: JSON.stringify({ message: "Invalid refresh token" }),
          },
        },
      }),
    });

    // Mock CRUD operation (should not be called)
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "123" }),
          },
        },
      }),
    });

    const result = await CrudifyInstance.readItem("users", { _id: "123" });

    // Should fail with auth error
    expect(result.success).toBe(false);
    expect(result.errors?._auth).toBeDefined();

    // Tokens should be cleared
    expect(CrudifyInstance.isLogin()).toBe(false);
    expect(CrudifyInstance.getTokenData().accessToken).toBe("");
    expect(CrudifyInstance.getTokenData().refreshToken).toBe("");
  });

  it("should handle concurrent refresh requests", async () => {
    // Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    // Set expired token
    const expiredToken = createMockToken(-60);
    (CrudifyInstance as any).token = expiredToken;
    (CrudifyInstance as any).refreshToken = "valid-refresh-token";
    (CrudifyInstance as any).tokenExpiresAt = Date.now() - 60000;
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    // Delay refresh response to simulate concurrent requests
    let resolveRefresh: any;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    fetchMock.mockImplementationOnce(() => refreshPromise);

    // Start multiple concurrent refresh requests
    const refresh1 = CrudifyInstance.refreshAccessToken();
    const refresh2 = CrudifyInstance.refreshAccessToken();
    const refresh3 = CrudifyInstance.refreshAccessToken();

    // Resolve the refresh
    const newToken = createMockToken(3600);
    setTimeout(() => {
      resolveRefresh({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({
                token: newToken,
                refreshToken: "new-refresh-token",
                expiresIn: 900,
              }),
            },
          },
        }),
      });
    }, 10);

    const [result1, result2, result3] = await Promise.all([refresh1, refresh2, refresh3]);

    // All should get the same successful result
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result3.success).toBe(true);

    // Should only make one API call
    expect(fetchMock).toHaveBeenCalledTimes(2); // init + refresh (only once)
  });

  it("should not refresh if token is still valid", async () => {
    // Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    // Set valid token (expires in 1 hour)
    const validToken = createMockToken(3600);
    (CrudifyInstance as any).token = validToken;
    (CrudifyInstance as any).refreshToken = "refresh-token";
    (CrudifyInstance as any).tokenExpiresAt = Date.now() + 3600000;
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    const fetchCountBefore = fetchMock.mock.calls.length;

    // Call refresh - should not make API call
    const result = await CrudifyInstance.refreshAccessToken();

    expect(result.success).toBe(true);
    expect(fetchMock.mock.calls.length).toBe(fetchCountBefore); // No new calls
  });

  it("should detect token expiring soon", async () => {
    // Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");

    // Set token that expires in 3 minutes (within "normal" buffer of 5 min)
    const soonToExpireToken = createMockToken(180);
    (CrudifyInstance as any).token = soonToExpireToken;
    (CrudifyInstance as any).tokenExpiresAt = Date.now() + 180000;
    (CrudifyInstance as any).refreshToken = "refresh-token";
    (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

    const tokenData = CrudifyInstance.getTokenData();

    expect(tokenData.willExpireSoon).toBe(true);
    expect(tokenData.isExpired).toBe(false); // Not expired yet (2-min buffer)
    expect(tokenData.isValid).toBe(true); // Still valid
  });
});

// Helper function to create mock JWT tokens
function createMockToken(expiresInSeconds: number): string {
  const futureTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = {
    sub: "user123",
    exp: futureTime,
    type: "access",
    iat: Math.floor(Date.now() / 1000),
  };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}
