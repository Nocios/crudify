# Tests para npm-crudify-core

Este proyecto incluye una suite completa de tests unitarios y end-to-end (e2e) utilizando Vitest.

## Estructura de Tests

```
tests/
├── unit/                           # Tests unitarios
│   ├── token-validation.test.ts   # Tests de validación de tokens JWT
│   ├── response-formatting.test.ts # Tests de formateo de respuestas
│   ├── configuration.test.ts       # Tests de configuración
│   ├── auth-operations.test.ts     # Tests de autenticación
│   └── crud-operations.test.ts     # Tests de operaciones CRUD
├── e2e/                            # Tests end-to-end
│   ├── auth-flow.e2e.test.ts      # Flujo completo de autenticación
│   ├── refresh-token-flow.e2e.test.ts # Flujo de refresh tokens
│   └── complete-user-flow.e2e.test.ts # Flujo completo de usuario
└── README.md                       # Este archivo
```

## Comandos Disponibles

### Ejecutar tests en modo watch (desarrollo)
```bash
npm test
```

### Ejecutar tests una vez (CI/CD)
```bash
npm run test:run
```

### Ejecutar tests con interfaz visual
```bash
npm run test:ui
```

### Generar reporte de cobertura
```bash
npm run test:coverage
```

## Cobertura de Tests

### Tests Unitarios (77 tests)

#### Token Validation (12 tests)
- ✅ Validación de tokens JWT
- ✅ Detección de tokens expirados
- ✅ Validación de tipos de token (access vs refresh)
- ✅ Gestión de tokens (setTokens, getTokenData)
- ✅ Logout y limpieza de tokens

#### Response Formatting (21 tests)
- ✅ Formateo de errores de campos
- ✅ Sanitización de datos sensibles
- ✅ Detección de propiedades peligrosas
- ✅ Manejo de respuestas GraphQL
- ✅ Validación de tamaño de datos
- ✅ Manejo de JSON inválido

#### Configuration (10 tests)
- ✅ Configuración de entornos (dev, stg, api, prod)
- ✅ Niveles de logging
- ✅ Interceptores de respuestas
- ✅ Callbacks de invalidación de tokens

#### Auth Operations (17 tests)
- ✅ Inicialización del SDK
- ✅ Login con email/username
- ✅ Manejo de errores de autenticación
- ✅ Refresh de tokens
- ✅ Prevención de race conditions
- ✅ Logout

#### CRUD Operations (23 tests)
- ✅ createItem / createItemPublic
- ✅ readItem / readItems
- ✅ updateItem
- ✅ deleteItem
- ✅ transaction
- ✅ getPermissions
- ✅ getStructure / getStructurePublic
- ✅ generateSignedUrl
- ✅ Soporte para AbortSignal

### Tests End-to-End (23 tests)

#### Auth Flow (5 tests)
- ✅ Flujo completo: init → login → logout
- ✅ Manejo de errores de login y retry
- ✅ Restauración de sesión desde tokens guardados
- ✅ Callbacks de invalidación de tokens
- ✅ Re-inicialización con diferentes entornos

#### Refresh Token Flow (6 tests)
- ✅ Auto-refresh antes de operaciones críticas
- ✅ Retry automático después de 401
- ✅ Limpieza de tokens cuando el refresh falla
- ✅ Manejo de refreshes concurrentes
- ✅ Prevención de refreshes innecesarios
- ✅ Detección de tokens por expirar

#### Complete User Flow (6 tests)
- ✅ Flujo completo de aplicación
- ✅ Transacciones con múltiples operaciones
- ✅ Interceptores de respuestas
- ✅ Upload de archivos con signed URLs
- ✅ Cancelación de requests con AbortSignal
- ✅ Operaciones públicas sin autenticación

## Características de Testing

### Mocking
- ✅ Mock completo de `fetch` API
- ✅ Mock de respuestas GraphQL
- ✅ Mock de tokens JWT
- ✅ Simulación de errores de red

### Validaciones
- ✅ Validación de estructura de respuestas
- ✅ Validación de manejo de errores
- ✅ Validación de seguridad (sanitización)
- ✅ Validación de flujos de autenticación

### Escenarios
- ✅ Casos exitosos (happy path)
- ✅ Casos de error (error handling)
- ✅ Casos de borde (edge cases)
- ✅ Flujos complejos (complex flows)

## Tecnologías Utilizadas

- **Vitest**: Framework de testing rápido y moderno
- **Happy DOM**: Entorno DOM ligero para tests
- **Vi**: Librería de mocking incluida en Vitest

## Notas Importantes

1. **Singleton Pattern**: Los tests reinician el estado del singleton Crudify antes de cada test
2. **Mocking de Fetch**: Se usa `globalThis.fetch` para compatibilidad con el entorno browser
3. **Tokens JWT**: Los tests usan tokens JWT simulados pero con estructura válida
4. **Async/Await**: Todos los tests async usan async/await para mejor legibilidad

## Contribuir

Al agregar nuevas funcionalidades, asegúrate de:

1. Escribir tests unitarios para métodos nuevos
2. Actualizar tests e2e si afectan flujos completos
3. Mantener cobertura de tests > 80%
4. Ejecutar `npm run test:run` antes de hacer commit
