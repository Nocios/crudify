/**
 * Defines the logging level for Crudify operations.
 * 'none': No logs will be output.
 * 'debug': Detailed logs for requests, responses, and internal processes will be output.
 */
export type CrudifyLogLevel = "none" | "debug";

/**
 * Represents the structure of an issue or error, typically for field-level errors.
 */
export type CrudifyIssue = {
  path: Array<string | number>;
  message: string;
};

/**
 * Specifies the Crudify environment to connect to.
 * 'dev': Development environment.
 * 'stg': Staging environment.
 * 'api': Production environment (or a general API endpoint).
 * 'prod': Production environment (or a general API endpoint).
 */
export type CrudifyEnvType = "dev" | "stg" | "api" | "prod";

/**
 * Represents a JSON string, typically used for data payloads in AWS services or GraphQL.
 */
export type CrudifyAWSJSON = string;

/**
 * Defines the structure of the public-facing response from Crudify SDK methods.
 */
export type CrudifyResponse = {
  success: boolean;
  data?: object | any | null;
  errors?: string[];
};

/**
 * Internal representation of a response within Crudify, potentially more detailed.
 */
export type InternalCrudifyResponseType = {
  success: boolean;
  data?: any;
  fieldsWarning?: any;
  errors?: any;
};

/**
 * Describes the public interface of the Crudify client instance.
 * This is for documentation and understanding; tsup will generate the actual
 * module interface from the Crudify class implementation.
 */
export interface CrudifyPublicAPI {
  getLogLevel: () => CrudifyLogLevel;
  config: (env: CrudifyEnvType) => void;
  init: (publicApiKey: string, logLevel?: CrudifyLogLevel) => Promise<void>;
  login: (identifier: string, password: string) => Promise<CrudifyResponse>;
  logout: () => Promise<CrudifyResponse>;
  isLogin: () => boolean;
  getPermissions: () => Promise<CrudifyResponse>;
  createItem: (moduleKey: string, data: object) => Promise<CrudifyResponse>;
  readItem: (moduleKey: string, filter: { _id: string } | object) => Promise<CrudifyResponse>;
  readItems: (moduleKey: string, filter: object) => Promise<CrudifyResponse>;
  updateItem: (moduleKey: string, data: object) => Promise<CrudifyResponse>;
  deleteItem: (moduleKey: string, id: string) => Promise<CrudifyResponse>;
  transaction: (data: any) => Promise<CrudifyResponse>;
  shutdown: () => Promise<void>;
}
