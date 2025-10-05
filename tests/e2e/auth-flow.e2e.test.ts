import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("E2E: Authentication Flow", () => {
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

  it("should complete full authentication flow from init to logout", async () => {
    // Step 1: Initialize
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.test.com/graphql",
            apiKeyEndpoint: "test-endpoint-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("public-api-key");
    expect((CrudifyInstance as any).endpoint).toBe("https://api.test.com/graphql");

    // Step 2: Login
    const mockToken = createMockToken(3600); // Expires in 1 hour
    const mockRefreshToken = "refresh-token-123";

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              token: mockToken,
              refreshToken: mockRefreshToken,
              expiresIn: 900, // 15 minutes
              refreshExpiresIn: 604800, // 7 days
            }),
          },
        },
      }),
    });

    const loginResult = await CrudifyInstance.login("user@example.com", "password123");
    expect(loginResult.success).toBe(true);
    expect(CrudifyInstance.isLogin()).toBe(true);

    // Step 3: Verify token data
    const tokenData = CrudifyInstance.getTokenData();
    expect(tokenData.accessToken).toBe(mockToken);
    expect(tokenData.refreshToken).toBe(mockRefreshToken);
    expect(tokenData.isValid).toBe(true);
    expect(tokenData.isExpired).toBe(false);

    // Step 4: Logout
    const logoutResult = await CrudifyInstance.logout();
    expect(logoutResult.success).toBe(true);
    expect(CrudifyInstance.isLogin()).toBe(false);
    expect(CrudifyInstance.getTokenData().accessToken).toBe("");
  });

  it("should handle login failure and retry successfully", async () => {
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

    // First login attempt fails
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "FIELD_ERROR",
            data: JSON.stringify([{ path: ["password"], message: "Invalid password" }]),
          },
        },
      }),
    });

    const failedLogin = await CrudifyInstance.login("user@example.com", "wrongpassword");
    expect(failedLogin.success).toBe(false);
    expect(failedLogin.errors?.password).toContain("Invalid password");
    expect(CrudifyInstance.isLogin()).toBe(false);

    // Second login attempt succeeds
    const mockToken = createMockToken(3600);

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              token: mockToken,
              refreshToken: "refresh-token",
              expiresIn: 900,
            }),
          },
        },
      }),
    });

    const successLogin = await CrudifyInstance.login("user@example.com", "correctpassword");
    expect(successLogin.success).toBe(true);
    expect(CrudifyInstance.isLogin()).toBe(true);
  });

  it("should restore session from saved tokens", async () => {
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

    // Simulate restoring session from localStorage or similar
    const savedToken = createMockToken(3600);
    const savedRefreshToken = "saved-refresh-token";
    const expiresAt = Date.now() + 900000; // 15 minutes
    const refreshExpiresAt = Date.now() + 604800000; // 7 days

    CrudifyInstance.setTokens({
      accessToken: savedToken,
      refreshToken: savedRefreshToken,
      expiresAt,
      refreshExpiresAt,
    });

    // Verify session is restored
    expect(CrudifyInstance.isLogin()).toBe(true);

    const tokenData = CrudifyInstance.getTokenData();
    expect(tokenData.accessToken).toBe(savedToken);
    expect(tokenData.refreshToken).toBe(savedRefreshToken);
    expect(tokenData.isValid).toBe(true);
  });

  it("should handle token invalidation callback", async () => {
    let callbackTriggered = false;
    const callback = vi.fn(() => {
      callbackTriggered = true;
    });

    CrudifyInstance.setTokenInvalidationCallback(callback);

    // Initialize and login
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

    const mockToken = createMockToken(3600);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              token: mockToken,
              refreshToken: "refresh-token",
              expiresIn: 900,
            }),
          },
        },
      }),
    });

    await CrudifyInstance.login("user@example.com", "password123");

    // Trigger token invalidation via logout
    await CrudifyInstance.logout();

    expect(callbackTriggered).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should re-initialize with different environment", async () => {
    // Initialize with dev environment
    CrudifyInstance.config("dev");

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.dev.crudify.io/graphql",
            apiKeyEndpoint: "dev-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("dev-api-key");
    expect((CrudifyInstance as any).endpoint).toBe("https://api.dev.crudify.io/graphql");

    // Re-initialize with production environment
    CrudifyInstance.config("api");

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            apiEndpoint: "https://api.api.crudify.io/graphql",
            apiKeyEndpoint: "prod-key",
          },
        },
      }),
    });

    await CrudifyInstance.init("prod-api-key");
    expect((CrudifyInstance as any).endpoint).toBe("https://api.api.crudify.io/graphql");
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
