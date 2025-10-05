# @nocios/crudify-browser - Complete Documentation

**Comprehensive API SDK reference for browser environments**

## Table of Contents

- [Introduction](#introduction)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Authentication](#authentication)
- [CRUD Operations](#crud-operations)
- [Public API Operations](#public-api-operations)
- [Transaction Support](#transaction-support)
- [File Management](#file-management)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Security Features](#security-features)
- [TypeScript Support](#typescript-support)
- [Performance Optimization](#performance-optimization)
- [Migration Guide](#migration-guide)
- [API Reference](#api-reference)

## Introduction

@nocios/crudify-browser is a lightweight, zero-dependency JavaScript SDK designed for browser environments. It provides complete access to the Crudify GraphQL API with modern authentication patterns, comprehensive CRUD operations, and advanced features like transactions and file management.

### Core Principles

- **Zero Dependencies:** Completely standalone with no external dependencies
- **TypeScript First:** Full type safety with comprehensive type definitions
- **Security Focused:** Modern authentication patterns with secure token management
- **Performance Optimized:** Minimal bundle size with efficient API communication
- **Browser Native:** Built specifically for browser environments with Web APIs

### Key Features

- **Complete CRUD Operations:** Create, Read, Update, Delete with advanced querying
- **Modern Authentication:** JWT with refresh token pattern and automatic renewal
- **Transaction Support:** Atomic operations across multiple collections
- **File Management:** Signed URL generation for secure file uploads/downloads
- **Multi-Environment:** Support for development, staging, and production environments
- **Request Cancellation:** AbortController support for canceling requests
- **Error Handling:** Comprehensive error management with detailed error information

## Architecture

### SDK Structure

```
@nocios/crudify-browser/
├── src/
│   ├── crudify.ts           # Main SDK class
│   ├── types.ts             # TypeScript type definitions
│   └── utils.ts             # Utility functions
└── dist/
    ├── index.js             # CommonJS build
    ├── index.mjs            # ES module build
    ├── index.global.js      # IIFE build for CDN
    └── index.d.ts           # TypeScript definitions
```

### Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Crudify SDK Class                       │
├─────────────────────────────────────────────────────────────┤
│  Authentication Layer                                       │
│  ├── Token Management                                       │
│  ├── Automatic Refresh                                      │
│  └── Session Persistence                                    │
├─────────────────────────────────────────────────────────────┤
│  API Communication Layer                                    │
│  ├── GraphQL Query Builder                                  │
│  ├── Request/Response Handling                              │
│  └── Error Processing                                       │
├─────────────────────────────────────────────────────────────┤
│  Browser Integration                                        │
│  ├── Fetch API                                             │
│  ├── AbortController                                        │
│  └── LocalStorage/SessionStorage                           │
└─────────────────────────────────────────────────────────────┘
```

## Installation & Setup

### Basic Installation

```bash
npm install @nocios/crudify-browser
```

No additional dependencies required - the SDK is completely standalone.

### CDN Usage

```html
<!-- IIFE build for direct browser use -->
<script src="https://unpkg.com/@nocios/crudify-browser@latest/dist/index.global.js"></script>
<script>
  const crudify = new window.Crudify();
</script>
```

### ES Modules

```javascript
// ES module import
import { Crudify } from "@nocios/crudify-browser";

// Or default export
import Crudify from "@nocios/crudify-browser";
```

### CommonJS

```javascript
// CommonJS require
const { Crudify } = require("@nocios/crudify-browser");

// Or default export
const Crudify = require("@nocios/crudify-browser").default;
```

### Basic Setup

```javascript
import { Crudify } from "@nocios/crudify-browser";

// Create instance
const crudify = new Crudify({
  environment: "dev", // 'dev', 'stg', 'prod'
  logLevel: "error", // 'debug', 'error', 'silent'
});

// Initialize with API key
async function initialize() {
  try {
    await crudify.init("your-public-api-key");
    console.log("Crudify SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

initialize();
```

## Authentication

### Login Process

```javascript
// Basic login
try {
  const result = await crudify.login({
    email: "user@example.com",
    password: "securePassword123",
  });

  console.log("Login successful:", result);
  // Result contains: { user, accessToken, refreshToken, expiresIn }
} catch (error) {
  console.error("Login failed:", error);
}
```

### Advanced Login with Options

```javascript
// Login with additional options
const result = await crudify.login(
  {
    email: "user@example.com",
    password: "securePassword123",
  },
  {
    rememberMe: true, // Extended session duration
    deviceName: "My Device", // Device identification
    signal: abortController.signal, // Request cancellation
  }
);
```

### Token Management

```javascript
// Set tokens manually (e.g., from stored values)
crudify.setTokens({
  accessToken: "your-access-token",
  refreshToken: "your-refresh-token",
});

// Get current tokens
const tokens = crudify.getTokens();
console.log("Current tokens:", tokens);

// Refresh access token manually
try {
  await crudify.refreshAccessToken();
  console.log("Token refreshed successfully");
} catch (error) {
  console.error("Token refresh failed:", error);
}

// Logout and clear tokens
await crudify.logout();
```

### Automatic Token Refresh

```javascript
// The SDK automatically refreshes tokens before expiration
// You can configure the refresh behavior:

const crudify = new Crudify({
  environment: "dev",
  autoRefresh: true, // Enable automatic refresh (default: true)
  refreshThreshold: 300, // Refresh 5 minutes before expiration (default: 300)
});
```

## CRUD Operations

### Create Operations

```javascript
// Create single item
try {
  const newUser = await crudify.createItem("users", {
    name: "John Doe",
    email: "john@example.com",
    role: "editor",
  });

  console.log("User created:", newUser);
} catch (error) {
  console.error("Failed to create user:", error);
}

// Create with request options
const newUser = await crudify.createItem("users", userData, {
  signal: abortController.signal, // Cancellation support
});
```

### Read Operations

```javascript
// Read single item by ID
const user = await crudify.readItem("users", "user-id-123");

// Read multiple items with filtering and pagination
const users = await crudify.readItems("users", {
  filter: {
    // ✅ Usar "filter" (singular)
    role: "editor",
    isActive: true,
    createdAt: {
      $gte: "2024-01-01T00:00:00Z",
    },
  },
  pagination: {
    page: 1,
    limit: 20, // Default: 20 items per page
  },
  sort: {
    createdAt: -1,
    name: 1,
  },
});

console.log("Users found:", users.data.items);
console.log("Total count:", users.data.total);

// ⚡ Get ALL results without pagination
const allUsers = await crudify.readItems("users", {
  filter: { isActive: true },
  pagination: {
    limit: 0, // ✅ limit: 0 returns ALL results (no pagination)
  },
  sort: { name: 1 },
});

console.log("All users:", allUsers.data.items.length);

// Read with populated references
const orders = await crudify.readItems("orders", {
  filter: { status: "pending" },
  populate: [
    {
      path: "customerId", // Field to populate
      moduleKey: "customers", // Referenced module
      select: ["name", "email"], // Fields to include (array or string)
    },
    {
      path: "productIds", // Works with arrays too
      moduleKey: "products",
      select: "name price stock", // String with space-separated fields
    },
  ],
  pagination: { page: 1, limit: 10 },
  sort: { createdAt: -1 },
});

// Access populated data
orders.data.items.forEach((order) => {
  console.log("Customer:", order.customerId?.name);
  console.log(
    "Products:",
    order.productIds?.map((p) => p.name)
  );
});
```

### Advanced Filtering

```javascript
// Complex filtering with MongoDB-style operators
const users = await crudify.readItems("users", {
  filter: {
    // ✅ Use "filter" (singular)
    // Text search
    name: { $regex: "John", $options: "i" },

    // Numeric comparisons
    age: { $gte: 18, $lte: 65 },

    // Array operations
    roles: { $in: ["admin", "editor"] },
    permissions: { $all: ["read", "write"] },

    // Date operations
    createdAt: {
      $gte: new Date("2024-01-01"),
      $lt: new Date("2024-12-31"),
    },

    // Logical operators
    $or: [{ status: "active" }, { lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }],
  },
  pagination: {
    page: 1,
    limit: 50,
  },
});
```

### Update Operations

```javascript
// Update single item
const updatedUser = await crudify.updateItem("users", "user-id-123", {
  name: "John Smith",
  lastModified: new Date().toISOString(),
});

// Partial updates with MongoDB operators
const result = await crudify.updateItem("users", "user-id-123", {
  $set: {
    name: "New Name",
    updatedAt: new Date().toISOString(),
  },
  $push: {
    loginHistory: {
      timestamp: new Date(),
      ip: "192.168.1.1",
    },
  },
  $inc: {
    loginCount: 1,
  },
});
```

### Delete Operations

```javascript
// Delete single item
await crudify.deleteItem("users", "user-id-123");

// Soft delete (if supported by your schema)
await crudify.updateItem("users", "user-id-123", {
  isDeleted: true,
  deletedAt: new Date().toISOString(),
});
```

## Public API Operations

Some operations don't require authentication and can be performed with just an API key:

```javascript
// Get collection structure (public)
const structure = await crudify.getStructurePublic("users");
console.log("Collection schema:", structure);

// Create public item (if allowed by collection settings)
const publicItem = await crudify.createItemPublic("feedback", {
  message: "Great product!",
  rating: 5,
  timestamp: new Date().toISOString(),
});

// Read public items
const publicPosts = await crudify.readItemsPublic("blog-posts", {
  filter: { published: true }, // ✅ Use "filter" (singular)
  pagination: { page: 1, limit: 10 },
});
```

## Transaction Support

Execute multiple operations atomically:

```javascript
// Define transaction operations
const operations = [
  {
    type: "create",
    collection: "orders",
    data: {
      customerId: "customer-123",
      total: 99.99,
      items: [{ productId: "prod-1", quantity: 2, price: 49.99 }],
    },
  },
  {
    type: "update",
    collection: "inventory",
    id: "prod-1",
    data: {
      $inc: { quantity: -2 },
    },
  },
  {
    type: "update",
    collection: "customers",
    id: "customer-123",
    data: {
      $inc: { totalOrders: 1 },
      $set: { lastOrderDate: new Date().toISOString() },
    },
  },
];

// Execute transaction
try {
  const results = await crudify.transaction(operations);
  console.log("Transaction completed:", results);
} catch (error) {
  console.error("Transaction failed:", error);
  // All operations are rolled back automatically
}
```

## File Management

### Generate Signed URLs

```javascript
// Generate upload URL
const uploadUrl = await crudify.generateSignedUrl(
  "uploads/user-avatar.jpg", // File key
  "upload", // Operation: 'upload' or 'download'
  3600 // Expires in 1 hour (optional)
);

// Upload file to S3
const file = document.getElementById("fileInput").files[0];
const response = await fetch(uploadUrl, {
  method: "PUT",
  body: file,
  headers: {
    "Content-Type": file.type,
  },
});

if (response.ok) {
  console.log("File uploaded successfully");

  // Save file reference in your data
  await crudify.updateItem("users", userId, {
    avatar: "uploads/user-avatar.jpg",
  });
}
```

### Download Files

```javascript
// Generate download URL
const downloadUrl = await crudify.generateSignedUrl(
  "uploads/user-avatar.jpg",
  "download",
  300 // 5 minutes expiration
);

// Create download link
const link = document.createElement("a");
link.href = downloadUrl;
link.download = "avatar.jpg";
link.click();
```

## Error Handling

### Error Types

The SDK provides detailed error information:

```javascript
try {
  await crudify.createItem("users", invalidData);
} catch (error) {
  console.log("Error type:", error.name); // 'CrudifyError'
  console.log("Error message:", error.message); // Human-readable message
  console.log("Error code:", error.code); // Error code
  console.log("Status code:", error.statusCode); // HTTP status code
  console.log("Field errors:", error.fieldErrors); // Validation errors

  // Handle specific error types
  switch (error.code) {
    case "VALIDATION_ERROR":
      // Handle validation errors
      error.fieldErrors?.forEach((fieldError) => {
        console.log(`${fieldError.field}: ${fieldError.message}`);
      });
      break;

    case "UNAUTHORIZED":
      // Handle authentication errors
      console.log("Please log in again");
      break;

    case "NETWORK_ERROR":
      // Handle network errors
      console.log("Check your internet connection");
      break;

    default:
      // Handle other errors
      console.log("An unexpected error occurred");
  }
}
```

### Global Error Handler

```javascript
// Set global error handler
crudify.setErrorHandler((error, context) => {
  console.error("Global error handler:", error);
  console.log("Error context:", context);

  // Log to external service
  errorLogger.log(error, context);

  // Show user-friendly message
  showNotification("An error occurred. Please try again.");
});
```

## Configuration

### Environment Configuration

```javascript
// Environment-specific configuration
const crudify = new Crudify({
  environment: "prod", // 'dev', 'stg', 'prod'
  logLevel: "error", // 'debug', 'error', 'silent'
  timeout: 30000, // Request timeout in milliseconds
  retryAttempts: 3, // Number of retry attempts for failed requests
  retryDelay: 1000, // Delay between retry attempts
});
```

### Custom Configuration

```javascript
// Override default endpoints
const crudify = new Crudify({
  environment: "custom",
  endpoints: {
    api: "https://your-custom-api.com/graphql",
    metadata: "https://your-custom-metadata.com",
  },
  headers: {
    "Custom-Header": "custom-value",
  },
});
```

### Request Interceptors

```javascript
// Add request interceptor
crudify.addRequestInterceptor((config) => {
  // Modify request config
  config.headers["X-Custom-Header"] = "value";
  return config;
});

// Add response interceptor
crudify.addResponseInterceptor((response) => {
  // Process response
  console.log("API response:", response);
  return response;
});
```

## Security Features

### Secure Token Storage

```javascript
// The SDK automatically handles secure token storage
// Tokens are encrypted and stored securely in browser storage

// Configure storage options
const crudify = new Crudify({
  environment: "prod",
  storage: {
    type: "sessionStorage", // 'localStorage' or 'sessionStorage'
    encrypt: true, // Encrypt stored tokens (default: true)
    prefix: "myapp_", // Storage key prefix
  },
});
```

### Request Security

```javascript
// All requests include security headers
// CSRF protection, secure headers, etc. are handled automatically

// Custom security configuration
const crudify = new Crudify({
  environment: "prod",
  security: {
    csrfProtection: true, // Enable CSRF protection
    validateSSL: true, // Validate SSL certificates
    timeoutLimit: 30000, // Request timeout limit
  },
});
```

## TypeScript Support

### Complete Type Safety

```typescript
import { Crudify, CrudifyResponse, CrudifyError } from "@nocios/crudify-browser";

// Define your data interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
}

interface CreateUserData {
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

// Type-safe CRUD operations
const crudify = new Crudify({ environment: "dev" });

// Create with type safety
const newUser: CrudifyResponse<User> = await crudify.createItem<User, CreateUserData>("users", {
  name: "John Doe",
  email: "john@example.com",
  role: "editor",
});

// Read with type safety
const users: CrudifyResponse<User[]> = await crudify.readItems<User>("users");

// Type-safe error handling
try {
  await crudify.createItem("users", userData);
} catch (error: CrudifyError) {
  if (error.code === "VALIDATION_ERROR") {
    error.fieldErrors?.forEach((fieldError) => {
      console.log(`${fieldError.field}: ${fieldError.message}`);
    });
  }
}
```

### Custom Type Extensions

```typescript
// Extend SDK types for your specific use case
declare module "@nocios/crudify-browser" {
  interface CrudifyConfig {
    customOption?: string;
  }

  interface User {
    customField?: string;
  }
}

// Now these fields are recognized by TypeScript
const crudify = new Crudify({
  environment: "dev",
  customOption: "custom-value",
});
```

## Performance Optimization

### Request Caching

```javascript
// Enable request caching
const crudify = new Crudify({
  environment: "prod",
  cache: {
    enabled: true,
    ttl: 300000, // Cache TTL in milliseconds (5 minutes)
    maxSize: 100, // Maximum cache entries
  },
});

// Cached requests
const users = await crudify.readItems("users"); // Fetches from API
const cachedUsers = await crudify.readItems("users"); // Returns from cache
```

### Request Deduplication

```javascript
// Automatic request deduplication
// Multiple identical requests made simultaneously will be deduplicated

// These three requests will be merged into one
const promise1 = crudify.readItems("users");
const promise2 = crudify.readItems("users");
const promise3 = crudify.readItems("users");

const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
// All three results are identical and come from a single API call
```

### Batch Operations

```javascript
// Batch multiple operations for better performance
const batchOperations = [
  { type: "read", collection: "users", id: "user-1" },
  { type: "read", collection: "users", id: "user-2" },
  { type: "update", collection: "posts", id: "post-1", data: { views: 100 } },
];

const results = await crudify.batch(batchOperations);
```

## Migration Guide

### Upgrading from v3.x to v4.x

#### Breaking Changes

1. **Constructor Parameters:**

   ```javascript
   // Old (v3.x)
   const crudify = new Crudify("dev", "debug");

   // New (v4.x)
   const crudify = new Crudify({
     environment: "dev",
     logLevel: "debug",
   });
   ```

2. **Error Handling:**

   ```javascript
   // Old (v3.x)
   catch (error) {
     console.log(error.response?.data);
   }

   // New (v4.x)
   catch (error) {
     console.log(error.fieldErrors);
   }
   ```

3. **Response Format:**

   ```javascript
   // Old (v3.x)
   const response = await crudify.readItems("users");
   const users = response.data.items;

   // New (v4.x)
   const response = await crudify.readItems("users");
   const users = response.data; // Direct access to data
   ```

#### Migration Steps

1. **Update Dependencies:**

   ```bash
   npm install @nocios/crudify-browser@latest
   ```

2. **Update Constructor Calls:**

   ```javascript
   // Update all constructor calls to use object parameter
   const crudify = new Crudify({
     environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
     logLevel: "error",
   });
   ```

3. **Update Error Handling:**
   ```javascript
   // Update catch blocks to use new error structure
   catch (error) {
     if (error.fieldErrors) {
       // Handle validation errors
       error.fieldErrors.forEach(fieldError => {
         console.log(`${fieldError.field}: ${fieldError.message}`);
       });
     }
   }
   ```

## API Reference

### Constructor Options

```typescript
interface CrudifyConfig {
  environment: "dev" | "stg" | "prod" | "custom";
  logLevel?: "debug" | "error" | "silent";
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  autoRefresh?: boolean;
  refreshThreshold?: number;
  endpoints?: {
    api?: string;
    metadata?: string;
  };
  headers?: Record<string, string>;
  storage?: {
    type?: "localStorage" | "sessionStorage";
    encrypt?: boolean;
    prefix?: string;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };
}
```

### Method Signatures

#### Authentication Methods

```typescript
// Initialize SDK
init(apiKey: string, logLevel?: string): Promise<void>

// Login
login(credentials: LoginCredentials, options?: LoginOptions): Promise<AuthResult>

// Logout
logout(): Promise<void>

// Token management
setTokens(tokens: TokenPair): void
getTokens(): TokenPair | null
refreshAccessToken(): Promise<void>
```

#### CRUD Methods

```typescript
// Create
createItem<T, D>(collection: string, data: D, options?: RequestOptions): Promise<CrudifyResponse<T>>
createItemPublic<T, D>(collection: string, data: D, options?: RequestOptions): Promise<CrudifyResponse<T>>

// Read
readItem<T>(collection: string, id: string, options?: RequestOptions): Promise<T | null>
readItems<T>(collection: string, query?: QueryOptions, options?: RequestOptions): Promise<CrudifyResponse<T[]>>
readItemsPublic<T>(collection: string, query?: QueryOptions, options?: RequestOptions): Promise<CrudifyResponse<T[]>>

// Update
updateItem<T>(collection: string, id: string, data: Partial<T>, options?: RequestOptions): Promise<CrudifyResponse<T>>

// Delete
deleteItem(collection: string, id: string, options?: RequestOptions): Promise<void>
```

#### Utility Methods

```typescript
// File management
generateSignedUrl(key: string, operation: 'upload' | 'download', expiresIn?: number): Promise<string>

// Transactions
transaction(operations: TransactionOperation[]): Promise<TransactionResult[]>

// Metadata
getStructure(collection: string): Promise<CollectionStructure>
getStructurePublic(collection: string): Promise<CollectionStructure>
getPermissions(): Promise<string[]>
```

### Type Definitions

```typescript
interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface CrudifyResponse<T> {
  data: T;
  success: boolean;
  errors?: FieldError[];
}

interface QueryOptions {
  filter?: Record<string, any>; // ✅ Use "filter" (singular)
  pagination?: {
    page?: number; // Page number (default: 1)
    limit?: number; // Items per page (default: 20, use 0 for all items)
  };
  sort?: Record<string, 1 | -1>;
  populate?: Array<{
    path: string; // Field to populate
    moduleKey: string; // Referenced module
    select: string | string[]; // Fields to include
  }>;
}

interface RequestOptions {
  signal?: AbortSignal;
}
```

---

For additional information and support:

- **[GitHub Repository](https://github.com/nocios/crudify-browser)**
- **[Security Guide](docs/security.md)**
- **[Examples Collection](docs/examples.md)**
- **[Architecture Details](docs/architecture.md)**

Need help? Contact: support@nocios.com
