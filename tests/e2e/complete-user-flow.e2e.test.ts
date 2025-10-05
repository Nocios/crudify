import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CrudifyInstance from "../../src/crudify";

describe("E2E: Complete User Flow", () => {
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

  it("should complete full application flow: init, login, CRUD operations, logout", async () => {
    // Step 1: Initialize
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

    // Step 2: Login
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

    const loginResult = await CrudifyInstance.login("user@example.com", "password123");
    expect(loginResult.success).toBe(true);

    // Step 3: Get permissions
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              modules: ["users", "posts"],
              actions: ["read", "write"],
            }),
          },
        },
      }),
    });

    const permissionsResult = await CrudifyInstance.getPermissions();
    expect(permissionsResult.success).toBe(true);
    expect(permissionsResult.data?.modules).toContain("users");

    // Step 4: Create item
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "user123", name: "John Doe", email: "john@example.com" }),
          },
        },
      }),
    });

    const createResult = await CrudifyInstance.createItem("users", {
      name: "John Doe",
      email: "john@example.com",
    });
    expect(createResult.success).toBe(true);
    expect(createResult.data?._id).toBe("user123");

    // Step 5: Read item
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "user123", name: "John Doe", email: "john@example.com" }),
          },
        },
      }),
    });

    const readResult = await CrudifyInstance.readItem("users", { _id: "user123" });
    expect(readResult.success).toBe(true);
    expect(readResult.data?.name).toBe("John Doe");

    // Step 6: Update item
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "user123", name: "John Smith", email: "john@example.com" }),
          },
        },
      }),
    });

    const updateResult = await CrudifyInstance.updateItem("users", {
      _id: "user123",
      name: "John Smith",
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.data?.name).toBe("John Smith");

    // Step 7: Read items (list)
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify([
              { _id: "user123", name: "John Smith" },
              { _id: "user456", name: "Jane Doe" },
            ]),
          },
        },
      }),
    });

    const listResult = await CrudifyInstance.readItems("users", {});
    expect(listResult.success).toBe(true);
    expect(listResult.data).toHaveLength(2);

    // Step 8: Delete item
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ deleted: true }),
          },
        },
      }),
    });

    const deleteResult = await CrudifyInstance.deleteItem("users", "user123");
    expect(deleteResult.success).toBe(true);

    // Step 9: Logout
    const logoutResult = await CrudifyInstance.logout();
    expect(logoutResult.success).toBe(true);
    expect(CrudifyInstance.isLogin()).toBe(false);
  });

  it("should handle transaction with multiple operations", async () => {
    // Initialize and login
    await initializeAndLogin(fetchMock);

    // Execute transaction
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify([
              {
                action: "create",
                status: "OK",
                data: { _id: "user1", name: "User 1" },
              },
              {
                action: "create",
                status: "OK",
                data: { _id: "user2", name: "User 2" },
              },
              {
                action: "update",
                status: "OK",
                data: { _id: "user3", name: "Updated User" },
              },
            ]),
          },
        },
      }),
    });

    const transactionResult = await CrudifyInstance.transaction({
      operations: [
        { action: "create", moduleKey: "users", data: { name: "User 1" } },
        { action: "create", moduleKey: "users", data: { name: "User 2" } },
        { action: "update", moduleKey: "users", data: { _id: "user3", name: "Updated User" } },
      ],
    });

    expect(transactionResult.success).toBe(true);
    expect(transactionResult.data).toHaveLength(3);
  });

  it("should handle response interceptor in full flow", async () => {
    const interceptedResponses: any[] = [];

    // Set response interceptor
    CrudifyInstance.setResponseInterceptor((response) => {
      interceptedResponses.push(response);
      return response;
    });

    // Initialize and login
    await initializeAndLogin(fetchMock);

    // Perform CRUD operation
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "123", name: "Test" }),
          },
        },
      }),
    });

    await CrudifyInstance.readItem("users", { _id: "123" });

    // Verify interceptor was called
    expect(interceptedResponses.length).toBeGreaterThan(0);
  });

  it("should handle file upload flow with signed URL", async () => {
    // Initialize and login
    await initializeAndLogin(fetchMock);

    // Generate signed URL
    const mockSignedUrl = "https://s3.amazonaws.com/bucket/file.jpg?signature=xyz";

    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ url: mockSignedUrl }),
          },
        },
      }),
    });

    const signedUrlResult = await CrudifyInstance.generateSignedUrl({
      fileName: "profile.jpg",
      contentType: "image/jpeg",
    });

    expect(signedUrlResult.success).toBe(true);
    expect(signedUrlResult.data).toBe(mockSignedUrl);

    // Simulate uploading to signed URL (external fetch, not mocked here)
    // In real scenario: await fetch(signedUrlResult.data, { method: 'PUT', body: fileData })

    // Create user with uploaded file reference
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              _id: "user123",
              name: "John",
              profileImage: mockSignedUrl.split("?")[0],
            }),
          },
        },
      }),
    });

    const createUserResult = await CrudifyInstance.createItem("users", {
      name: "John",
      profileImage: mockSignedUrl.split("?")[0],
    });

    expect(createUserResult.success).toBe(true);
    expect(createUserResult.data?.profileImage).toBeDefined();
  });

  it("should handle abort signal to cancel requests", async () => {
    // Initialize and login
    await initializeAndLogin(fetchMock);

    const controller = new AbortController();

    // Setup slow response
    let resolveRequest: any;
    const slowRequest = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    fetchMock.mockImplementationOnce(() => slowRequest);

    // Start request
    const requestPromise = CrudifyInstance.readItem("users", { _id: "123" }, { signal: controller.signal });

    // Abort after 10ms
    setTimeout(() => {
      controller.abort();
    }, 10);

    // Eventually resolve the mock (but it should be aborted)
    setTimeout(() => {
      resolveRequest({
        json: async () => ({
          data: {
            response: {
              status: "OK",
              data: JSON.stringify({ _id: "123" }),
            },
          },
        }),
      });
    }, 100);

    // Note: The actual abort behavior depends on fetch implementation
    // In real browser, this would throw AbortError
    // In our mock, we just verify the signal was passed
    try {
      await requestPromise;
    } catch (error) {
      // Expected to potentially throw abort error
    }

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
      })
    );
  });

  it("should handle public API operations without authentication", async () => {
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

    // Get public structure (no auth required)
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({
              modules: {
                posts: { fields: { title: { type: "string" } } },
              },
            }),
          },
        },
      }),
    });

    const structureResult = await CrudifyInstance.getStructurePublic();
    expect(structureResult.success).toBe(true);
    expect(structureResult.data?.modules?.posts).toBeDefined();

    // Create public item
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          response: {
            status: "OK",
            data: JSON.stringify({ _id: "post123", title: "Public Post" }),
          },
        },
      }),
    });

    const createResult = await CrudifyInstance.createItemPublic("posts", {
      title: "Public Post",
    });

    expect(createResult.success).toBe(true);
    expect(CrudifyInstance.isLogin()).toBe(false); // Should not be authenticated
  });
});

// Helper functions
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

async function initializeAndLogin(fetchMock: any): Promise<void> {
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

  // Login
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
}
