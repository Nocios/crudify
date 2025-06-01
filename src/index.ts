import type {
  RequestInit as UndiciRequestInit,
  HeadersInit as UndiciHeadersInit,
  BodyInit as UndiciBodyInit,
  Response as UndiciResponse,
  Agent as UndiciAgentClassType, // For typing undiciAgentDispatcher
} from "undici";
import type CacheableLookupClassType from "cacheable-lookup"; // For typing cacheableInstance
import type { LookupFunction as NetLookupFunction } from "net";

// --- Start of Isomorphic Setup ---
const IS_BROWSER = typeof window !== "undefined" && typeof window.document !== "undefined";

// These will hold the dynamically imported modules or their instances for Node.js
let cacheableInstance: CacheableLookupClassType | null = null;
let undiciAgentDispatcher: UndiciAgentClassType | undefined = undefined;
let undiciFetchOriginalForNode: ((url: string | URL, options?: UndiciRequestInit) => Promise<UndiciResponse>) | null = null;

// Promise to ensure Node.js specific modules are loaded and initialized before use
let nodeSpecificsSetupPromise: Promise<void> | null = null;

// Function to dynamically import and initialize Node.js specific modules
function initializeNodeSpecifics(): Promise<void> {
  // This function should only be called if !IS_BROWSER
  // It returns a promise that resolves when setup is complete or rejects on error.
  return (async () => {
    try {
      // Dynamically import Node.js modules
      const { Agent: ActualUndiciAgentClass, fetch: actualUndiciFetch } = await import("undici");
      // Assuming cacheable-lookup exports its class as default (common for CJS modules)
      const CacheableLookupActualClass = (await import("cacheable-lookup")).default;

      cacheableInstance = new CacheableLookupActualClass({ maxTtl: 300_000, fallbackDuration: 30_000 });
      undiciAgentDispatcher = new ActualUndiciAgentClass({
        keepAliveTimeout: 60_000,
        connections: 10,
        pipelining: 1,
        connect: { lookup: cacheableInstance.lookup as unknown as NetLookupFunction },
      });
      undiciFetchOriginalForNode = actualUndiciFetch;

      // Access logLevel via Crudify.getInstance() after ensuring instance exists or by passing it.
      // For simplicity here, direct console.log or conditional check if Crudify instance is available.
      // console.log("Node.js specific modules (undici, cacheable-lookup) initialized dynamically.");
    } catch (error) {
      console.error("FATAL: Failed to dynamically initialize Node.js specific modules (undici, cacheable-lookup).", error);
      // This error is critical for Node.js operation.
      throw new Error(`Node.js specific modules failed to load: ${error}`);
    }
  })();
}

if (!IS_BROWSER) {
  nodeSpecificsSetupPromise = initializeNodeSpecifics();
  nodeSpecificsSetupPromise.catch((err) => {
    // Catch potential errors during initial setup call.
    // _fetch and shutdown methods will also check/handle the setup status.
    console.error("Initial Node.js specifics setup failed:", err.message);
  });
}

// Universal fetch function
const _fetch = async (
  url: globalThis.RequestInfo,
  options?: globalThis.RequestInit & { dispatcher?: any }
): Promise<globalThis.Response> => {
  if (IS_BROWSER) {
    const { dispatcher, ...browserOptions } = options || {};
    return window.fetch(url, browserOptions as globalThis.RequestInit);
  } else {
    // Node.js environment
    if (nodeSpecificsSetupPromise) {
      try {
        await nodeSpecificsSetupPromise; // Ensure Node.js modules are loaded and initialized
      } catch (setupError) {
        // If setup failed, throw a more specific error before trying to use modules.
        throw new Error(`Node.js HTTP client setup failed: ${(setupError as Error).message}. Cannot proceed with fetch.`);
      }
    }

    // After awaiting, check if the necessary functions/objects were actually set up
    if (!undiciFetchOriginalForNode || !undiciAgentDispatcher) {
      throw new Error("Node.js HTTP client (undici) is not available or failed to initialize. Check for earlier errors during setup.");
    }

    const { dispatcher, ...restOptions } = options || {};
    const nodeOptions: UndiciRequestInit = {
      ...restOptions,
      headers: restOptions.headers as UndiciHeadersInit,
      body: restOptions.body as UndiciBodyInit,
      dispatcher: undiciAgentDispatcher, // Use the initialized dispatcher
    };

    const undiciNodeResponse: UndiciResponse = await undiciFetchOriginalForNode(url as string | URL, nodeOptions);
    return undiciNodeResponse as unknown as globalThis.Response;
  }
};
// --- End of Isomorphic Setup ---

type LogLevel = "none" | "debug";

type ResponseType = { success: boolean; data?: any; fieldsWarning?: any; errors?: any };

const queryInit = `
query Init($apiKey: String!) {
  response:init(apiKey: $apiKey) {
    apiEndpoint
    apiKeyEndpoint
  }
}`;

const mutationLogin = `
mutation MyMutation($username: String, $email: String, $password: String!) {
  response:login(username: $username, email: $email, password: $password) {
    data
    status
    fieldsWarning
  }
}
`;

const queryGetPermissions = `
query MyQuery {
  response:getPermissions {
    data
    status
    fieldsWarning
  }
}
`;

const mutationCreateItem = `
mutation MyMutation($moduleKey: String!, $data: AWSJSON) {
  response:createItem(moduleKey: $moduleKey, data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

const queryReadItem = `
query MyQuery($moduleKey: String!, $data: AWSJSON) {
  response:readItem(moduleKey: $moduleKey, data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

const queryReadItems = `
query MyQuery($moduleKey: String!, $data: AWSJSON) {
  response:readItems(moduleKey: $moduleKey, data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

const mutationUpdateItem = `
mutation MyMutation($moduleKey: String!, $data: AWSJSON) {
  response:updateItem(moduleKey: $moduleKey, data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

const mutationDeleteItem = `
mutation MyMutation($moduleKey: String!, $data: AWSJSON) {
  response:deleteItem(moduleKey: $moduleKey, data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

const mutationTransaction = `
mutation MyMutation($data: AWSJSON) {
  response:transaction(data: $data) {
    data
    status
    fieldsWarning
  }
}
`;

type Issue = {
  path: Array<string | number>;
  message: string;
};

type EnvType = "dev" | "stg" | "api";

const dataMasters = {
  dev: { ApiMetadata: "https://auth.dev.crudify.io", ApiKeyMetadata: "da2-pl3xidupjnfwjiykpbp75gx344" },
  stg: { ApiMetadata: "https://auth.stg.crudify.io", ApiKeyMetadata: "da2-hooybwpxirfozegx3v4f3kaelq" },
  api: { ApiMetadata: "https://auth.api.crudify.io", ApiKeyMetadata: "da2-5hhytgms6nfxnlvcowd6crsvea" },
  prod: { ApiMetadata: "https://auth.api.crudify.io", ApiKeyMetadata: "da2-5hhytgms6nfxnlvcowd6crsvea" },
};

class Crudify {
  private static instance: Crudify;
  private static ApiMetadata = dataMasters.api.ApiMetadata || "https://auth.api.crudify.io";
  private static ApiKeyMetadata = dataMasters.api.ApiKeyMetadata || "da2-5hhytgms6nfxnlvcowd6crsvea";

  private publicApiKey: string = "";
  private token: string = "";

  private logLevel: LogLevel = "none";
  private apiKey: string = "";
  private endpoint: string = "";

  private constructor() {}

  public getLogLevel = (): LogLevel => {
    return this.logLevel;
  };

  public config = (env: EnvType): void => {
    Crudify.ApiMetadata = dataMasters[env].ApiMetadata || dataMasters.api.ApiMetadata || "https://auth.api.crudify.io";
    Crudify.ApiKeyMetadata = dataMasters[env].ApiKeyMetadata || dataMasters.api.ApiKeyMetadata || "da2-5hhytgms6nfxnlvcowd6crsvea";
  };

  public init = async (publicApiKey: string, logLevel?: LogLevel): Promise<void> => {
    this.logLevel = logLevel || "none";
    this.publicApiKey = publicApiKey;
    this.token = "";

    if (this.logLevel === "debug" && !IS_BROWSER && nodeSpecificsSetupPromise) {
      // Optional: Log dynamic import setup status for Node.js debug mode
      nodeSpecificsSetupPromise
        .then(() => console.log("Node-specific modules (undici, cacheable-lookup) confirmed initialized dynamically during Crudify init."))
        .catch((err) => console.error("Error during Node-specific module initialization確認 during Crudify init:", err.message));
    }

    const response = await _fetch(Crudify.ApiMetadata, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Crudify.ApiKeyMetadata },
      body: JSON.stringify({ query: queryInit, variables: { apiKey: publicApiKey } }),
    });

    const data: any = await response.json();

    if (this.logLevel === "debug") {
      console.log("Init response:", data);
      console.log("Crudify Metadata URL:", Crudify.ApiMetadata);
      console.log("Crudify Metadata API Key:", Crudify.ApiKeyMetadata);
      if (!IS_BROWSER) {
        console.log("Running in Node.js environment. Attempted dynamic load for Undici dispatcher.");
      } else {
        console.log("Running in Browser environment. Using global fetch.");
      }
    }

    if (data?.data?.response) {
      const { response: initResponse } = data.data;
      this.endpoint = initResponse.apiEndpoint;
      this.apiKey = initResponse.apiKeyEndpoint;
    } else {
      console.error("Init response error:", data.errors || data);
      throw new Error("Failed to initialize Crudify, check your API key or network.");
    }
  };

  private formatErrors = (issues: Issue[]): Record<string, string[]> => {
    if (this.logLevel === "debug") console.log("Issues:", issues);

    return issues.reduce((acc, issue) => {
      const key = String(issue.path[0] ?? "_");
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue.message.toUpperCase());
      return acc;
    }, {} as Record<string, string[]>);
  };

  private formatResponse = (response: any): ResponseType => {
    if (response.errors)
      return { success: false, errors: response.errors.map((err: any) => err.message || "UNKNOWN_ERROR") as Record<string, string[]> };

    if (!response.data || !response.data.response) {
      if (this.logLevel === "debug") {
        console.error("FormatResponse: Invalid response structure", response);
      }
      return { success: false, errors: { _error: ["INVALID_RESPONSE_STRUCTURE"] } };
    }

    const status = response.data.response.status ?? "Unknown";
    let dataResponse;
    try {
      dataResponse = response.data.response.data ? JSON.parse(response.data.response.data) : null;
    } catch (e) {
      if (this.logLevel === "debug") {
        console.error("FormatResponse: Failed to parse data", response.data.response.data);
      }
      if (status === "OK" || status === "WARNING") {
        return { success: false, errors: { _error: ["INVALID_DATA_FORMAT"] } };
      }
      dataResponse = response.data.response.data;
    }

    if (this.logLevel === "debug") {
      console.log("Response for formatting:", response);
      console.log("Status:", status);
      console.log("Parsed data for formatting (dataResponse):", dataResponse);
    }

    switch (status) {
      case "OK":
      case "WARNING":
        return { success: true, data: dataResponse, fieldsWarning: response.data.response.fieldsWarning };
      case "FIELD_ERROR":
        return { success: false, errors: this.formatErrors(dataResponse as Issue[]) };
      case "ITEM_NOT_FOUND":
        return { success: false, errors: { _id: ["ITEM_NOT_FOUND"] } };
      case "ERROR": {
        if (Array.isArray(dataResponse)) {
          const formatted = (dataResponse as any[]).map(({ action, response: opRes }) => {
            if (opRes.status === "FIELD_ERROR") {
              return { action, status: opRes.status, errors: this.formatErrors(opRes.errors as Issue[]) };
            }
            return { action, status: opRes.status, data: opRes.data ? JSON.parse(opRes.data) : null };
          });
          return { success: false, data: formatted };
        }
        return { success: false, errors: dataResponse };
      }
      default:
        return { success: false, errors: { _error: [status] } };
    }
  };

  public login = async (identifier: string, password: string): Promise<ResponseType> => {
    if (!this.endpoint || !this.apiKey) throw new Error("Please call init() method first.");

    const email: string | undefined = identifier.includes("@") ? identifier : undefined;
    const username: string | undefined = identifier.includes("@") ? undefined : identifier;

    const response = await this.executeQuery(mutationLogin, { username, email, password }, { "x-api-key": this.apiKey });

    if (response.data?.response?.status === "OK") {
      const parsedData = JSON.parse(response.data.response.data);
      this.token = parsedData.token;
      if (this.logLevel === "debug") console.info("Version:", parsedData.version);
    }

    const formatedResponse = this.formatResponse(response);
    if (formatedResponse.success) {
      delete formatedResponse.data;
      delete formatedResponse.fieldsWarning;
    }
    return formatedResponse;
  };

  public logout = async (): Promise<ResponseType> => {
    this.token = "";
    return { success: true };
  };

  public getPermissions = async (): Promise<ResponseType> => {
    const response = await this.executeQuery(
      queryGetPermissions,
      {},
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public createItem = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationCreateItem,
      { moduleKey, data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public readItem = async (moduleKey: string, data: { _id: string }): Promise<ResponseType> => {
    const response = await this.executeQuery(
      queryReadItem,
      { moduleKey, data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public readItems = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      queryReadItems,
      { moduleKey, data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public updateItem = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationUpdateItem,
      { moduleKey, data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public deleteItem = async (moduleKey: string, data: { _id: string }): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationDeleteItem,
      { moduleKey, data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  public transaction = async (data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationTransaction,
      { data: JSON.stringify(data) },
      { ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }) }
    );
    return this.formatResponse(response);
  };

  private executeQuery = async (query: string, variables = {}, extraHeaders: { [key: string]: string }) => {
    if (!this.endpoint || !this.apiKey) {
      throw new Error("Crudify is not properly initialized. Missing api key.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-subscriber-key": this.publicApiKey,
      ...extraHeaders,
    };

    if (this.logLevel === "debug") {
      console.log("Executing query to:", this.endpoint);
      console.log("Headers for executeQuery:", headers);
      console.log("Query:", query);
      console.log("Variables:", variables);
    }

    const response = await _fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const responseData: any = await response.json();
    if (this.logLevel === "debug") {
      console.log("Raw response from executeQuery:", responseData);
    }
    return responseData;
  };

  public static getInstance(): Crudify {
    if (!Crudify.instance) Crudify.instance = new Crudify();
    return Crudify.instance;
  }

  public async shutdown() {
    if (!IS_BROWSER) {
      if (nodeSpecificsSetupPromise) {
        try {
          await nodeSpecificsSetupPromise; // Ensure setup attempt is complete
        } catch (e) {
          if (this.logLevel === "debug") {
            console.warn("Node specifics setup may have failed during shutdown check:", (e as Error).message);
          }
        }
      }
      // Check if dispatcher was successfully initialized before trying to close
      if (undiciAgentDispatcher) {
        if (this.logLevel === "debug") console.log("Shutting down Undici agent dispatcher.");
        await undiciAgentDispatcher.close();
      } else if (this.logLevel === "debug") {
        console.log("Shutdown: Undici agent dispatcher was not initialized or setup failed.");
      }
    } else if (this.logLevel === "debug") {
      console.log("Shutdown called, no action needed for browser environment.");
    }
  }
}

export default Crudify.getInstance();
export type { EnvType, LogLevel, ResponseType, Issue };

type AWSJSON = string;
