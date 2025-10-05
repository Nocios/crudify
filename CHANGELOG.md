# Changelog

All notable changes to @nocios/crudify-browser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive documentation structure with detailed API reference
- Enhanced TypeScript support with complete type definitions
- Performance optimization guides and best practices

### Changed

- Updated README with standardized documentation links
- Improved documentation organization following ecosystem standards

### Deprecated

- Nothing deprecated in this release

### Removed

- Nothing removed in this release

### Fixed

- Documentation consistency and API reference completeness

### Security

- Documented security implementation details and best practices
- Added secure token management guidelines

---

## [4.0.0] - 2024-01-15

### Added

- Zero-dependency architecture for minimal bundle size
- Complete TypeScript strict mode support with comprehensive type definitions
- Enhanced security with data sanitization for debug logs
- Request cancellation support with AbortController
- Comprehensive error handling with structured error codes

### Changed

- **BREAKING:** Constructor now accepts configuration object instead of individual parameters
- **BREAKING:** Updated error response structure for consistency
- **BREAKING:** Simplified response format for better developer experience
- Improved token refresh mechanism with automatic retry
- Enhanced debug logging with data sanitization

### Deprecated

- Old constructor signature (will be removed in v5.0)
- Legacy error response format

### Removed

- **BREAKING:** Removed unnecessary Vite development dependency
- **BREAKING:** Removed support for legacy authentication methods
- Obsolete utility functions and deprecated APIs

### Fixed

- ✅ **Parsing JSON Inseguro** - Implemented comprehensive security validations
- ✅ **Vulnerabilidad en Dependencia Vite** - Removed unnecessary dependency
- ✅ **Logs de Debug Exponen Información Sensible** - Added data sanitization
- Memory leaks in token refresh mechanism
- Race conditions in concurrent API calls
- Token refresh timing edge cases

### Security

- **Enhanced Input Validation:** Comprehensive validation for all API inputs
- **Secure Debug Logging:** Sensitive data sanitization in debug output
- **Token Security:** Improved token storage and refresh mechanisms
- **Request Security:** Enhanced security headers and CSRF protection

---

## [3.2.1] - 2023-12-01

### Fixed

- Token refresh race condition in concurrent requests
- Memory leak in event listeners
- TypeScript declaration file exports

### Security

- Updated security headers for API requests
- Enhanced token validation

## [3.2.0] - 2023-11-15

### Added

- Transaction support for atomic operations
- File upload/download with signed URLs
- Request timeout configuration
- Retry mechanism for failed requests

### Changed

- Improved error messages with more context
- Enhanced debugging capabilities

### Fixed

- Network error handling edge cases
- Token expiration edge case handling

## [3.1.0] - 2023-10-01

### Added

- Public API operations (no authentication required)
- Advanced filtering with MongoDB-style operators
- Pagination support for large datasets
- Sorting capabilities

### Changed

- Optimized bundle size for better performance
- Improved TypeScript definitions

### Fixed

- Authentication state persistence across page reloads
- CORS handling in development environments

---

## Release Guidelines

### Version Numbering

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backwards compatible manner
- **PATCH** version when you make backwards compatible bug fixes

### Change Categories

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Breaking Changes Policy

Breaking changes are only introduced in major versions and include:

1. **API Method Changes:**

   - Method signature modifications
   - Return value structure changes
   - Required parameter additions

2. **Constructor Changes:**

   - Configuration object structure changes
   - Required option additions
   - Default behavior modifications

3. **Error Handling Changes:**

   - Error object structure changes
   - Error code modifications
   - Exception type changes

4. **TypeScript Changes:**
   - Type definition modifications
   - Interface changes
   - Generic parameter changes

### Migration Support

- Migration guides provided for all major versions
- Deprecated features maintained for at least one major version
- TypeScript definitions updated to reflect breaking changes
- Comprehensive examples for migration scenarios

## Contributing to Changelog

When making changes to the SDK:

1. **Always update this changelog** with your changes
2. **Add entries under [Unreleased]** section
3. **Categorize changes appropriately** (Added, Changed, Fixed, etc.)
4. **Include method names** affected by changes
5. **Document breaking changes** with migration instructions
6. **Reference issue numbers** when applicable (e.g., "Fixed authentication bug (#456)")
7. **Include bundle size impact** for significant changes
8. **Document security implications** of changes

### Example Entry Format

```markdown
## [4.1.0] - 2024-02-15

### Added

- New `batch()` method for executing multiple operations efficiently
- Enhanced caching mechanism with configurable TTL
- Request deduplication for improved performance

### Changed

- Updated `readItems()` to support advanced filtering options
- Improved error messages with more detailed context
- Enhanced TypeScript definitions for better IDE support

### Fixed

- Fixed race condition in token refresh mechanism
- Resolved memory leak in event listener cleanup
- Fixed edge case in network error handling

### Security

- Enhanced input validation for all API methods
- Improved token storage encryption
- Added request signature validation
```

For more details on contributing, see the [Contributing Guidelines](docs/contributing.md).
