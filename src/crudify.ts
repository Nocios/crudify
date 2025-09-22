import { _fetch, shutdownNodeSpecifics } from "./fetch-impl";
import {
  CrudifyEnvType,
  CrudifyIssue,
  CrudifyLogLevel,
  CrudifyPublicAPI,
  CrudifyResponse,
  InternalCrudifyResponseType,
  CrudifyRequestOptions,
  CrudifyResponseInterceptor,
  RawGraphQLResponse,
  NociosError,
} from "./types";

const queryInit = `
query Init($apiKey: String!) {
  response:init(apiKey: $apiKey) {
    apiEndpoint
    apiKeyEndpoint
  }
}`;

const mutationLogin = `
mutation MyMutation($username: String, $email: String, $password: String!, $subdomain: String) {
  response:login(username: $username, email: $email, password: $password, subdomain: $subdomain) {
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

const queryGetStructure = `
query MyQuery {
  response:getStructure {
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

const queryGenerateSignedUrl = `
query MyQuery($data: AWSJSON) {
  response:generateSignedUrl(data: $data) {
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
  private responseInterceptor: CrudifyResponseInterceptor | null = null;

  private constructor() {}

  public getLogLevel = (): CrudifyLogLevel => {
    return this.logLevel;
  };

  public config = (env: CrudifyEnvType): void => {
    const selectedEnv = env || "api";
    Crudify.ApiMetadata = dataMasters[selectedEnv]?.ApiMetadata || dataMasters.api.ApiMetadata;
    Crudify.ApiKeyMetadata = dataMasters[selectedEnv]?.ApiKeyMetadata || dataMasters.api.ApiKeyMetadata;
  };

  public init = async (publicApiKey: string, logLevel?: CrudifyLogLevel): Promise<void> => {
    this.logLevel = logLevel || "none";
    this.publicApiKey = publicApiKey;
    this.token = "";

    const response = await _fetch(Crudify.ApiMetadata, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Crudify.ApiKeyMetadata },
      body: JSON.stringify({ query: queryInit, variables: { apiKey: publicApiKey } }),
    });

    const data: any = await response.json();

    if (this.logLevel === "debug") {
      console.log("Crudify Init Response:", data);
      console.log("Crudify Metadata URL:", Crudify.ApiMetadata);
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
      const key = String(issue.path[0] ?? "_error");
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue.message);
      return acc;
    }, {} as Record<string, string[]>);
  };

  private formatResponseInternal = (response: any): InternalCrudifyResponseType => {
    if (response.errors) {
      const errorMessages = response.errors.map((err: any) => String(err.message || "UNKNOWN_GRAPHQL_ERROR"));
      return {
        success: false,
        errors: { _graphql: errorMessages.map((x: string) => x.toUpperCase().replace(/ /g, "_").replace(/\./g, "")) },
      };
    }

    if (!response.data || !response.data.response) {
      if (this.logLevel === "debug") console.error("Crudify FormatResponse: Invalid response structure", response);
      return { success: false, errors: { _error: ["INVALID_RESPONSE_STRUCTURE"] } };
    }

    const apiResponse = response.data.response;
    const status = apiResponse.status ?? "Unknown";
    const errorCode = apiResponse.errorCode as NociosError | undefined;
    let dataResponse;

    try {
      dataResponse = apiResponse.data ? JSON.parse(apiResponse.data) : null;
    } catch (e) {
      if (this.logLevel === "debug") console.error("Crudify FormatResponse: Failed to parse data", apiResponse.data, e);
      if (status === "OK" || status === "WARNING") {
        return { success: false, errors: { _error: ["INVALID_DATA_FORMAT_IN_SUCCESSFUL_RESPONSE"] } };
      }
      dataResponse = { _raw: apiResponse.data, _parsingError: (e as Error).message };
    }

    if (this.logLevel === "debug") {
      console.log("Crudify FormatResponse Status:", status);
      console.log("Crudify FormatResponse Parsed Data (dataResponse):", dataResponse);
      console.log("Crudify FormatResponse ErrorCode:", errorCode);
    }

    switch (status) {
      case "OK":
      case "WARNING":
        return { success: true, data: dataResponse, fieldsWarning: apiResponse.fieldsWarning, errorCode };
      case "FIELD_ERROR":
        return { success: false, errors: this.formatErrorsInternal(dataResponse as CrudifyIssue[]), errorCode };
      case "ITEM_NOT_FOUND":
        return { success: false, errors: { _id: ["ITEM_NOT_FOUND"] }, errorCode: errorCode || NociosError.ItemNotFound };
      case "ERROR":
        if (Array.isArray(dataResponse))
          return { success: false, data: dataResponse, errors: { _transaction: ["ONE_OR_MORE_OPERATIONS_FAILED"] }, errorCode };
        // if (Array.isArray(dataResponse)) {
        //   const formattedTransaction = dataResponse.map(({ action, response: opRes }) => {
        //     let opData = null;
        //     let opErrors: any = opRes.errors;
        //     try {
        //       opData = opRes.data ? JSON.parse(opRes.data) : null;
        //     } catch (e) {
        //       opData = { _raw: opRes.data, _parsingError: (e as Error).message };
        //     }
        //     if (opRes.status === "FIELD_ERROR" && opRes.errors) {
        //       opErrors = this.formatErrorsInternal(opRes.errors as CrudifyIssue[]);
        //     }
        //     return { action, status: opRes.status, data: opData, errors: opErrors, fieldsWarning: opRes.fieldsWarning };
        //   });
        //   return { success: false, data: formattedTransaction, errors: { _transaction: ["ONE_OR_MORE_OPERATIONS_FAILED"] } };
        // }

        const finalErrors =
          typeof dataResponse === "object" && dataResponse !== null && !Array.isArray(dataResponse)
            ? dataResponse
            : { _error: [String(dataResponse || "UNKNOWN_ERROR")] };
        return { success: false, errors: finalErrors, errorCode: errorCode || NociosError.InternalServerError };
      default:
        return {
          success: false,
          errors: { _error: [status || "UNKNOWN_ERROR_STATUS"] },
          errorCode: errorCode || NociosError.InternalServerError,
        };
    }
  };

  private adaptToPublicResponse = (internalResp: InternalCrudifyResponseType): CrudifyResponse => {
    if (internalResp.errors && typeof internalResp.errors === "object" && !Array.isArray(internalResp.errors)) {
      return {
        success: internalResp.success,
        data: internalResp.data,
        errors: internalResp.errors,
        fieldsWarning: internalResp.fieldsWarning,
        errorCode: internalResp.errorCode,
      };
    }

    return {
      success: internalResp.success,
      data: internalResp.data,
      fieldsWarning: internalResp.fieldsWarning,
      errorCode: internalResp.errorCode,
    };
  };

  private async performCrudOperation(query: string, variables: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> {
    if (!this.endpoint || !this.apiKey) throw new Error("Crudify: Not initialized. Call init() first.");

    let rawResponse: RawGraphQLResponse = await this.executeQuery(
      query,
      variables,
      {
        ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }),
      },
      options?.signal
    );

    if (this.logLevel === "debug") console.log("Crudify Raw Response:", rawResponse);

    if (this.responseInterceptor) rawResponse = await Promise.resolve(this.responseInterceptor(rawResponse));

    return this.adaptToPublicResponse(this.formatResponseInternal(rawResponse));
  }

  private async performCrudOperationPublic(query: string, variables: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> {
    if (!this.endpoint || !this.apiKey) throw new Error("Crudify: Not initialized. Call init() first.");

    let rawResponse: RawGraphQLResponse = await this.executeQuery(query, variables, { "x-api-key": this.apiKey }, options?.signal);

    if (this.logLevel === "debug") console.log("Crudify Raw Response:", rawResponse);

    if (this.responseInterceptor) rawResponse = await Promise.resolve(this.responseInterceptor(rawResponse));

    return this.adaptToPublicResponse(this.formatResponseInternal(rawResponse));
  }

  private executeQuery = async (
    query: string,
    variables: object = {},
    extraHeaders: { [key: string]: string } = {},
    signal?: AbortSignal
  ) => {
    if (!this.endpoint) {
      throw new Error("Crudify: Not properly initialized or endpoint missing. Call init() method first.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-subscriber-key": this.publicApiKey,
      ...extraHeaders,
    };

    if (this.logLevel === "debug") {
      console.log("Crudify Request URL:", this.endpoint);
      console.log("Crudify Request Headers:", headers);
      console.log("Crudify Request Query:", query);
      console.log("Crudify Request Variables:", variables);
    }

    const response = await _fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal,
    });

    const responseBody = await response.json();

    if (this.logLevel === "debug") {
      console.log("Crudify Response Status:", response.status);
      console.log("Crudify Response Body:", responseBody);
    }

    return responseBody;
  };

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
    const publicResponse = this.adaptToPublicResponse(internalResponse);
    if (publicResponse.success) publicResponse.data = { loginStatus: "successful", token: this.token };
    return publicResponse;
  };

  public loginWithSubdomain = async (identifier: string, password: string, subdomain: string): Promise<CrudifyResponse> => {
    const email: string | undefined = identifier.includes("@") ? identifier : undefined;
    const username: string | undefined = identifier.includes("@") ? undefined : identifier;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": Crudify.ApiKeyMetadata,
    };

    if (this.logLevel === "debug") {
      console.log("Crudify LoginWithSubdomain URL:", Crudify.ApiMetadata);
      console.log("Crudify LoginWithSubdomain Headers:", headers);
    }

    const response = await _fetch(Crudify.ApiMetadata, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: mutationLogin,
        variables: { username, email, password, subdomain },
      }),
    });

    const rawResponse = await response.json();

    if (this.logLevel === "debug") {
      console.log("Crudify LoginWithSubdomain Response:", rawResponse);
    }

    const internalResponse = this.formatResponseInternal(rawResponse);

    if (internalResponse.success && internalResponse.data?.token) {
      this.token = internalResponse.data.token;

      // Si el login con subdomain devuelve configuración del cliente, la aplicamos
      if (internalResponse.data?.publicApiKey) {
        this.publicApiKey = internalResponse.data.publicApiKey;

        // También necesitamos obtener el endpoint del subscriber
        try {
          const initResponse = await _fetch(Crudify.ApiMetadata, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": Crudify.ApiKeyMetadata },
            body: JSON.stringify({ query: queryInit, variables: { apiKey: this.publicApiKey } }),
          });

          const initData: any = await initResponse.json();
          if (initData?.data?.response) {
            this.endpoint = initData.data.response.apiEndpoint;
            this.apiKey = initData.data.response.apiKeyEndpoint;
          }
        } catch (initError) {
          if (this.logLevel === "debug") {
            console.warn("Could not initialize endpoints after subdomain login:", initError);
          }
        }
      }

      if (this.logLevel === "debug" && internalResponse.data?.version) {
        console.info("Crudify LoginWithSubdomain Version:", internalResponse.data.version);
      }
    }

    const publicResponse = this.adaptToPublicResponse(internalResponse);
    if (publicResponse.success) {
      publicResponse.data = {
        loginStatus: "successful",
        token: this.token,
        publicApiKey: internalResponse.data?.publicApiKey,
        appName: internalResponse.data?.appName,
        logo: internalResponse.data?.logo,
        colors: internalResponse.data?.colors,
      };
    }
    return publicResponse;
  };

  public setToken = (token: string): void => {
    if (typeof token === "string" && token) this.token = token;
  };

  public logout = async (): Promise<CrudifyResponse> => {
    this.token = "";
    return { success: true };
  };

  public isLogin = (): boolean => !!this.token;

  public getPermissions = async (options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryGetPermissions, {}, options);
  };

  public getStructure = async (options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryGetStructure, {}, options);
  };

  public getStructurePublic = async (options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperationPublic(queryGetStructure, {}, options);
  };

  public createItem = async (moduleKey: string, data: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationCreateItem, { moduleKey, data: JSON.stringify(data) }, options);
  };

  public createItemPublic = async (moduleKey: string, data: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperationPublic(mutationCreateItem, { moduleKey, data: JSON.stringify(data) }, options);
  };

  public generateSignedUrl = async (
    data: { fileName: string; contentType: string },
    options?: CrudifyRequestOptions
  ): Promise<CrudifyResponse> => {
    if (!this.endpoint || !this.token) throw new Error("Crudify: Not initialized. Call init() first.");

    const rawResponse = await this.executeQuery(
      queryGenerateSignedUrl,
      { data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` },
      options?.signal
    );
    const internalResponse = this.formatResponseInternal(rawResponse);

    if (internalResponse.success && internalResponse.data?.url) return { success: true, data: internalResponse.data.url };

    return this.adaptToPublicResponse(internalResponse);
  };

  public readItem = async (
    moduleKey: string,
    filter: { _id: string } | object,
    options?: CrudifyRequestOptions
  ): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryReadItem, { moduleKey, data: JSON.stringify(filter) }, options);
  };

  public readItems = async (moduleKey: string, filter: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(queryReadItems, { moduleKey, data: JSON.stringify(filter) }, options);
  };

  public updateItem = async (moduleKey: string, data: object, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationUpdateItem, { moduleKey, data: JSON.stringify(data) }, options);
  };

  public deleteItem = async (moduleKey: string, id: string, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationDeleteItem, { moduleKey, data: JSON.stringify({ _id: id }) }, options);
  };

  public transaction = async (data: any, options?: CrudifyRequestOptions): Promise<CrudifyResponse> => {
    return this.performCrudOperation(mutationTransaction, { data: JSON.stringify(data) }, options);
  };

  public static getInstance(): Crudify {
    if (!Crudify.instance) Crudify.instance = new Crudify();
    return Crudify.instance;
  }

  public setResponseInterceptor = (interceptor: CrudifyResponseInterceptor | null): void => {
    if (this.logLevel === "debug") console.log("Crudify: setResponseInterceptor called");
    this.responseInterceptor = interceptor;
  };

  public async shutdown() {
    if (this.logLevel === "debug") console.log("Crudify: Initiating shutdown...");
    await shutdownNodeSpecifics(this.logLevel);
  }
}

export default Crudify.getInstance();
