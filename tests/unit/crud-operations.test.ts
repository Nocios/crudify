import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("CRUD Operations", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    // Save original fetch
    originalFetch = globalThis.fetch;

    // Reset instance state
    (CrudifyInstance as any).token = "";
    (CrudifyInstance as any).refreshToken = "";
    (CrudifyInstance as any).tokenExpiresAt = 0;
    (CrudifyInstance as any).refreshExpiresAt = 0;

    // Initialize
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

    // Set valid token
    const futureTime = Math.floor(Date.now() / 1000) + 3600;
    const payload = {
      sub: "user123",
      exp: futureTime,
      type: "access",
    };
    const validToken = `header.${btoa(JSON.stringify(payload))}.signature`;

    (CrudifyInstance as any).token = validToken;
    (CrudifyInstance as any).tokenExpiresAt = Date.now() + 3600000;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("createItem", () => {
    it("should create item successfully", async () => {
      const mockItem = { id: "123", name: "Test Item" };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItem),
            },
          },
        }),
      });

      const result = await CrudifyInstance.createItem("users", { name: "Test Item" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it("should handle validation errors", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "FIELD_ERROR",
              data: JSON.stringify([
                { path: ["name"], message: "Name is required" },
                { path: ["email"], message: "Invalid email format" },
              ]),
            },
          },
        }),
      });

      const result = await CrudifyInstance.createItem("users", {});

      expect(result.success).toBe(false);
      expect(result.errors?.name).toContain("Name is required");
      expect(result.errors?.email).toContain("Invalid email format");
    });

    it("should throw error when not initialized", async () => {
      (CrudifyInstance as any).endpoint = "";

      await expect(CrudifyInstance.createItem("users", {})).rejects.toThrow(
        "Not initialized"
      );
    });
  });

  describe("createItemPublic", () => {
    it("should create item with public API", async () => {
      const mockItem = { id: "456", title: "Public Item" };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItem),
            },
          },
        }),
      });

      const result = await CrudifyInstance.createItemPublic("posts", { title: "Public Item" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });
  });

  describe("readItem", () => {
    it("should read item by ID successfully", async () => {
      const mockItem = { _id: "123", name: "Test Item", email: "test@example.com" };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItem),
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItem("users", { _id: "123" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });

    it("should handle item not found", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ITEM_NOT_FOUND",
              data: null,
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItem("users", { _id: "nonexistent" });

      expect(result.success).toBe(false);
      expect(result.errors?._id).toContain("ITEM_NOT_FOUND");
    });

    it("should read item with custom filter", async () => {
      const mockItem = { _id: "123", email: "test@example.com" };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItem),
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItem("users", { email: "test@example.com" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItem);
    });
  });

  describe("readItems", () => {
    it("should read multiple items successfully", async () => {
      const mockItems = [
        { _id: "1", name: "Item 1" },
        { _id: "2", name: "Item 2" },
        { _id: "3", name: "Item 3" },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItems),
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItems("users", {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItems);
      expect(result.data).toHaveLength(3);
    });

    it("should read items with filter", async () => {
      const mockItems = [{ _id: "1", status: "active" }];

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockItems),
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItems("users", { status: "active" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItems);
    });

    it("should return empty array when no items found", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify([]),
            },
          },
        }),
      });

      const result = await CrudifyInstance.readItems("users", { status: "deleted" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe("updateItem", () => {
    it("should update item successfully", async () => {
      const updatedItem = { _id: "123", name: "Updated Name" };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(updatedItem),
            },
          },
        }),
      });

      const result = await CrudifyInstance.updateItem("users", {
        _id: "123",
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedItem);
    });

    it("should handle validation errors on update", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "FIELD_ERROR",
              data: JSON.stringify([{ path: ["email"], message: "Invalid email" }]),
            },
          },
        }),
      });

      const result = await CrudifyInstance.updateItem("users", {
        _id: "123",
        email: "invalid",
      });

      expect(result.success).toBe(false);
      expect(result.errors?.email).toContain("Invalid email");
    });

    it("should handle item not found on update", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ITEM_NOT_FOUND",
              data: null,
            },
          },
        }),
      });

      const result = await CrudifyInstance.updateItem("users", {
        _id: "nonexistent",
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.errors?._id).toContain("ITEM_NOT_FOUND");
    });
  });

  describe("deleteItem", () => {
    it("should delete item successfully", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({ deleted: true }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.deleteItem("users", "123");

      expect(result.success).toBe(true);
    });

    it("should handle item not found on delete", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ITEM_NOT_FOUND",
              data: null,
            },
          },
        }),
      });

      const result = await CrudifyInstance.deleteItem("users", "nonexistent");

      expect(result.success).toBe(false);
      expect(result.errors?._id).toContain("ITEM_NOT_FOUND");
    });
  });

  describe("transaction", () => {
    it("should execute transaction successfully", async () => {
      const transactionResult = [
        { action: "create", status: "OK", data: { _id: "1" } },
        { action: "update", status: "OK", data: { _id: "2" } },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(transactionResult),
            },
          },
        }),
      });

      const result = await CrudifyInstance.transaction({
        operations: [
          { action: "create", moduleKey: "users", data: { name: "User 1" } },
          { action: "update", moduleKey: "users", data: { _id: "2", name: "Updated" } },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(transactionResult);
    });

    it("should handle partial transaction failure", async () => {
      const transactionResult = [
        { action: "create", status: "OK", data: { _id: "1" } },
        { action: "update", status: "ERROR", errors: { _id: ["ITEM_NOT_FOUND"] } },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "ERROR",
              data: JSON.stringify(transactionResult),
            },
          },
        }),
      });

      const result = await CrudifyInstance.transaction({
        operations: [
          { action: "create", moduleKey: "users", data: { name: "User 1" } },
          { action: "update", moduleKey: "users", data: { _id: "999", name: "Updated" } },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.errors?._transaction).toContain("ONE_OR_MORE_OPERATIONS_FAILED");
    });
  });

  describe("getPermissions", () => {
    it("should get user permissions successfully", async () => {
      const mockPermissions = {
        modules: ["users", "posts"],
        actions: ["read", "write", "delete"],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockPermissions),
            },
          },
        }),
      });

      const result = await CrudifyInstance.getPermissions();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPermissions);
    });
  });

  describe("getStructure", () => {
    it("should get structure successfully", async () => {
      const mockStructure = {
        modules: {
          users: {
            fields: {
              name: { type: "string" },
              email: { type: "email" },
            },
          },
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockStructure),
            },
          },
        }),
      });

      const result = await CrudifyInstance.getStructure();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStructure);
    });
  });

  describe("getStructurePublic", () => {
    it("should get public structure successfully", async () => {
      const mockStructure = {
        modules: {
          posts: { fields: { title: { type: "string" } } },
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify(mockStructure),
            },
          },
        }),
      });

      const result = await CrudifyInstance.getStructurePublic();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStructure);
    });
  });

  describe("generateSignedUrl", () => {
    it("should generate signed URL successfully", async () => {
      const mockUrl = "https://s3.amazonaws.com/bucket/file.jpg?signature=xyz";

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({ url: mockUrl }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.generateSignedUrl({
        fileName: "file.jpg",
        contentType: "image/jpeg",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockUrl);
    });

    it("should throw error when not authenticated", async () => {
      (CrudifyInstance as any).token = "";

      await expect(
        CrudifyInstance.generateSignedUrl({
          fileName: "file.jpg",
          contentType: "image/jpeg",
        })
      ).rejects.toThrow("Not initialized");
    });
  });

  describe("AbortSignal support", () => {
    it("should support abort signal in createItem", async () => {
      const controller = new AbortController();

      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({ id: "123" }),
            },
          },
        }),
      });

      const result = await CrudifyInstance.createItem(
        "users",
        { name: "Test" },
        { signal: controller.signal }
      );

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        })
      );
    });
  });
});
