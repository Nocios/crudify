import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("Authentication Operations", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // Reset instance state
    (CrudifyInstance as any).token = "";
    (CrudifyInstance as any).refreshToken = "";
    (CrudifyInstance as any).tokenExpiresAt = 0;
    (CrudifyInstance as any).refreshExpiresAt = 0;
    (CrudifyInstance as any).endpoint = "";
    (CrudifyInstance as any).apiKey = "";

    // Save original fetch
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });

  describe("init", () => {
    it("should initialize successfully with valid API key", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com/graphql",
              apiKeyEndpoint: "test-endpoint-key",
            },
          },
        }),
      });

      await CrudifyInstance.init("test-public-api-key");

      expect((CrudifyInstance as any).endpoint).toBe("https://api.test.com/graphql");
      expect((CrudifyInstance as any).apiKey).toBe("test-endpoint-key");
      expect((CrudifyInstance as any).publicApiKey).toBe("test-public-api-key");
    });

    it("should throw error when initialization fails", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          errors: [{ message: "Invalid API key" }],
        }),
      });

      await expect(CrudifyInstance.init("invalid-key")).rejects.toThrow(
        "Failed to initialize Crudify"
      );
    });

    it("should reset tokens on re-initialization", async () => {
      // Set some tokens first
      (CrudifyInstance as any).token = "old-token";
      (CrudifyInstance as any).refreshToken = "old-refresh";

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com/graphql",
              apiKeyEndpoint: "test-key",
            },
          },
        }),
      });

      await CrudifyInstance.init("new-api-key");

      expect((CrudifyInstance as any).token).toBe("");
      expect((CrudifyInstance as any).refreshToken).toBe("");
    });

    it("should set log level during init", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com/graphql",
              apiKeyEndpoint: "test-key",
            },
          },
        }),
      });

      await CrudifyInstance.init("test-key", "debug");

      expect(CrudifyInstance.getLogLevel()).toBe("debug");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      // Initialize first
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com/graphql",
              apiKeyEndpoint: "test-key",
            },
          },
        }),
      });

      await CrudifyInstance.init("test-api-key");
    });

    it("should login successfully with email and password", async () => {
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const mockRefreshToken = "refresh-token-123";

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({
                token: mockToken,
                refreshToken: mockRefreshToken,
                expiresIn: 900,
                refreshExpiresIn: 604800,
              }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.login("test@example.com", "password123");

      expect(result.success).toBe(true);
      expect(result.data?.loginStatus).toBe("successful");
      expect(result.data?.token).toBe(mockToken);
      expect(result.data?.refreshToken).toBe(mockRefreshToken);
    });

    it("should login successfully with username and password", async () => {
      const mockToken = "test-token";

      globalThis.fetch = vi.fn().mockResolvedValue({
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

      const result = await CrudifyInstance.login("testuser", "password123");

      expect(result.success).toBe(true);
    });

    it("should handle login failure with field errors", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "FIELD_ERROR",
              data: JSON.stringify([
                { path: ["email"], message: "Invalid email format" },
                { path: ["password"], message: "Password required" },
              ]),
            },
          },
        }),
      });

      const result = await CrudifyInstance.login("invalid", "");

      expect(result.success).toBe(false);
      expect(result.errors?.email).toBeDefined();
      expect(result.errors?.password).toBeDefined();
    });

    it("should handle invalid credentials error", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ERROR",
              data: JSON.stringify({ message: "INVALID_CREDENTIALS" }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.login("wrong@email.com", "wrongpassword");

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should throw error when not initialized", async () => {
      (CrudifyInstance as any).endpoint = "";
      (CrudifyInstance as any).apiKey = "";

      await expect(CrudifyInstance.login("test@example.com", "password")).rejects.toThrow(
        "Not initialized"
      );
    });
  });

  describe("refreshAccessToken", () => {
    beforeEach(async () => {
      // Initialize and login first
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com/graphql",
              apiKeyEndpoint: "test-key",
            },
          },
        }),
      });

      await CrudifyInstance.init("test-api-key");

      // Set expired token and valid refresh token
      const expiredTime = Math.floor(Date.now() / 1000) - 60;
      const payload = {
        sub: "user123",
        exp: expiredTime,
        type: "access",
      };
      const expiredToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      (CrudifyInstance as any).token = expiredToken;
      (CrudifyInstance as any).refreshToken = "valid-refresh-token";
      (CrudifyInstance as any).tokenExpiresAt = Date.now() - 60000; // Expired
      (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000; // Not expired
    });

    it("should refresh token successfully", async () => {
      const newToken = "new-access-token";
      const newRefreshToken = "new-refresh-token";

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({
                token: newToken,
                refreshToken: newRefreshToken,
                expiresIn: 900,
                refreshExpiresIn: 604800,
              }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.refreshAccessToken();

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe(newToken);
      expect(result.data?.refreshToken).toBe(newRefreshToken);
    });

    it("should return error when no refresh token available", async () => {
      (CrudifyInstance as any).refreshToken = "";

      const result = await CrudifyInstance.refreshAccessToken();

      expect(result.success).toBe(false);
      expect(result.errors?._refresh).toContain("NO_REFRESH_TOKEN_AVAILABLE");
    });

    it("should handle refresh token failure", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ERROR",
              data: JSON.stringify({ message: "Invalid refresh token" }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.refreshAccessToken();

      expect(result.success).toBe(false);
      // Tokens should be cleared after failed refresh
      expect((CrudifyInstance as any).token).toBe("");
      expect((CrudifyInstance as any).refreshToken).toBe("");
    });

    it("should skip refresh if token is not expired", async () => {
      // Set valid non-expired token
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const validToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      (CrudifyInstance as any).token = validToken;
      (CrudifyInstance as any).tokenExpiresAt = Date.now() + 3600000;

      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const result = await CrudifyInstance.refreshAccessToken();

      expect(result.success).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled(); // Should not make API call
    });

    it("should prevent concurrent refresh requests", async () => {
      let resolveRefresh: any;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      globalThis.fetch = vi.fn().mockImplementation(() => refreshPromise);

      // Start first refresh
      const refresh1 = CrudifyInstance.refreshAccessToken();

      // Start second refresh while first is in progress
      const refresh2 = CrudifyInstance.refreshAccessToken();

      // Resolve the mock
      resolveRefresh({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({
                token: "new-token",
                refreshToken: "new-refresh",
                expiresIn: 900,
              }),
            },
          },
        }),
      });

      const [result1, result2] = await Promise.all([refresh1, refresh2]);

      expect(result1).toBe(result2); // Should be the same promise
      expect(globalThis.fetch).toHaveBeenCalledTimes(1); // Only one API call
    });
  });

  describe("setToken (legacy)", () => {
    it("should set token when valid string is provided", () => {
      CrudifyInstance.setToken("test-token");

      expect((CrudifyInstance as any).token).toBe("test-token");
    });

    it("should not set token when empty string is provided", () => {
      (CrudifyInstance as any).token = "existing-token";

      CrudifyInstance.setToken("");

      expect((CrudifyInstance as any).token).toBe("existing-token");
    });

    it("should not set token when non-string is provided", () => {
      (CrudifyInstance as any).token = "existing-token";

      CrudifyInstance.setToken(null as any);

      expect((CrudifyInstance as any).token).toBe("existing-token");
    });
  });
});
