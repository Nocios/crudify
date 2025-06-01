import { _fetch, shutdownNodeSpecifics, IS_BROWSER, getInternalNodeSpecificsSetupPromise } from "./isomorphic-fetch";
import { CrudifyEnvType, CrudifyIssue, CrudifyLogLevel, CrudifyPublicAPI, CrudifyResponse, InternalCrudifyResponseType } from "./types";

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

const dataMasters = {
  dev: { ApiMetadata: "https://auth.dev.crudify.io", ApiKeyMetadata: "da2-pl3xidupjnfwjiykpbp75gx344" },
  stg: { ApiMetadata: "https://auth.stg.crudify.io", ApiKeyMetadata: "da2-hooybwpxirfozegx3v4f3kaelq" },
  api: { ApiMetadata: "https://auth.api.crudify.io", ApiKeyMetadata: "da2-5hhytgms6nfxnlvcowd6crsvea" },
  prod: { ApiMetadata: "https://auth.api.crudify.io", ApiKeyMetadata: "da2-5hhytgms6nfxnlvcowd6crsvea" },
};

class Crudify implements CrudifyPublicAPI {
  private static instance: Crudify;
  private static ApiMetadata = dataMasters.api.ApiMetadata;
  private static ApiKeyMetadata = dataMasters.api.ApiKeyMetadata;

  private publicApiKey: string = "";
  private token: string = "";

  private logLevel: CrudifyLogLevel = "none";
  private apiKey: string = "";
  private endpoint: string = "";

  private constructor() {}

  public getLogLevel = (): CrudifyLogLevel => {
    return this.logLevel;
  };

  public config = (env: CrudifyEnvType): void => {
    const selectedEnv = env || "api"; // Default to api if env is not valid
    Crudify.ApiMetadata = dataMasters[selectedEnv]?.ApiMetadata || dataMasters.api.ApiMetadata;
    Crudify.ApiKeyMetadata = dataMasters[selectedEnv]?.ApiKeyMetadata || dataMasters.api.ApiKeyMetadata;
  };

  public init = async (publicApiKey: string, logLevel?: CrudifyLogLevel): Promise<void> => {
    this.logLevel = logLevel || "none";
    this.publicApiKey = publicApiKey;
    this.token = "";

    if (this.logLevel === "debug" && !IS_BROWSER) {
      const nodePromise = getInternalNodeSpecificsSetupPromise();
      if (nodePromise) {
        nodePromise
          .then(() => console.log("Crudify: Node-specific modules confirmed initialized during Crudify init."))
          .catch((err) =>
            console.error("Crudify: Error during Node-specific module initialization check during Crudify init:", err.message)
          );
      }
    }

    const response = await _fetch(Crudify.ApiMetadata, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Crudify.ApiKeyMetadata },
      body: JSON.stringify({ query: queryInit, variables: { apiKey: publicApiKey } }),
    });

    const data: any = await response.json();

    if (this.logLevel === "debug") {
      console.log("Crudify Init Response:", data);
      console.log("Crudify Metadata URL:", Crudify.ApiMetadata);
      if (!IS_BROWSER) console.log("Crudify: Running in Node.js environment.");
      else console.log("Crudify: Running in Browser environment.");
    }

    if (data?.data?.response) {
      const { response: initResponse } = data.data;
      this.endpoint = initResponse.apiEndpoint;
      this.apiKey = initResponse.apiKeyEndpoint;
    } else {
      console.error("Crudify Init Error:", data.errors || data);
      throw new Error("Failed to initialize Crudify. Check API key or network.");
    }
  };

  private formatErrorsInternal = (issues: CrudifyIssue[]): Record<string, string[]> => {
    if (this.logLevel === "debug") console.log("Crudify FormatErrors Issues:", issues);
    return issues.reduce((acc, issue) => {
      const key = String(issue.path[0] ?? "_");
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue.message.toUpperCase());
      return acc;
    }, {} as Record<string, string[]>);
  };

  private formatResponseInternal = (response: any): InternalCrudifyResponseType => {
    if (response.errors) {
      // GraphQL level errors
      const errorMessages = response.errors.map((err: any) => String(err.message || "UNKNOWN_GRAPHQL_ERROR"));
      return { success: false, errors: { _graphql: errorMessages } }; // Standardize GraphQL errors
    }

    if (!response.data || !response.data.response) {
      if (this.logLevel === "debug") console.error("Crudify FormatResponse: Invalid response structure", response);
      return { success: false, errors: { _error: ["INVALID_RESPONSE_STRUCTURE"] } };
    }

    const apiResponse = response.data.response;
    const status = apiResponse.status ?? "Unknown";
    let dataResponse;

    try {
      dataResponse = apiResponse.data ? JSON.parse(apiResponse.data) : null;
    } catch (e) {
      if (this.logLevel === "debug") console.error("Crudify FormatResponse: Failed to parse data", apiResponse.data, e);
      if (status === "OK" || status === "WARNING") {
        // If status was OK/Warning but data parsing failed, it's an error.
        return { success: false, errors: { _error: ["INVALID_DATA_FORMAT_IN_SUCCESSFUL_RESPONSE"] } };
      }
      dataResponse = { _raw: apiResponse.data, _parsingError: (e as Error).message }; // Keep raw data if parsing fails on error status
    }

    if (this.logLevel === "debug") {
      console.log("Crudify FormatResponse Status:", status);
      console.log("Crudify FormatResponse Parsed Data (dataResponse):", dataResponse);
    }

    switch (status) {
      case "OK":
      case "WARNING":
        return { success: true, data: dataResponse, fieldsWarning: apiResponse.fieldsWarning };
      case "FIELD_ERROR":
        return { success: false, errors: this.formatErrorsInternal(dataResponse as CrudifyIssue[]) };
      case "ITEM_NOT_FOUND":
        return { success: false, errors: { _id: ["ITEM_NOT_FOUND"] } };
      case "ERROR":
        if (Array.isArray(dataResponse)) {
          // For transactions
          const formattedTransaction = dataResponse.map(({ action, response: opRes }) => {
            let opData = null;
            let opErrors: any = opRes.errors; // Default to original errors
            try {
              opData = opRes.data ? JSON.parse(opRes.data) : null;
            } catch (e) {
              opData = { _raw: opRes.data, _parsingError: (e as Error).message };
            }
            if (opRes.status === "FIELD_ERROR" && opRes.errors) {
              opErrors = this.formatErrorsInternal(opRes.errors as CrudifyIssue[]);
            }
            return { action, status: opRes.status, data: opData, errors: opErrors, fieldsWarning: opRes.fieldsWarning };
          });
          return { success: false, data: formattedTransaction, errors: { _transaction_errors: ["One or more operations failed"] } };
        }
        return { success: false, errors: dataResponse }; // Raw error data from API
      default:
        return { success: false, errors: { _error: [status || "UNKNOWN_ERROR_STATUS"] } };
    }
  };

  private adaptToPublicResponse = (internalResp: InternalCrudifyResponseType): CrudifyResponse => {
    let publicErrors: string[] | undefined = undefined;

    if (internalResp.errors) {
      const collectedErrors: string[] = [];
      if (Array.isArray(internalResp.errors)) {
        // Typically direct string arrays or array of error objects
        internalResp.errors.forEach((err) => {
          if (typeof err === "string") collectedErrors.push(err);
          else if (err && typeof err.message === "string") collectedErrors.push(err.message); // For GraphQL like error objects
        });
      } else if (typeof internalResp.errors === "object") {
        Object.values(internalResp.errors).forEach((val) => {
          if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === "string") collectedErrors.push(item);
            });
          } else if (typeof val === "string") {
            collectedErrors.push(val);
          }
        });
      } else if (typeof internalResp.errors === "string") {
        collectedErrors.push(internalResp.errors);
      }

      if (collectedErrors.length > 0) {
        publicErrors = collectedErrors;
      } else if (Object.keys(internalResp.errors).length > 0 && collectedErrors.length === 0) {
        // If there were errors but couldn't be mapped, provide a generic message
        publicErrors = ["An error occurred. Check logs for details."];
        if (this.logLevel === "debug") console.warn("Crudify AdaptToPublicResponse: Unmapped errors:", internalResp.errors);
      }
    }

    return {
      success: internalResp.success,
      data: internalResp.data, // Keep data as 'any' from internal for now, matches CrudifyResponse.data?: any
      errors: publicErrors,
    };
  };

  private async performCrudOperation(query: string, variables: object): Promise<CrudifyResponse> {
    if (!this.endpoint || !this.apiKey) throw new Error("Crudify: Not initialized. Call init() first.");
    const rawResponse = await this.executeQuery(query, variables, {
      ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }),
    });
    return this.adaptToPublicResponse(this.formatResponseInternal(rawResponse));
  }

  public login = async (identifier: string, password: string): Promise<CrudifyResponse> => {
    if (!this.endpoint || !this.apiKey) throw new Error("Crudify: Not initialized. Call init() first.");

    const email: string | undefined = identifier.includes("@") ? identifier : undefined;
    const username: string | undefined = identifier.includes("@") ? undefined : identifier;

    const rawResponse = await this.executeQuery(mutationLogin, { username, email, password }, { "x-api-key": this.apiKey });
    const internalResponse = this.formatResponseInternal(rawResponse);

    if (internalResponse.success && internalResponse.data?.token) {
      this.token = internalResponse.data.token;
      if (this.logLevel === "debug" && internalResponse.data?.version) {
        console.info("Crudify Login Version:", internalResponse.data.version);
      }
    }
    // The public response should not contain the token or version directly in `data` for login
    // The `adaptToPublicResponse` will handle the general structure.
    // For login, success itself indicates token is stored.
    const publicResponse = this.adaptToPublicResponse(internalResponse);
    if (publicResponse.success) {
      // For login, data field is not typically returned or should be empty/status object
      publicResponse.data = { loginStatus: "successful" };
    }
    return publicResponse;
  };

  public logout = async (): Promise<CrudifyResponse> => {
    this.token = "";
    return { success: true }; // No server interaction, simple success
  };

  public getPermissions = async (): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryGetPermissions, {});
  };

  public createItem = async (moduleKey: string, data: object): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationCreateItem, { moduleKey, data: JSON.stringify(data) });
  };

  public readItem = async (moduleKey: string, filter: { _id: string } | object): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryReadItem, { moduleKey, data: JSON.stringify(filter) });
  };

  public readItems = async (moduleKey: string, filter: object): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryReadItems, { moduleKey, data: JSON.stringify(filter) });
  };

  public updateItem = async (moduleKey: string, data: object): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationUpdateItem, { moduleKey, data: JSON.stringify(data) });
  };

  public deleteItem = async (moduleKey: string, id: string): Promise<CrudifyResponse> => {
    // Aligned with user's desired (model: string, id: string) -> (moduleKey: string, id: string)
    return this.performCrudOperation(mutationDeleteItem, { moduleKey, data: JSON.stringify({ _id: id }) });
  };

  public transaction = async (data: any): Promise<CrudifyResponse> => {
    // Data for transaction is typically an array of operations
    return this.performCrudOperation(mutationTransaction, { data: JSON.stringify(data) });
  };

  private executeQuery = async (query: string, variables: object = {}, extraHeaders: { [key: string]: string } = {}) => {
    if (!this.endpoint) {
      // Only check endpoint, apiKey is part of headers or token
      throw new Error("Crudify: Not properly initialized or endpoint missing. Call init() method first.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-subscriber-key": this.publicApiKey, // Assuming publicApiKey is the subscriber key
      ...extraHeaders,
    };

    if (this.logLevel === "debug") {
      console.log("Crudify ExecuteQuery to:", this.endpoint);
      console.log("Crudify ExecuteQuery Headers:", headers);
      // console.log("Crudify ExecuteQuery Query:", query); // Can be verbose
      // console.log("Crudify ExecuteQuery Variables:", variables); // Can be verbose
    }

    const response = await _fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const responseData: any = await response.json();
    if (this.logLevel === "debug") {
      // console.log("Crudify ExecuteQuery Raw Response:", responseData); // Can be very verbose
    }
    return responseData;
  };

  public static getInstance(): Crudify {
    if (!Crudify.instance) Crudify.instance = new Crudify();
    return Crudify.instance;
  }

  public async shutdown() {
    if (this.logLevel === "debug") console.log("Crudify: Initiating shutdown...");
    await shutdownNodeSpecifics(this.logLevel);
    if (this.logLevel === "debug") {
      if (IS_BROWSER) {
        console.log("Crudify Shutdown: No specific Node.js resources to release in browser (isomorphic-fetch handled).");
      } else {
        console.log("Crudify Shutdown: Node.js specific resources release attempted (via isomorphic-fetch).");
      }
    }
  }
}

export default Crudify.getInstance();
