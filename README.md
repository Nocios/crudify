# @nocios/crudify-browser

[![npm version](https://badge.fury.io/js/%40nocios%2Fcrudify-browser.svg)](https://badge.fury.io/js/%40nocios%2Fcrudify-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1.3-3178c6.svg)](https://typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-green.svg)](https://npmjs.com/package/@nocios/crudify-browser)

**Core API SDK for the Crudify ecosystem - Lightweight JavaScript SDK for browser environments with zero dependencies.**

SDK JavaScript ligero para acceder a la API GraphQL de Crudify desde navegadores. Incluye Refresh Token Pattern, operaciones CRUD completas y funcionalidades avanzadas de autenticación.

## 🚀 Características

- **🔐 Autenticación Moderna**: Sistema completo con Refresh Token Pattern
- **🔄 Renovación Automática**: Manejo transparente de tokens
- **📊 CRUD Completo**: Create, Read, Update, Delete con transacciones
- **🌐 Multi-Ambiente**: Configuración para dev, staging y production
- **📱 TypeScript**: Completamente tipado
- **⚡ Lightweight**: Sin dependencias externas
- **🛡️ Seguro**: Manejo seguro de tokens y autenticación

## 📖 Documentation

- 📋 **[Complete API Documentation](docs/overview.md)** - Comprehensive SDK reference and usage guide
- 🔒 **[Security Guide](docs/security.md)** - Security features and best practices
- 🏗️ **[Architecture](docs/architecture.md)** - SDK design and internal structure
- 🔧 **[Migration Guide](docs/migration.md)** - Upgrade instructions between versions
- 💡 **[Examples](docs/examples.md)** - Real-world implementation examples

## 📦 Instalación

```bash
npm install @nocios/crudify-browser
```

Sin dependencias adicionales - completamente standalone.

## 🏗️ Configuración Rápida

```javascript
import crudify from "@nocios/crudify-browser";

// 1. Configurar ambiente
crudify.config("dev"); // 'dev' | 'stg' | 'api' | 'prod'

// 2. Inicializar
await crudify.init("tu_public_api_key_aqui");
```

### Variables de Entorno

```javascript
const apiKey = process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY;
const environment = process.env.REACT_APP_CRUDIFY_ENV || "dev";

crudify.config(environment);
await crudify.init(apiKey);
```

## 🔐 Autenticación

### Login

```javascript
// Login con email o username
const result = await crudify.login("user@example.com", "password");

if (result.success) {
  console.log("Login exitoso:", result.data);
  // Token automáticamente almacenado
} else {
  console.error("Error:", result.errors);
}

// Verificar estado
const isLoggedIn = crudify.isLogin(); // true/false
```

### Refresh Token Pattern

```javascript
// Renovación manual
const refreshResult = await crudify.refreshAccessToken();

// Configurar tokens manualmente (restaurar sesión)
crudify.setTokens({
  accessToken: "stored_access_token",
  refreshToken: "stored_refresh_token",
  expiresAt: 1640995200000,
});

// Obtener información de tokens
const tokenData = crudify.getTokenData();
console.log("Tokens:", tokenData);
```

### Logout

```javascript
await crudify.logout(); // Limpia todos los tokens
```

## 📊 Operaciones CRUD

### Create - Crear

```javascript
// Crear con autenticación de usuario
const result = await crudify.createItem("products", {
  name: "Nuevo Producto",
  price: 99.99,
  category: "electronics",
});

// Crear público (solo con API key)
const publicResult = await crudify.createItemPublic("contacts", {
  name: "Juan Pérez",
  email: "juan@example.com",
});
```

### Read - Leer

```javascript
// Leer un item específico
const item = await crudify.readItem("products", {
  _id: "60f7b1234567890123456789",
});

// Leer múltiples con filtros
const items = await crudify.readItems("products", {
  filter: {
    category: "electronics",
    price: { $gte: 50, $lte: 200 },
  },
  limit: 20,
  sort: { createdAt: -1 },
});

if (items.success) {
  console.log("Productos:", items.data.items);
  console.log("Total:", items.data.total);
}
```

### Update - Actualizar

```javascript
const result = await crudify.updateItem("products", {
  _id: "60f7b1234567890123456789",
  price: 89.99,
  discount: 10,
});
```

### Delete - Eliminar

```javascript
const result = await crudify.deleteItem("products", "60f7b1234567890123456789");
```

## 🔄 Transacciones

Ejecuta múltiples operaciones de forma atómica:

```javascript
const transactionResult = await crudify.transaction({
  operations: [
    {
      operation: "create",
      moduleKey: "orders",
      data: { userId: "user123", total: 199.98 },
    },
    {
      operation: "update",
      moduleKey: "products",
      data: { _id: "product1", stock: { $inc: -2 } },
    },
  ],
});

if (transactionResult.success) {
  console.log("Transacción exitosa:", transactionResult.data);
}
```

## 🔧 Utilidades

### Permisos y Estructura

```javascript
// Obtener permisos del usuario
const permissions = await crudify.getPermissions();

// Obtener estructura del proyecto
const structure = await crudify.getStructure();

// Estructura pública (sin autenticación)
const publicStructure = await crudify.getStructurePublic();
```

### Subida de Archivos

```javascript
// Generar URL firmada
const signedUrl = await crudify.generateSignedUrl({
  fileName: "image.jpg",
  contentType: "image/jpeg",
});

if (signedUrl.success) {
  const { uploadUrl, fileUrl } = signedUrl.data;

  // Usar uploadUrl para subir archivo
  // Usar fileUrl como referencia pública
}
```

### Interceptores de Respuesta

```javascript
// Procesar todas las respuestas
crudify.setResponseInterceptor((response) => {
  console.log("Response:", response);

  // Transformar o agregar datos
  response.metadata = { timestamp: Date.now() };

  return response;
});

// Remover interceptor
crudify.setResponseInterceptor(null);
```

## 🚫 Cancelación de Requests

```javascript
const controller = new AbortController();

// Cancelar después de 5 segundos
setTimeout(() => controller.abort(), 5000);

try {
  const result = await crudify.readItems(
    "products",
    {},
    {
      signal: controller.signal,
    }
  );
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request cancelado");
  }
}
```

## 📱 TypeScript

Tipos completos incluidos:

```typescript
import crudify, { CrudifyResponse, CrudifyTokenData, CrudifyEnvType, NociosError } from "@nocios/crudify-browser";

const response: CrudifyResponse = await crudify.readItems("products", {});
const tokens: CrudifyTokenData = crudify.getTokenData();

// Manejo de errores tipado
if (!response.success && response.errorCode === NociosError.Unauthorized) {
  console.log("No autorizado");
}
```

## 🛠️ Ejemplo Práctico

```javascript
import crudify from "@nocios/crudify-browser";

class ProductAPI {
  async init() {
    crudify.config(process.env.REACT_APP_CRUDIFY_ENV || "prod");
    await crudify.init(process.env.REACT_APP_CRUDIFY_PUBLIC_API_KEY);
  }

  async login(email, password) {
    return await crudify.login(email, password);
  }

  async getProducts(category = null, page = 1) {
    const filter = category ? { category } : {};

    return await crudify.readItems("products", {
      filter,
      limit: 20,
      offset: (page - 1) * 20,
      sort: { name: 1 },
    });
  }

  async createProduct(productData) {
    return await crudify.createItem("products", productData);
  }

  async updateStock(productId, newStock) {
    return await crudify.updateItem("products", {
      _id: productId,
      stock: newStock,
    });
  }
}

// Uso
const api = new ProductAPI();
await api.init();

const loginResult = await api.login("user@example.com", "password");
if (loginResult.success) {
  const products = await api.getProducts("electronics");
  console.log("Productos:", products.data);
}
```

## 🔒 Características de Seguridad

- ✅ Renovación automática de tokens (2 min antes de expirar)
- ✅ Reintento automático en errores de autorización
- ✅ Almacenamiento seguro de tokens
- ✅ Configuración multi-ambiente
- ✅ Manejo de errores estructurado

## 🔧 Configuración Avanzada

```javascript
// Configuración con logging
await crudify.init("api_key", "debug"); // 'none' | 'debug'

// Verificar nivel de logging
console.log(crudify.getLogLevel());

// Limpiar recursos (Node.js)
await crudify.shutdown();
```

## 🚀 Renovación Automática

La librería maneja automáticamente:

- **Renovación preventiva**: Renueva tokens 2 minutos antes de expirar
- **Recuperación de errores**: Auto-renueva en errores 401 y reintenta operación
- **Verificación de estado**: Métodos para verificar expiración de tokens

## 📚 Documentación Completa

Para ejemplos avanzados, configuración detallada y troubleshooting, consulta [README_DEPTH.md](./README_DEPTH.md).

## 📄 Licencia

MIT © [Nocios](https://github.com/nocios)

---

**¿Necesitas ayuda?** Consulta [README_DEPTH.md](./README_DEPTH.md) para documentación completa.
