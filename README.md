# Welcome

Welcome to **Crudify**, the lightweight JavaScript SDK for interacting with the Crudify GraphQL API. With this library, you can easily perform authentication, permission checks, and all CRUD operations (Create, Read, Update, Delete) as well as transactional batch operations against your serverless backend.

Key features:

- Simple, chainable API
- Built‑in authentication and token handling
- Single‑call GraphQL mutations and queries
- Transaction support for batched operations
- Configurable log levels (`none`, `debug`)

**Result Statuses:**

- **Success (no warnings):** operation completed without warnings; all fields processed correctly.
- **Success (with warnings):** operation succeeded but some fields generated warnings; review the `fieldsWarning` array.
- **Failure:** operation failed; check the `errors` object for validation or processing errors.

# Getting Started

## Installation

Install via npm:

```bash
npm install @nocios/crudify
```

## Initialization

Import and initialize the SDK with your **public API key** and optional log level:

```ts
import crudify from "@nocios/crudify";

// Initialize with your subscriber public key; logLevel defaults to 'debug'
crudify.init("YOUR_PUBLIC_API_KEY", "info");
```

# Authentication & Permission

## `login(email: string, password: string): Promise<ResponseType>`

**Description:**  
Authenticate a user and store the returned JWT token internally.

```ts
const result = await crudify.login("user@example.com", "SuperSecret123!");
```

**Sample Response (Success):**

```json
{ "success": true }
```

**Sample Response (Error):**

```json
{ "success": false, "errors": [{ "message": "Invalid credentials" }] }
```

---

## `getPermissions(): Promise<ResponseType>`

**Description:**  
Fetch the current user’s permissions as an array of modules, each with its list of policy objects.

```ts
const perm = await crudify.getPermissions();
console.log(perm.data);
```

**Sample Response:**

```json
{
  "success": true,
  "data": [
    {
      "moduleKey": "profiles",
      "policies": [
        { "name": "Read", "action": "read", "conditions": "*", "position": "row" },
        { "name": "Create", "action": "create", "conditions": "*", "position": "header" },
        { "name": "Update", "action": "update", "conditions": "*", "position": "row" },
        { "name": "Delete", "action": "delete", "conditions": "*", "position": "row" }
      ]
    }
    // ...
  ]
}
```

---

# CRUD Operations

All operations accept a `moduleKey` string (the name of your resource/module) and a `data` object. Responses follow the same pattern:

```ts
interface ResponseType {
  success: boolean;
  data?: any;
  errors?: any;
}
```

## Create Item

**Method:** `createItem(moduleKey: string, data: any): Promise<ResponseType>`

**Description:**  
Create a new record in the given module.

```ts
const newUser = { name: "Alice", email: "alice@example.com" };
const res = await crudify.createItem("users", newUser);
```

**Sample Response:**

```json
{
  "success": true,
  "data": {
    "_id": "5f8f8c44b54764421b7156c7",
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

---

## Read Single Item

**Method:** `readItem(moduleKey: string, data: { _id: string }): Promise<ResponseType>`

**Description:**  
Fetch a single record by its `_id`.

```ts
const res = await crudify.readItem("users", { _id: "5f8f8c44b54764421b7156c7" });
```

**Sample Response:**

```json
{
  "success": true,
  "data": {
    "_id": "5f8f8c44b54764421b7156c7",
    "name": "Alice",
    "email": "alice@example.com"
  }
}
```

---

## Read Multiple Items

**Method:** `readItems(moduleKey: string, data: any): Promise<ResponseType>`

**Description:**  
Query multiple records with optional filters, sort, pagination, etc.

```ts
// Example: fetch all users
const res = await crudify.readItems("users", {});
```

**Sample Response:**

```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "Alice", "email": "alice@example.com" },
    { "_id": "...", "name": "Bob", "email": "bob@example.com" }
  ]
}
```

---

## Update Item

**Method:** `updateItem(moduleKey: string, data: any): Promise<ResponseType>`

**Description:**  
Update fields of an existing record. Must include `_id` in `data`.

```ts
const update = { _id: "...", name: "Alice Smith" };
const res = await crudify.updateItem("users", update);
```

**Sample Response:**

```json
{ "success": true, "data": { "_id": "...", "name": "Alice Smith" } }
```

---

## Delete Item

**Method:** `deleteItem(moduleKey: string, data: { _id: string }): Promise<ResponseType>`

**Description:**  
Remove a record by its `_id`.

```ts
const res = await crudify.deleteItem("users", { _id: "..." });
```

**Sample Response:**

```json
{ "success": true, "data": null }
```

---

# Transaction

## `transaction(data: any[]): Promise<ResponseType>`

**Description:**  
Execute multiple operations in a single atomic batch. Each item in the `data` array must be an object with:

- `operation`: one of `'create' | 'update' | 'delete'`
- `moduleKey`: the target module name
- `data`: payload for the operation

```ts
const batch = [
  { operation: "create", moduleKey: "users", data: { name: "Carol" } },
  { operation: "update", moduleKey: "users", data: { _id: "...", name: "Carol Lee" } },
  { operation: "delete", moduleKey: "users", data: { _id: "..." } },
];
const res = await crudify.transaction(batch);
```

**Sample Response:**

```json
{
  "success": true,
  "data": [
    { "operation": "create", "response": { "status": "OK", "data": { ... } } },
    { "operation": "update", "response": { "status": "OK", "data": { ... } } },
    { "operation": "delete", "response": { "status": "OK" } }
  ]
}
```

---

# Field Validations

Below is a list of common field validation rules enforced by the SDK (via server‑side Zod schemas). Each rule returns a specific error code when validation fails.

| Rule             | Description                                                     | Error Code                           |
| ---------------- | --------------------------------------------------------------- | ------------------------------------ |
| `required`       | Field must be present and non‑empty                             | `REQUIRED`                           |
| `email`          | Field must be a valid email address                             | `INVALID_EMAIL`                      |
| `noSpace`        | Field must not contain whitespace                               | `NO_SPACES`                          |
| `min[x]`         | Numeric field must be ≥ x                                       | `MIN_x`                              |
| `max[x]`         | Numeric field must be ≤ x                                       | `MAX_x`                              |
| `minlength[x]`   | String length must be ≥ x characters                            | `MIN_x_CHARACTERS`                   |
| `maxlength[x]`   | String length must be ≤ x characters                            | `MAX_x_CHARACTERS`                   |
| `objectId`       | Must be a valid MongoDB ObjectId                                | `INVALID_OBJECT_ID`                  |
| `in[...]`        | String must be one of the provided values                       | `INVALID_VALUE_MUST_BE_ONE_OF_[...]` |
| `foreign:Module` | Must reference an existing non‑deleted item in `Module`         | `FOREIGN_KEY_NOT_FOUND_<FIELD>`      |
| `unique:Module`  | Value must be unique within `Module` (excluding current record) | `DUPLICATE_<FIELD>`                  |
| `optional`       | Field is not required                                           | (no error on missing field)          |

For array rules (`minarray[x]`, `maxarray[x]`, `foreign:Module`, `unique:Module`), the same error codes apply at the array level.

---

# Operation Results Examples

### Create Item

**Successful (no warnings):**

```js
{
  success: true,
  data: { /* created record */ },
  fieldsWarning: null
}
```

**Successful with warnings:**

```js
{
  success: true,
  data: { /* created record */ },
  fieldsWarning: [ 'password' ]
}
```

**Failure (validation errors):**

```js
{
  success: false,
  errors: {
    email: ['DUPLICATE_EMAIL'],
    name: ['REQUIRED']
  }
}
```

### Update Item

**Successful (no warnings):**

```js
{
  success: true,
  data: { /* updated record */ },
  fieldsWarning: null
}
```

**Successful with warnings:**

```js
{
  success: true,
  data: { /* updated record */ },
  fieldsWarning: [ 'password' ]
}
```

**Failure (validation errors):**

```js
{
  success: false,
  errors: {
    name: ['REQUIRED'],
    email: ['DUPLICATE_EMAIL']
  }
}
```

### Delete Item

Deletion is a soft‑delete; always returns success unless the provided `_id` is invalid.

```js
// Non‑existent or already deleted
{ success: true, data: null, fieldsWarning: null }

// Invalid ObjectId
{ success: false, errors: { _id: ['INVALID_OBJECT_ID'] } }
```

---

# FAQ

**Q:** _What is **`publicApiKey`** vs. **`apiKey`**?_

**A:** `publicApiKey` is your subscriber-level credential, set via `init()`. Internally the library uses a fixed GraphQL API key (`apiKey`) to sign requests; you never need to configure it manually.

**Q:** _How do I change log levels?_  
Pass the optional `logLevel` parameter to `init()`: `none` or `debug`.

**Q:** _Can I use custom headers?_  
All methods accept no extra header parameters. For advanced use cases, fork the library and modify the `executeQuery` method.

**Q:** _What happens if one operation fails in a transaction?_  
By design, the server attempts atomic execution and rolls back on failure. Check the `data` array in the response for per-operation statuses.

---

For more details and advanced usage, visit the [Crudify API reference](https://api.crudify.io/graphql).
