# @nocios/crudify-browser - Documentación Completa

[![npm version](https://badge.fury.io/js/%40nocios%2Fcrudify-browser.svg)](https://badge.fury.io/js/%40nocios%2Fcrudify-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**@nocios/crudify-browser** es un SDK JavaScript ligero y específico para navegadores que proporciona acceso completo a la API GraphQL de Crudify. Incluye soporte nativo para Refresh Token Pattern, operaciones CRUD completas, transacciones y funcionalidades avanzadas de autenticación.

## 🚀 Características Principales

- **🔐 Autenticación Moderna**: Sistema completo con Refresh Token Pattern
- **🔄 Renovación Automática**: Manejo transparente de tokens con renovación automática
- **📊 CRUD Completo**: Operaciones Create, Read, Update, Delete con soporte para transacciones
- **🌐 Multi-Ambiente**: Configuración para development, staging y production
- **📱 TypeScript**: Completamente tipado para mejor experiencia de desarrollo
- **⚡ Lightweight**: Sin dependencias externas, optimizado para navegadores
- **🛡️ Seguro**: Manejo seguro de tokens y autenticación
- **🔄 Transacciones**: Soporte para operaciones atómicas
- **📁 File Upload**: Generación de URLs firmadas para subida de archivos

## 📦 Instalación

```bash
npm install @nocios/crudify-browser
```

No requiere dependencias adicionales - completamente standalone para navegadores.

## 🏗️ Configuración e Inicialización

### Configuración Básica

```javascript
import crudify from "@nocios/crudify-browser";

// 1. Configurar el ambiente
crudify.config("dev"); // 'dev' | 'stg' | 'api' | 'prod'

// 2. Inicializar con API key
await crudify.init("tu_public_api_key_aqui", "debug");
//                                             ↑ opcional: 'none' | 'debug'
```

### Variables de Entorno (Recomendado)

```javascript
// Usando variables de entorno
const apiKey = process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY;
const environment = process.env.REACT_APP_CRUDIFY_ENV || "dev";

crudify.config(environment);
await crudify.init(apiKey);
```

### Configuración Avanzada con Logging

```javascript
// Configuración para desarrollo con logs detallados
crudify.config("dev");
await crudify.init("your_api_key", "debug");

// Configuración para producción sin logs
crudify.config("prod");
await crudify.init("your_api_key", "none");

// Verificar nivel de logging actual
console.log("Log level:", crudify.getLogLevel()); // 'none' | 'debug'
```

## 🔐 Sistema de Autenticación

### Login con Credenciales

```javascript
// Login con email
const loginResult = await crudify.login("user@example.com", "password123");

// Login con username
const loginResult = await crudify.login("username", "password123");

// Respuesta del login
if (loginResult.success) {
  console.log("Login exitoso:", loginResult.data);
  /*
  {
    loginStatus: "successful",
    token: "eyJhbGciOiJIUzI1NiIs...",
    refreshToken: "refresh_token_here",
    expiresAt: 1640995200000,
    refreshExpiresAt: 1641600000000
  }
  */
} else {
  console.error("Error de login:", loginResult.errors);
  // Ejemplo: { identifier: ["INVALID_CREDENTIALS"] }
}
```

### Verificación de Estado de Autenticación

```javascript
// Verificar si el usuario está logueado
const isLoggedIn = crudify.isLogin();
console.log("Usuario logueado:", isLoggedIn); // true | false

// Obtener información completa de tokens
const tokenData = crudify.getTokenData();
console.log("Datos de tokens:", tokenData);
/*
{
  accessToken: "eyJhbGciOiJIUzI1NiIs...",
  refreshToken: "refresh_token_here",
  expiresAt: 1640995200000,
  refreshExpiresAt: 1641600000000,
  isExpired: false,
  isRefreshExpired: false
}
*/
```

### Logout

```javascript
const logoutResult = await crudify.logout();
console.log("Logout exitoso:", logoutResult.success); // siempre true
```

## 🔄 Refresh Token Pattern

### Renovación Manual de Tokens

```javascript
// Renovar token manualmente
const refreshResult = await crudify.refreshAccessToken();

if (refreshResult.success) {
  console.log("Tokens renovados:", refreshResult.data);
  /*
  {
    token: "nuevo_access_token",
    refreshToken: "nuevo_refresh_token",
    expiresAt: 1640995200000,
    refreshExpiresAt: 1641600000000
  }
  */
} else {
  console.error("Error renovando tokens:", refreshResult.errors);
  // El refresh token probablemente expiró
}
```

### Configuración Manual de Tokens

```javascript
// Útil para restaurar sesión desde storage
crudify.setTokens({
  accessToken: "stored_access_token",
  refreshToken: "stored_refresh_token",
  expiresAt: 1640995200000,
  refreshExpiresAt: 1641600000000,
});

// También soporta configuración mínima
crudify.setTokens({
  accessToken: "stored_access_token",
  // refreshToken, expiresAt y refreshExpiresAt son opcionales
});
```

### Renovación Automática

La librería maneja automáticamente la renovación de tokens:

```javascript
// ✅ Renovación automática cuando el token está por expirar (2 min antes)
const result = await crudify.readItems("products", {});
// Si el token expira en < 2 minutos, se renueva automáticamente

// ✅ Renovación automática en errores de autorización
const result = await crudify.createItem("orders", { total: 100 });
// Si recibe error 401, intenta renovar token y reintenta la operación
```

## 📊 Operaciones CRUD

### Create - Crear Items

```javascript
// Crear item con autenticación de usuario
const createResult = await crudify.createItem("products", {
  name: "Nuevo Producto",
  price: 99.99,
  category: "electronics",
  description: "Un excelente producto",
});

if (createResult.success) {
  console.log("Producto creado:", createResult.data);
  // { _id: "60f7b1234567890123456789", name: "Nuevo Producto", ... }
} else {
  console.error("Error creando producto:", createResult.errors);
  // { name: ["REQUIRED"], price: ["MIN_VALUE_1"] }
}

// Crear item público (sin autenticación de usuario, usa API key)
const publicCreateResult = await crudify.createItemPublic("contacts", {
  name: "Juan Pérez",
  email: "juan@example.com",
  message: "Solicitud de información",
});
```

### Read - Leer Items

```javascript
// Leer un item específico por ID
const itemResult = await crudify.readItem("products", {
  _id: "60f7b1234567890123456789",
});

if (itemResult.success) {
  console.log("Producto encontrado:", itemResult.data);
} else {
  console.error("Producto no encontrado");
}

// Leer múltiples items con filtros y paginación
const itemsResult = await crudify.readItems("products", {
  // Filtros
  filter: {
    category: "electronics",
    price: { $gte: 50, $lte: 200 },
  },

  // Paginación (objeto con page y limit)
  pagination: {
    page: 1, // Página 1
    limit: 20, // 20 items por página (default: 20)
  },

  // Ordenamiento
  sort: { createdAt: -1 }, // más reciente primero
});

if (itemsResult.success) {
  console.log("Productos encontrados:", itemsResult.data);
  /*
  {
    items: [
      { _id: "...", name: "Producto 1", price: 99.99, ... },
      { _id: "...", name: "Producto 2", price: 149.99, ... }
    ],
    total: 45
  }
  */
}

// ⚡ IMPORTANTE: Obtener TODOS los resultados SIN paginación
const allItemsResult = await crudify.readItems("products", {
  filter: { inStock: true },
  pagination: {
    limit: 0, // ✅ limit: 0 retorna TODOS los resultados sin paginación
  },
  sort: { name: 1 },
});

console.log("Total items:", allItemsResult.data.items.length);
console.log("Total en DB:", allItemsResult.data.total);

// Leer con referencias pobladas (populate)
const ordersResult = await crudify.readItems("orders", {
  filter: { status: "pending" },
  populate: [
    {
      path: "customerId", // Campo a poblar (debe ser una referencia)
      moduleKey: "customers", // Módulo al que referencia
      select: ["name", "email", "phone"], // Campos a incluir (array)
    },
    {
      path: "productIds", // También funciona con arrays de referencias
      moduleKey: "products",
      select: "name price stock", // También acepta string separado por espacios
    },
  ],
  pagination: { page: 1, limit: 10 },
  sort: { createdAt: -1 },
});

if (ordersResult.success) {
  ordersResult.data.items.forEach((order) => {
    console.log("Order:", order._id);
    console.log("Customer:", order.customerId?.name); // Datos poblados
    console.log("Products:", order.productIds?.map((p) => p.name)); // Array poblado
  });
}

// Búsqueda avanzada con operadores
const searchResult = await crudify.readItems("users", {
  filter: {
    // Texto que contenga
    name: { $regex: "Juan", $options: "i" },

    // Rango de fechas
    createdAt: {
      $gte: "2023-01-01T00:00:00Z",
      $lte: "2023-12-31T23:59:59Z",
    },

    // Array contains
    tags: { $in: ["premium", "vip"] },

    // Existe el campo
    email: { $exists: true },
  },
  pagination: {
    page: 1,
    limit: 50,
  },
  sort: { name: 1 },
});
```

### Update - Actualizar Items

```javascript
// Actualizar un item (debe incluir _id)
const updateResult = await crudify.updateItem("products", {
  _id: "60f7b1234567890123456789",
  price: 89.99,
  discount: 10,
  lastModified: new Date().toISOString(),
});

if (updateResult.success) {
  console.log("Producto actualizado:", updateResult.data);
} else {
  console.error("Error actualizando:", updateResult.errors);
}

// Actualización parcial (solo campos especificados)
const partialUpdate = await crudify.updateItem("users", {
  _id: "user_id_here",
  lastLogin: new Date().toISOString(),
  // Solo se actualiza lastLogin, otros campos permanecen igual
});
```

### Delete - Eliminar Items

```javascript
// Eliminar por ID
const deleteResult = await crudify.deleteItem("products", "60f7b1234567890123456789");

if (deleteResult.success) {
  console.log("Producto eliminado exitosamente");
} else {
  console.error("Error eliminando:", deleteResult.errors);
  // Posibles errores: item no encontrado, sin permisos, etc.
}
```

## 🔄 Transacciones

Las transacciones permiten ejecutar múltiples operaciones de forma atómica:

```javascript
// Transacción mixta con múltiples operaciones
const transactionResult = await crudify.transaction({
  operations: [
    // Crear orden
    {
      operation: "create",
      moduleKey: "orders",
      data: {
        userId: "user123",
        total: 199.98,
        status: "pending",
      },
    },

    // Actualizar stock de productos
    {
      operation: "update",
      moduleKey: "products",
      data: {
        _id: "product1",
        stock: { $inc: -2 }, // Decrementar en 2
      },
    },

    // Crear registro de log
    {
      operation: "create",
      moduleKey: "activity_logs",
      data: {
        action: "order_created",
        userId: "user123",
        timestamp: new Date().toISOString(),
      },
    },
  ],
});

if (transactionResult.success) {
  console.log("Transacción exitosa:", transactionResult.data);
  /*
  {
    results: [
      { success: true, data: { _id: "order_id", ... } },
      { success: true, data: { _id: "product1", stock: 48 } },
      { success: true, data: { _id: "log_id", ... } }
    ]
  }
  */
} else {
  console.error("Transacción falló:", transactionResult.errors);
  // Si una operación falla, toda la transacción se revierte
}

// Transacción simple (solo creates)
const simpleTransaction = await crudify.transaction([
  { name: "Producto A", price: 50 },
  { name: "Producto B", price: 75 },
  { name: "Producto C", price: 100 },
]);
```

## 🔧 Utilidades y Funcionalidades Especiales

### Obtener Permisos de Usuario

```javascript
const permissionsResult = await crudify.getPermissions();

if (permissionsResult.success) {
  console.log("Permisos del usuario:", permissionsResult.data);
  /*
  {
    modules: {
      products: ["create", "read", "update"],
      orders: ["read", "update"],
      users: ["read"]
    },
    role: "manager",
    isAdmin: false
  }
  */
}
```

### Obtener Estructura de Datos

```javascript
// Estructura completa (requiere autenticación)
const structureResult = await crudify.getStructure();

if (structureResult.success) {
  console.log("Estructura del proyecto:", structureResult.data);
  /*
  {
    modules: {
      products: {
        fields: {
          name: { type: "string", required: true },
          price: { type: "number", min: 0 },
          category: { type: "string", enum: ["electronics", "books"] }
        }
      },
      orders: { ... }
    }
  }
  */
}

// Estructura pública (sin autenticación)
const publicStructure = await crudify.getStructurePublic();
// Solo incluye módulos y campos marcados como públicos
```

### Subida de Archivos

```javascript
// Generar URL firmada para subir archivo
const signedUrlResult = await crudify.generateSignedUrl({
  fileName: "profile-image.jpg",
  contentType: "image/jpeg",
});

if (signedUrlResult.success) {
  const { uploadUrl, fileUrl } = signedUrlResult.data;

  // Subir archivo usando la URL firmada
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: formData,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });

  if (uploadResponse.ok) {
    console.log("Archivo subido exitosamente");
    console.log("URL pública:", fileUrl);

    // Ahora puedes usar fileUrl en tu aplicación
    await crudify.updateItem("users", {
      _id: "user_id",
      avatar: fileUrl,
    });
  }
}
```

## 🔧 Interceptores de Respuesta

Los interceptores te permiten procesar todas las respuestas antes de ser devueltas:

```javascript
// Configurar interceptor de respuesta
crudify.setResponseInterceptor((response) => {
  // Logging de todas las respuestas
  console.log("Response intercepted:", response);

  // Transformar errores
  if (response.errors) {
    response.errors = response.errors.map((error) => ({
      ...error,
      timestamp: new Date().toISOString(),
    }));
  }

  // Agregar metadatos
  response.metadata = {
    interceptedAt: Date.now(),
    version: "1.0.0",
  };

  return response;
});

// Interceptor asíncrono
crudify.setResponseInterceptor(async (response) => {
  // Procesar respuesta de forma asíncrona
  if (response.data?.userId) {
    const userDetails = await someExternalAPI(response.data.userId);
    response.data.userDetails = userDetails;
  }

  return response;
});

// Remover interceptor
crudify.setResponseInterceptor(null);
```

## 📱 Soporte para TypeScript

La librería incluye tipos completos para TypeScript:

```typescript
import crudify, {
  CrudifyResponse,
  CrudifyTokenData,
  CrudifyTokenConfig,
  CrudifyEnvType,
  CrudifyLogLevel,
  CrudifyRequestOptions,
  NociosError,
} from "@nocios/crudify-browser";

// Configuración tipada
const env: CrudifyEnvType = "prod";
const logLevel: CrudifyLogLevel = "none";

await crudify.config(env);
await crudify.init("api_key", logLevel);

// Respuestas tipadas
const response: CrudifyResponse = await crudify.readItems("products", {
  limit: 10,
});

// Datos de token tipados
const tokenData: CrudifyTokenData = crudify.getTokenData();

// Configuración de tokens tipada
const tokenConfig: CrudifyTokenConfig = {
  accessToken: "token_here",
  refreshToken: "refresh_token_here",
  expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
};

crudify.setTokens(tokenConfig);

// Manejo de errores tipado
if (!response.success && response.errorCode) {
  switch (response.errorCode) {
    case NociosError.InvalidCredentials:
      console.log("Credenciales inválidas");
      break;
    case NociosError.Unauthorized:
      console.log("No autorizado");
      break;
    case NociosError.ItemNotFound:
      console.log("Item no encontrado");
      break;
  }
}
```

## 🚫 Cancelación de Requests

Todas las operaciones asíncronas soportan AbortSignal para cancelación:

```javascript
// Crear AbortController
const controller = new AbortController();

// Operación con timeout
setTimeout(() => {
  controller.abort();
}, 5000); // Cancelar después de 5 segundos

try {
  const result = await crudify.readItems(
    "products",
    {
      limit: 1000, // operación lenta
    },
    {
      signal: controller.signal, // pasar signal para cancelación
    }
  );

  console.log("Operación completada:", result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Operación cancelada");
  } else {
    console.error("Error:", error);
  }
}

// Cancelar múltiples operaciones
const controller = new AbortController();
const options = { signal: controller.signal };

const promises = [
  crudify.readItems("products", {}, options),
  crudify.readItems("orders", {}, options),
  crudify.readItems("users", {}, options),
];

// Cancelar todas después de 3 segundos
setTimeout(() => controller.abort(), 3000);

try {
  const results = await Promise.all(promises);
  console.log("Todas completadas:", results);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Operaciones canceladas");
  }
}
```

## 🛠️ Ejemplos Prácticos Completos

### E-commerce Store

```javascript
import crudify from "@nocios/crudify-browser";

class EcommerceAPI {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    crudify.config(process.env.REACT_APP_CRUDIFY_ENV || "dev");
    await crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY);

    this.initialized = true;
  }

  // Autenticación
  async login(email, password) {
    await this.init();
    return await crudify.login(email, password);
  }

  async logout() {
    return await crudify.logout();
  }

  isLoggedIn() {
    return crudify.isLogin();
  }

  // Productos
  async getProducts(category = null, page = 1, limit = 20) {
    await this.init();

    const filter = {};
    if (category) filter.category = category;

    return await crudify.readItems("products", {
      filter,
      pagination: {
        page,
        limit,
      },
      sort: { name: 1 },
    });
  }

  async getProduct(productId) {
    await this.init();
    return await crudify.readItem("products", { _id: productId });
  }

  // Carrito y órdenes
  async addToCart(productId, quantity) {
    if (!this.isLoggedIn()) {
      throw new Error("Debes estar logueado para agregar al carrito");
    }

    return await crudify.createItem("cart_items", {
      productId,
      quantity,
      addedAt: new Date().toISOString(),
    });
  }

  async getCart() {
    if (!this.isLoggedIn()) return { success: false, errors: ["Not logged in"] };

    return await crudify.readItems("cart_items", {
      pagination: {
        limit: 0, // Obtener todos los items del carrito
      },
      sort: { addedAt: -1 },
    });
  }

  async createOrder(items, shippingAddress) {
    if (!this.isLoggedIn()) {
      throw new Error("Debes estar logueado para crear una orden");
    }

    // Usar transacción para crear orden y limpiar carrito
    return await crudify.transaction({
      operations: [
        {
          operation: "create",
          moduleKey: "orders",
          data: {
            items,
            shippingAddress,
            status: "pending",
            createdAt: new Date().toISOString(),
          },
        },
        {
          operation: "delete",
          moduleKey: "cart_items",
          filter: {}, // eliminar todos los items del carrito
        },
      ],
    });
  }

  // Perfil de usuario
  async getProfile() {
    if (!this.isLoggedIn()) return null;

    const tokenData = crudify.getTokenData();
    // Asumir que el user ID está en el token
    const userId = JSON.parse(atob(tokenData.accessToken.split(".")[1])).sub;

    return await crudify.readItem("users", { _id: userId });
  }

  async updateProfile(updates) {
    if (!this.isLoggedIn()) {
      throw new Error("Debes estar logueado para actualizar perfil");
    }

    const tokenData = crudify.getTokenData();
    const userId = JSON.parse(atob(tokenData.accessToken.split(".")[1])).sub;

    return await crudify.updateItem("users", {
      _id: userId,
      ...updates,
    });
  }
}

// Uso
const api = new EcommerceAPI();

// Login
const loginResult = await api.login("user@example.com", "password");
if (loginResult.success) {
  console.log("Login exitoso");

  // Obtener productos
  const products = await api.getProducts("electronics", 1, 10);
  console.log("Productos:", products.data);

  // Agregar al carrito
  await api.addToCart(products.data.items[0]._id, 2);

  // Ver carrito
  const cart = await api.getCart();
  console.log("Carrito:", cart.data);

  // Crear orden
  const order = await api.createOrder(cart.data.items, { address: "123 Main St", city: "City" });
  console.log("Orden creada:", order.data);
}
```

### Blog System

```javascript
class BlogAPI {
  constructor() {
    crudify.config("prod");
    crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY);
  }

  // Posts públicos
  async getPosts(page = 1, limit = 10) {
    return await crudify.readItems("posts", {
      filter: { published: true },
      pagination: {
        page,
        limit,
      },
      sort: { publishedAt: -1 },
    });
  }

  async getPost(slug) {
    return await crudify.readItem("posts", {
      slug,
      published: true,
    });
  }

  // Comentarios
  async getComments(postId) {
    return await crudify.readItems("comments", {
      filter: { postId, approved: true },
      pagination: {
        limit: 0, // Todos los comentarios del post
      },
      sort: { createdAt: 1 },
    });
  }

  async createComment(postId, comment) {
    return await crudify.createItemPublic("comments", {
      postId,
      ...comment,
      approved: false, // require moderation
      createdAt: new Date().toISOString(),
    });
  }

  // Búsqueda
  async searchPosts(query) {
    return await crudify.readItems("posts", {
      filter: {
        $or: [{ title: { $regex: query, $options: "i" } }, { content: { $regex: query, $options: "i" } }, { tags: { $in: [query] } }],
        published: true,
      },
      pagination: {
        page: 1,
        limit: 20,
      },
    });
  }
}
```

## 🔍 Manejo de Errores

### Estructura de Errores

```javascript
const result = await crudify.createItem("products", { name: "" });

if (!result.success) {
  console.log("Error Code:", result.errorCode); // NociosError enum
  console.log("Field Errors:", result.errors);

  // Ejemplo de respuesta de error:
  /*
  {
    success: false,
    errorCode: "FIELD_ERROR",
    errors: {
      name: ["REQUIRED", "MIN_LENGTH_3"],
      price: ["REQUIRED", "MIN_VALUE_0"]
    }
  }
  */
}
```

### Códigos de Error Disponibles

La librería define códigos de error estandarizados en el enum `NociosError`:

```javascript
import { NociosError } from "@nocios/crudify-browser";

// Errores de autenticación
NociosError.InvalidCredentials; // "INVALID_CREDENTIALS"
NociosError.InvalidApiKey; // "INVALID_API_KEY"
NociosError.Unauthorized; // "UNAUTHORIZED"

// Errores de usuario/subscriber
NociosError.SubscriberNotFound; // "SUBSCRIBER_NOT_FOUND"
NociosError.SubscriberNotActive; // "SUBSCRIBER_NOT_ACTIVE"
NociosError.UserNotFound; // "USER_NOT_FOUND"
NociosError.UserNotActive; // "USER_NOT_ACTIVE"
NociosError.ProfileNotFound; // "PROFILE_NOT_FOUND"
NociosError.ProfileNotActive; // "PROFILE_NOT_ACTIVE"

// Errores de configuración
NociosError.InvalidConfiguration; // "INVALID_CONFIGURATION"

// Errores de request
NociosError.BadRequest; // "BAD_REQUEST"
NociosError.NotFound; // "NOT_FOUND"
NociosError.InUse; // "IN_USE"
NociosError.NoPermission; // "NO_PERMISSION"

// Errores de sistema
NociosError.InternalServerError; // "INTERNAL_SERVER_ERROR"
NociosError.DatabaseConnectionError; // "DATABASE_CONNECTION_ERROR"

// Errores de validación
NociosError.FieldError; // "FIELD_ERROR"

// Errores de operación
NociosError.UnknownOperation; // "UNKNOWN_OPERATION"
NociosError.NotExecuted; // "NOT_EXECUTED"
NociosError.NoActive; // "NO_ACTIVE"
NociosError.ItemNotFound; // "ITEM_NOT_FOUND"
```

### Manejo de Errores Avanzado

```javascript
async function handleOperation(operation) {
  try {
    const result = await operation();

    if (result.success) {
      return result.data;
    }

    // Manejo específico por código de error
    switch (result.errorCode) {
      case NociosError.Unauthorized:
        // Token expirado o inválido
        console.log("Sesión expirada, redirigir a login");
        window.location.href = "/login";
        break;

      case NociosError.NoPermission:
        console.log("Sin permisos para esta operación");
        showErrorMessage("No tienes permisos para realizar esta acción");
        break;

      case NociosError.FieldError:
        // Errores de validación de campos
        displayFieldErrors(result.errors);
        break;

      case NociosError.ItemNotFound:
        console.log("Item no encontrado");
        showErrorMessage("El recurso solicitado no existe");
        break;

      default:
        console.error("Error no manejado:", result.errorCode);
        showErrorMessage("Ocurrió un error inesperado");
    }
  } catch (error) {
    // Errores de red o JavaScript
    console.error("Exception:", error);
    showErrorMessage("Error de conexión");
  }
}

// Uso
await handleOperation(() => crudify.createItem("products", productData));
```

## 🚀 Optimización y Best Practices

### 1. Inicialización Una Sola Vez

```javascript
// ✅ Correcto: Inicializar una sola vez
let crudifyInitialized = false;

async function initCrudify() {
  if (crudifyInitialized) return;

  crudify.config(process.env.REACT_APP_CRUDIFY_ENV);
  await crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY);

  crudifyInitialized = true;
}

// ❌ Incorrecto: Inicializar múltiples veces
// No hagas esto en cada componente
```

### 2. Manejo de Tokens Persistente

```javascript
// Restaurar sesión desde localStorage
function restoreSession() {
  const tokens = JSON.parse(localStorage.getItem("crudify_tokens") || "{}");

  if (tokens.accessToken) {
    crudify.setTokens(tokens);

    // Verificar si los tokens son válidos
    const tokenData = crudify.getTokenData();

    if (tokenData.isRefreshExpired) {
      // Refresh token expirado, limpiar storage
      localStorage.removeItem("crudify_tokens");
    } else if (tokenData.isExpired) {
      // Access token expirado pero refresh token válido
      crudify.refreshAccessToken().then((result) => {
        if (result.success) {
          localStorage.setItem(
            "crudify_tokens",
            JSON.stringify({
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              expiresAt: tokenData.expiresAt,
              refreshExpiresAt: tokenData.refreshExpiresAt,
            })
          );
        }
      });
    }
  }
}

// Guardar tokens después del login
async function login(email, password) {
  const result = await crudify.login(email, password);

  if (result.success) {
    const tokenData = crudify.getTokenData();
    localStorage.setItem(
      "crudify_tokens",
      JSON.stringify({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        refreshExpiresAt: tokenData.refreshExpiresAt,
      })
    );
  }

  return result;
}

// Limpiar tokens en logout
async function logout() {
  await crudify.logout();
  localStorage.removeItem("crudify_tokens");
}
```

### 3. Paginación Eficiente

```javascript
async function loadPaginatedData(moduleKey, page = 1, limit = 20) {
  return await crudify.readItems(moduleKey, {
    pagination: {
      page,
      limit,
    },
    // Ordenamiento consistente para paginación
    sort: { _id: 1 },
  });
}

// Cargar más datos (scroll infinito)
async function loadMore(currentItems, moduleKey, page) {
  const result = await loadPaginatedData(moduleKey, page);

  if (result.success) {
    const hasMore = result.data.items.length === 20; // Si retornó menos, no hay más
    return {
      items: [...currentItems, ...result.data.items],
      hasMore,
      total: result.data.total,
    };
  }

  return { items: currentItems, hasMore: false };
}

// ⚡ Cargar todos los datos (usar con precaución)
async function loadAllData(moduleKey, filter = {}) {
  return await crudify.readItems(moduleKey, {
    filter,
    pagination: {
      limit: 0, // ✅ Retorna TODOS los resultados
    },
    sort: { _id: 1 },
  });
}
```

### 4. Cache Simple

```javascript
class CacheManager {
  constructor(ttl = 5 * 60 * 1000) {
    // 5 minutos default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new CacheManager();

async function getCachedData(moduleKey, cacheKey, fetchFn) {
  // Intentar obtener de cache primero
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Si no está en cache, fetch de API
  const result = await fetchFn();

  if (result.success) {
    cache.set(cacheKey, result);
  }

  return result;
}

// Uso
const products = await getCachedData("products", "products_page_1", () =>
  crudify.readItems("products", {
    pagination: { page: 1, limit: 20 },
  })
);
```

## 🔐 Configuración de Seguridad

### Variables de Entorno

```bash
# .env
REACT_APP_CRUDIFY_PUBLIC_API_KEY=your_public_api_key_here
REACT_APP_CRUDIFY_ENV=prod
```

### Configuración de Producción

```javascript
// Configuración para producción
if (process.env.NODE_ENV === "production") {
  crudify.config("prod");
  await crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY, "none");
} else {
  crudify.config("dev");
  await crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY, "debug");
}
```

## 🔧 Troubleshooting

### Problemas Comunes

**1. Error "Crudify not initialized"**

```javascript
// Solución: Asegurar que init() se ejecute antes de otras operaciones
await crudify.init("your_api_key");
// Ahora puedes usar otras funciones
```

**2. Token constantemente expirado**

```javascript
// Verificar configuración de tokens
const tokenData = crudify.getTokenData();
console.log("Token data:", tokenData);

// Verificar que refresh token pattern esté funcionando
const refreshResult = await crudify.refreshAccessToken();
console.log("Refresh result:", refreshResult);
```

**3. Errores de CORS**

```javascript
// Verificar que el environment sea correcto
crudify.config("prod"); // Asegurar environment correcto
```

**4. Operaciones lentas**

```javascript
// Usar paginación para colecciones grandes
const result = await crudify.readItems("large_collection", {
  filter: {},
  pagination: {
    page: 1,
    limit: 20, // Paginar resultados (default: 20)
  },
  signal: abortController.signal, // Timeout
});

// ⚠️ PRECAUCIÓN: Usar limit: 0 solo cuando sea necesario
// Retorna TODOS los resultados, puede ser lento en colecciones grandes
const allResults = await crudify.readItems("small_collection", {
  pagination: {
    limit: 0, // Solo usar con colecciones pequeñas
  },
});
```

## 📚 Referencias de API

### Métodos Principales

| Método                 | Parámetros                                         | Retorna                    | Propósito               |
| ---------------------- | -------------------------------------------------- | -------------------------- | ----------------------- |
| `config()`             | `env: CrudifyEnvType`                              | `void`                     | Configurar ambiente     |
| `init()`               | `publicApiKey: string, logLevel?: CrudifyLogLevel` | `Promise<void>`            | Inicializar SDK         |
| `login()`              | `identifier: string, password: string`             | `Promise<CrudifyResponse>` | Autenticar usuario      |
| `logout()`             | -                                                  | `Promise<CrudifyResponse>` | Cerrar sesión           |
| `isLogin()`            | -                                                  | `boolean`                  | Verificar autenticación |
| `refreshAccessToken()` | -                                                  | `Promise<CrudifyResponse>` | Renovar tokens          |
| `setTokens()`          | `tokens: CrudifyTokenConfig`                       | `void`                     | Configurar tokens       |
| `getTokenData()`       | -                                                  | `CrudifyTokenData`         | Obtener info de tokens  |

### Operaciones CRUD

| Método               | Parámetros                                    | Retorna                    | Propósito            |
| -------------------- | --------------------------------------------- | -------------------------- | -------------------- |
| `createItem()`       | `moduleKey: string, data: object, options?`   | `Promise<CrudifyResponse>` | Crear item           |
| `createItemPublic()` | `moduleKey: string, data: object, options?`   | `Promise<CrudifyResponse>` | Crear item público   |
| `readItem()`         | `moduleKey: string, filter: object, options?` | `Promise<CrudifyResponse>` | Leer un item         |
| `readItems()`        | `moduleKey: string, filter: object, options?` | `Promise<CrudifyResponse>` | Leer múltiples items |
| `updateItem()`       | `moduleKey: string, data: object, options?`   | `Promise<CrudifyResponse>` | Actualizar item      |
| `deleteItem()`       | `moduleKey: string, id: string, options?`     | `Promise<CrudifyResponse>` | Eliminar item        |

### Utilidades

| Método                     | Parámetros                                | Retorna                    | Propósito                  |
| -------------------------- | ----------------------------------------- | -------------------------- | -------------------------- |
| `transaction()`            | `data: any, options?`                     | `Promise<CrudifyResponse>` | Ejecutar transacción       |
| `getPermissions()`         | `options?`                                | `Promise<CrudifyResponse>` | Obtener permisos           |
| `getStructure()`           | `options?`                                | `Promise<CrudifyResponse>` | Obtener estructura         |
| `getStructurePublic()`     | `options?`                                | `Promise<CrudifyResponse>` | Obtener estructura pública |
| `generateSignedUrl()`      | `data: {fileName, contentType}, options?` | `Promise<CrudifyResponse>` | URL firmada                |
| `setResponseInterceptor()` | `interceptor: Function \| null`           | `void`                     | Configurar interceptor     |

## 📄 Licencia

MIT © [Nocios](https://github.com/nocios)

## 📞 Soporte

- **Documentación**: [README_DEPTH.md](./README_DEPTH.md)
- **Issues**: [GitHub Issues](https://github.com/nocios/crudify/issues)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**¿Necesitas ayuda?** Consulta la documentación completa o crea un issue en GitHub.
