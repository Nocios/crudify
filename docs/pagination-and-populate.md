# Paginación y Populate - Guía Completa

Esta guía documenta en detalle cómo usar las opciones de paginación y populate en `readItems()`.

## 📄 Tabla de Contenidos

- [Paginación](#paginación)
  - [Paginación Estándar](#paginación-estándar)
  - [Sin Paginación (Todos los Resultados)](#sin-paginación-todos-los-resultados)
  - [Comportamiento por Defecto](#comportamiento-por-defecto)
- [Populate (Referencias)](#populate-referencias)
  - [Estructura del Parámetro](#estructura-del-parámetro)
  - [Ejemplos Básicos](#ejemplos-básicos)
  - [Ejemplos Avanzados](#ejemplos-avanzados)
- [Combinando Paginación y Populate](#combinando-paginación-y-populate)
- [Best Practices](#best-practices)

---

## Paginación

### Paginación Estándar

La paginación se configura mediante un objeto con `page` y `limit`:

```javascript
const result = await crudify.readItems("products", {
  filter: { category: "electronics" },
  pagination: {
    page: 1, // Número de página (inicia en 1)
    limit: 20, // Items por página
  },
  sort: { createdAt: -1 },
});

console.log("Items:", result.data.items);
console.log("Total items:", result.data.total);
console.log("Página actual:", 1);
console.log("Items por página:", 20);
```

### Sin Paginación (Todos los Resultados)

**⚡ Característica Importante:** Puedes obtener **TODOS** los resultados sin paginación usando `limit: 0`:

```javascript
// ✅ Retorna TODOS los resultados
const allProducts = await crudify.readItems("products", {
  filter: { inStock: true },
  pagination: {
    limit: 0, // ✅ limit: 0 desactiva la paginación
  },
  sort: { name: 1 },
});

console.log("Total de productos:", allProducts.data.items.length);
console.log("Total en DB:", allProducts.data.total);
```

**⚠️ Precaución:** Usar `limit: 0` puede ser lento en colecciones grandes. Úsalo solo cuando:

- La colección es pequeña (< 1000 items)
- Necesitas todos los resultados en una sola petición
- Estás exportando datos

```javascript
// ❌ NO RECOMENDADO para colecciones grandes
const allOrders = await crudify.readItems("orders", {
  pagination: { limit: 0 }, // Puede ser muy lento si hay miles de órdenes
});

// ✅ RECOMENDADO: Usar paginación
const orders = await crudify.readItems("orders", {
  pagination: { page: 1, limit: 50 },
});
```

### Comportamiento por Defecto

Si no especificas `pagination`, se aplican los siguientes defaults:

```javascript
// Sin especificar pagination
const result = await crudify.readItems("products", {
  filter: {},
});

// Es equivalente a:
const result = await crudify.readItems("products", {
  filter: {},
  pagination: {
    page: 1, // Default: página 1
    limit: 20, // Default: 20 items por página
  },
});
```

#### Valores por Defecto

| Parámetro | Valor por Defecto | Descripción         |
| --------- | ----------------- | ------------------- |
| `page`    | `1`               | Primera página      |
| `limit`   | `20`              | 20 items por página |

---

## Populate (Referencias)

El parámetro `populate` permite cargar datos de referencias (similar a SQL JOINs o MongoDB populate).

### Estructura del Parámetro

```typescript
populate: Array<{
  path: string; // Campo a poblar (debe ser una referencia)
  moduleKey: string; // Módulo al que referencia
  select: string | string[]; // Campos a incluir
}>;
```

### Ejemplos Básicos

#### Poblar una Referencia Simple

```javascript
// Schema de order:
// {
//   _id: ObjectId,
//   customerId: ObjectId (referencia a customers),
//   total: Number
// }

const orders = await crudify.readItems("orders", {
  filter: { status: "pending" },
  populate: [
    {
      path: "customerId", // Campo a poblar
      moduleKey: "customers", // Módulo referenciado
      select: ["name", "email"], // Campos a incluir (array)
    },
  ],
  pagination: { page: 1, limit: 10 },
});

// Resultado:
orders.data.items.forEach((order) => {
  console.log("Order ID:", order._id);
  console.log("Customer Name:", order.customerId?.name);
  console.log("Customer Email:", order.customerId?.email);
});
```

#### Poblar con String (en vez de Array)

El parámetro `select` también acepta un string con campos separados por espacios o comas:

```javascript
const orders = await crudify.readItems("orders", {
  populate: [
    {
      path: "customerId",
      moduleKey: "customers",
      select: "name email phone", // ✅ String separado por espacios
    },
  ],
});

// También acepta comas
const orders2 = await crudify.readItems("orders", {
  populate: [
    {
      path: "customerId",
      moduleKey: "customers",
      select: "name,email,phone", // ✅ String separado por comas
    },
  ],
});
```

### Ejemplos Avanzados

#### Poblar Múltiples Referencias

```javascript
// Schema de order:
// {
//   customerId: ObjectId (referencia a customers),
//   productId: ObjectId (referencia a products),
//   shippingAddressId: ObjectId (referencia a addresses)
// }

const orders = await crudify.readItems("orders", {
  filter: { status: "pending" },
  populate: [
    {
      path: "customerId",
      moduleKey: "customers",
      select: ["name", "email", "phone"],
    },
    {
      path: "productId",
      moduleKey: "products",
      select: "name price stock",
    },
    {
      path: "shippingAddressId",
      moduleKey: "addresses",
      select: ["street", "city", "country"],
    },
  ],
});

// Acceder a los datos poblados
orders.data.items.forEach((order) => {
  console.log("Customer:", order.customerId?.name);
  console.log("Product:", order.productId?.name);
  console.log("Address:", order.shippingAddressId?.city);
});
```

#### Poblar Arrays de Referencias

```javascript
// Schema de order:
// {
//   productIds: [ObjectId] (array de referencias a products)
// }

const orders = await crudify.readItems("orders", {
  populate: [
    {
      path: "productIds", // Campo array
      moduleKey: "products",
      select: ["name", "price", "sku"],
    },
  ],
});

// Resultado:
orders.data.items.forEach((order) => {
  console.log("Order:", order._id);
  console.log("Products:");
  order.productIds?.forEach((product) => {
    console.log(`  - ${product.name}: $${product.price}`);
  });
});
```

#### Poblar con Filtros y Ordenamiento

```javascript
const posts = await crudify.readItems("blog_posts", {
  filter: { published: true },
  populate: [
    {
      path: "authorId",
      moduleKey: "users",
      select: "name avatar bio",
    },
    {
      path: "categoryId",
      moduleKey: "categories",
      select: "name slug",
    },
  ],
  pagination: { page: 1, limit: 20 },
  sort: { publishedAt: -1 }, // Más reciente primero
});
```

---

## Combinando Paginación y Populate

Puedes usar paginación y populate juntos:

```javascript
// Obtener órdenes paginadas con datos del cliente y productos
const orders = await crudify.readItems("orders", {
  filter: {
    createdAt: {
      $gte: "2024-01-01T00:00:00Z",
    },
  },
  populate: [
    {
      path: "customerId",
      moduleKey: "customers",
      select: ["name", "email"],
    },
    {
      path: "productIds",
      moduleKey: "products",
      select: "name price",
    },
  ],
  pagination: {
    page: 1,
    limit: 25,
  },
  sort: { createdAt: -1 },
});

console.log("Órdenes:", orders.data.items);
console.log("Total:", orders.data.total);
console.log("Página:", 1);
```

### Ejemplo de Paginación Infinita con Populate

```javascript
class OrderList {
  constructor() {
    this.currentPage = 1;
    this.allOrders = [];
  }

  async loadMore() {
    const result = await crudify.readItems("orders", {
      filter: { status: "completed" },
      populate: [
        {
          path: "customerId",
          moduleKey: "customers",
          select: "name email",
        },
      ],
      pagination: {
        page: this.currentPage,
        limit: 20,
      },
      sort: { createdAt: -1 },
    });

    if (result.success) {
      this.allOrders = [...this.allOrders, ...result.data.items];
      this.currentPage++;

      // Verificar si hay más páginas
      const hasMore = this.allOrders.length < result.data.total;
      return { items: result.data.items, hasMore };
    }

    return { items: [], hasMore: false };
  }
}

// Uso
const orderList = new OrderList();
const { items, hasMore } = await orderList.loadMore();
console.log("Órdenes cargadas:", items.length);
console.log("¿Hay más?:", hasMore);
```

---

## Best Practices

### ✅ DO - Buenas Prácticas

1. **Usar paginación por defecto:**

   ```javascript
   // ✅ BIEN: Siempre paginar por defecto
   const products = await crudify.readItems("products", {
     pagination: { page: 1, limit: 20 },
   });
   ```

2. **Usar limit: 0 solo para colecciones pequeñas:**

   ```javascript
   // ✅ BIEN: Colección pequeña de categorías
   const categories = await crudify.readItems("categories", {
     pagination: { limit: 0 }, // OK, típicamente < 100 categorías
   });
   ```

3. **Especificar solo campos necesarios en populate:**

   ```javascript
   // ✅ BIEN: Solo campos necesarios
   const orders = await crudify.readItems("orders", {
     populate: [
       {
         path: "customerId",
         moduleKey: "customers",
         select: ["name", "email"], // Solo lo necesario
       },
     ],
   });
   ```

4. **Combinar filtros con populate:**
   ```javascript
   // ✅ BIEN: Filtrar antes de poblar
   const orders = await crudify.readItems("orders", {
     filter: { status: "pending" }, // Reduce resultados primero
     populate: [
       {
         path: "customerId",
         moduleKey: "customers",
         select: "name email",
       },
     ],
     pagination: { page: 1, limit: 20 },
   });
   ```

### ❌ DON'T - Malas Prácticas

1. **No usar limit: 0 en colecciones grandes:**

   ```javascript
   // ❌ MAL: Puede ser muy lento
   const allOrders = await crudify.readItems("orders", {
     pagination: { limit: 0 }, // Miles de órdenes!
   });
   ```

2. **No poblar todos los campos:**

   ```javascript
   // ❌ MAL: Trae datos innecesarios
   const orders = await crudify.readItems("orders", {
     populate: [
       {
         path: "customerId",
         moduleKey: "customers",
         // ❌ Sin select - trae TODOS los campos del customer
       },
     ],
   });
   ```

3. **No poblar demasiadas referencias:**

   ```javascript
   // ❌ MAL: Demasiados JOINs, lento
   const orders = await crudify.readItems("orders", {
     populate: [
       { path: "customerId", moduleKey: "customers", select: "name" },
       { path: "productIds", moduleKey: "products", select: "name" },
       { path: "shippingId", moduleKey: "shippings", select: "status" },
       { path: "paymentId", moduleKey: "payments", select: "status" },
       { path: "invoiceId", moduleKey: "invoices", select: "number" },
     ], // ❌ Demasiados populate
   });
   ```

4. **No usar paginación sin ordenamiento:**

   ```javascript
   // ❌ MAL: Resultados inconsistentes entre páginas
   const products = await crudify.readItems("products", {
     pagination: { page: 2, limit: 20 },
     // ❌ Falta sort - orden inconsistente
   });

   // ✅ BIEN: Con ordenamiento
   const products = await crudify.readItems("products", {
     pagination: { page: 2, limit: 20 },
     sort: { _id: 1 }, // Orden consistente
   });
   ```

---

## Resumen de Parámetros

### Pagination Object

```typescript
pagination: {
  page?: number;   // Default: 1
  limit?: number;  // Default: 20, usar 0 para todos los resultados
}
```

### Populate Object

```typescript
populate: Array<{
  path: string; // Campo a poblar (requerido)
  moduleKey: string; // Módulo referenciado (requerido)
  select: string | string[]; // Campos a incluir (requerido)
}>;
```

### Ejemplo Completo

```javascript
const result = await crudify.readItems("orders", {
  // Filtros
  filter: {
    status: "pending",
    createdAt: { $gte: "2024-01-01" },
  },

  // Populate
  populate: [
    {
      path: "customerId",
      moduleKey: "customers",
      select: ["name", "email", "phone"],
    },
    {
      path: "productIds",
      moduleKey: "products",
      select: "name price stock",
    },
  ],

  // Paginación
  pagination: {
    page: 1,
    limit: 25,
  },

  // Ordenamiento
  sort: {
    createdAt: -1,
    _id: 1,
  },
});

// Acceso a resultados
const { items, total } = result.data;
console.log(`Mostrando ${items.length} de ${total} órdenes`);

items.forEach((order) => {
  console.log("Order:", order._id);
  console.log("Customer:", order.customerId?.name);
  console.log("Products:", order.productIds?.map((p) => p.name).join(", "));
});
```

---

## Soporte

Para más información:

- [README Principal](../README.md)
- [Documentación Completa](../README_DEPTH.md)
- [API Reference](./overview.md)
