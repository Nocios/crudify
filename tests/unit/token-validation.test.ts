import { describe, it, expect, beforeEach, vi } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("Token Validation", () => {
  beforeEach(() => {
    // Reset instance state before each test
    (CrudifyInstance as any).token = "";
    (CrudifyInstance as any).refreshToken = "";
    (CrudifyInstance as any).tokenExpiresAt = 0;
    (CrudifyInstance as any).refreshExpiresAt = 0;
  });

  describe("isLogin", () => {
    it("should return false when no token is set", () => {
      expect(CrudifyInstance.isLogin()).toBe(false);
    });

    it("should return false for invalid JWT format", () => {
      (CrudifyInstance as any).token = "invalid-token";
      expect(CrudifyInstance.isLogin()).toBe(false);
    });

    it("should return false for expired token", () => {
      // Create an expired token (expired 1 hour ago)
      const expiredTime = Math.floor(Date.now() / 1000) - 3600;
      const payload = {
        sub: "user123",
        exp: expiredTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      (CrudifyInstance as any).token = fakeToken;

      expect(CrudifyInstance.isLogin()).toBe(false);
    });

    it("should return true for valid token", () => {
      // Create a valid token (expires in 1 hour)
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      (CrudifyInstance as any).token = fakeToken;

      expect(CrudifyInstance.isLogin()).toBe(true);
    });

    it("should return false for refresh token instead of access token", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "refresh",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;
      (CrudifyInstance as any).token = fakeToken;

      expect(CrudifyInstance.isLogin()).toBe(false);
    });
  });

  describe("getTokenData", () => {
    it("should return default values when no tokens are set", () => {
      const tokenData = CrudifyInstance.getTokenData();

      expect(tokenData.accessToken).toBe("");
      expect(tokenData.refreshToken).toBe("");
      expect(tokenData.expiresAt).toBe(0);
      expect(tokenData.refreshExpiresAt).toBe(0);
      expect(tokenData.isValid).toBe(false);
    });

    it("should return correct token data when tokens are set", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const expiresAt = Date.now() + 900000; // 15 min
      const refreshExpiresAt = Date.now() + 604800000; // 7 days

      (CrudifyInstance as any).token = fakeToken;
      (CrudifyInstance as any).refreshToken = "refresh-token";
      (CrudifyInstance as any).tokenExpiresAt = expiresAt;
      (CrudifyInstance as any).refreshExpiresAt = refreshExpiresAt;

      const tokenData = CrudifyInstance.getTokenData();

      expect(tokenData.accessToken).toBe(fakeToken);
      expect(tokenData.refreshToken).toBe("refresh-token");
      expect(tokenData.expiresAt).toBe(expiresAt);
      expect(tokenData.refreshExpiresAt).toBe(refreshExpiresAt);
      expect(tokenData.isValid).toBe(true);
    });

    it("should detect when token will expire soon", () => {
      // Token expires in 3 minutes (within the 5-minute "normal" buffer)
      const futureTime = Math.floor(Date.now() / 1000) + 180;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const expiresAt = Date.now() + 180000; // 3 min
      (CrudifyInstance as any).token = fakeToken;
      (CrudifyInstance as any).tokenExpiresAt = expiresAt;

      const tokenData = CrudifyInstance.getTokenData();

      expect(tokenData.willExpireSoon).toBe(true);
    });
  });

  describe("setTokens", () => {
    it("should set tokens correctly", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const expiresAt = Date.now() + 900000;
      const refreshExpiresAt = Date.now() + 604800000;

      CrudifyInstance.setTokens({
        accessToken: fakeToken,
        refreshToken: "refresh-token",
        expiresAt,
        refreshExpiresAt,
      });

      const tokenData = CrudifyInstance.getTokenData();
      expect(tokenData.accessToken).toBe(fakeToken);
      expect(tokenData.refreshToken).toBe("refresh-token");
      expect(tokenData.isValid).toBe(true);
    });

    it("should clear tokens if invalid token is provided", () => {
      CrudifyInstance.setTokens({
        accessToken: "invalid-token",
        refreshToken: "refresh-token",
      });

      const tokenData = CrudifyInstance.getTokenData();
      expect(tokenData.accessToken).toBe("");
      expect(tokenData.refreshToken).toBe("");
      expect(tokenData.isValid).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear all tokens", async () => {
      // Set some tokens first
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload = {
        sub: "user123",
        exp: futureTime,
        type: "access",
      };
      const fakeToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      (CrudifyInstance as any).token = fakeToken;
      (CrudifyInstance as any).refreshToken = "refresh-token";
      (CrudifyInstance as any).tokenExpiresAt = Date.now() + 900000;
      (CrudifyInstance as any).refreshExpiresAt = Date.now() + 604800000;

      const result = await CrudifyInstance.logout();

      expect(result.success).toBe(true);
      expect(CrudifyInstance.isLogin()).toBe(false);

      const tokenData = CrudifyInstance.getTokenData();
      expect(tokenData.accessToken).toBe("");
      expect(tokenData.refreshToken).toBe("");
    });
  });

  describe("isTokenRefreshInProgress", () => {
    it("should return false when no refresh is in progress", () => {
      expect(CrudifyInstance.isTokenRefreshInProgress()).toBe(false);
    });
  });
});
