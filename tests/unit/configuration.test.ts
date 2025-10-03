import { describe, it, expect, beforeEach, vi } from "vitest";
import CrudifyInstance from "../../src/crudify";
import type { CrudifyEnvType } from "../../src/types";

describe("Configuration", () => {
  describe("config", () => {
    it("should configure dev environment", () => {
      CrudifyInstance.config("dev");

      const ApiMetadata = (CrudifyInstance as any).constructor.ApiMetadata;
      expect(ApiMetadata).toBe("https://auth.dev.crudify.io");
    });

    it("should configure staging environment", () => {
      CrudifyInstance.config("stg");

      const ApiMetadata = (CrudifyInstance as any).constructor.ApiMetadata;
      expect(ApiMetadata).toBe("https://auth.stg.crudify.io");
    });

    it("should configure production environment", () => {
      CrudifyInstance.config("api");

      const ApiMetadata = (CrudifyInstance as any).constructor.ApiMetadata;
      expect(ApiMetadata).toBe("https://auth.api.crudify.io");
    });

    it("should default to api environment when invalid env is provided", () => {
      CrudifyInstance.config("invalid" as CrudifyEnvType);

      const ApiMetadata = (CrudifyInstance as any).constructor.ApiMetadata;
      expect(ApiMetadata).toBe("https://auth.api.crudify.io");
    });
  });

  describe("getLogLevel", () => {
    it("should return default log level", () => {
      const logLevel = CrudifyInstance.getLogLevel();
      expect(logLevel).toBe("none");
    });

    it("should return configured log level after init", async () => {
      // Mock fetch for init
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              apiEndpoint: "https://api.test.com",
              apiKeyEndpoint: "test-key",
            },
          },
        }),
      });

      try {
        await CrudifyInstance.init("test-api-key", "debug");
        const logLevel = CrudifyInstance.getLogLevel();
        expect(logLevel).toBe("debug");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("setResponseInterceptor", () => {
    it("should set response interceptor", () => {
      const interceptor = vi.fn((response) => response);

      CrudifyInstance.setResponseInterceptor(interceptor);

      expect((CrudifyInstance as any).responseInterceptor).toBe(interceptor);
    });

    it("should clear response interceptor when null is passed", () => {
      const interceptor = vi.fn((response) => response);
      CrudifyInstance.setResponseInterceptor(interceptor);

      CrudifyInstance.setResponseInterceptor(null);

      expect((CrudifyInstance as any).responseInterceptor).toBeNull();
    });
  });

  describe("setTokenInvalidationCallback", () => {
    it("should set token invalidation callback", () => {
      const callback = vi.fn();

      CrudifyInstance.setTokenInvalidationCallback(callback);

      expect((CrudifyInstance as any).onTokensInvalidated).toBe(callback);
    });

    it("should clear callback when null is passed", () => {
      const callback = vi.fn();
      CrudifyInstance.setTokenInvalidationCallback(callback);

      CrudifyInstance.setTokenInvalidationCallback(null);

      expect((CrudifyInstance as any).onTokensInvalidated).toBeNull();
    });
  });
});
