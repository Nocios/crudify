// src/types/global.d.ts

/**
 * Defines the logging level for Crudify operations.
 * 'none': No logs will be output.
 * 'debug': Detailed logs for requests, responses, and internal processes will be output.
 */
type CrudifyLogLevel = "none" | "debug";

/**
 * Represents the structure of an issue or error, typically for field-level errors.
 */
type CrudifyIssue = {
  path: Array<string | number>; // Path to the field causing the issue
  message: string; // Error message
};

/**
 * Specifies the Crudify environment to connect to.
 * 'dev': Development environment.
 * 'stg': Staging environment.
 * 'api': Production environment (or a general API endpoint).
 * 'prod': Production environment (or a general API endpoint).
 */
type CrudifyEnvType = "dev" | "stg" | "api" | "prod";

/**
 * Represents a JSON string, typically used for data payloads in AWS services or GraphQL.
 */
type CrudifyAWSJSON = string;

/**
 * Defines the structure of the public-facing response from Crudify SDK methods.
 */
type CrudifyResponse = {
  success: boolean; // Indicates if the operation was successful.
  data?: object | any | null; // Data returned by the operation. Using 'any' for flexibility from 'object | null'.
  errors?: string[]; // An array of error messages if the operation failed or had issues.
  // This is simplified from more complex internal error structures.
};

/**
 * Internal representation of a response within Crudify, potentially more detailed.
 */
type InternalCrudifyResponseType = {
  success: boolean;
  data?: any;
  fieldsWarning?: any;
  errors?: any; // Can be Record<string, string[]>, { _error: string[] }, etc.
};

/**
 * Describes the public interface of the Crudify client instance.
 * This is for documentation and understanding; tsup will generate the actual
 * module interface from the Crudify class implementation.
 */
interface CrudifyPublicAPI {
  getLogLevel: () => CrudifyLogLevel;
  config: (env: CrudifyEnvType) => void;
  init: (publicApiKey: string, logLevel?: CrudifyLogLevel) => Promise<void>;
  login: (identifier: string, password: string) => Promise<CrudifyResponse>;
  logout: () => Promise<CrudifyResponse>;
  getPermissions: () => Promise<CrudifyResponse>;
  createItem: (moduleKey: string, data: object) => Promise<CrudifyResponse>;
  readItem: (moduleKey: string, filter: { _id: string } | object) => Promise<CrudifyResponse>; // Made filter more generic
  readItems: (moduleKey: string, filter: object) => Promise<CrudifyResponse>;
  updateItem: (moduleKey: string, data: object) => Promise<CrudifyResponse>;
  deleteItem: (moduleKey: string, id: string) => Promise<CrudifyResponse>; // Aligned with user's desired signature
  transaction: (data: any) => Promise<CrudifyResponse>;
  shutdown: () => Promise<void>;
}
