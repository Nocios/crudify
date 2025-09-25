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
  CrudifyTokenConfig,
  CrudifyTokenData,
} from "./types";

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

const mutationRefreshToken = `
mutation MyMutation($refreshToken: String!) {
  response:refreshToken(refreshToken: $refreshToken) {
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
  private refreshToken: string = "";
  private tokenExpiresAt: number = 0;
  private refreshExpiresAt: number = 0;

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
    this.refreshToken = "";
    this.tokenExpiresAt = 0;
    this.refreshExpiresAt = 0;

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

    // ✅ NUEVO: Auto-refresh de tokens
    if (this.token && this.isTokenExpired() && this.refreshToken && !this.isRefreshTokenExpired()) {
      if (this.logLevel === "debug") {
        console.info("Crudify: Access token expired, attempting refresh...");
      }

      const refreshResult = await this.refreshAccessToken();
      if (!refreshResult.success) {
        if (this.logLevel === "debug") {
          console.warn("Crudify: Token refresh failed, clearing tokens");
        }
        // Si el refresh falló, limpiar tokens para forzar re-login
        this.token = "";
        this.refreshToken = "";
        this.tokenExpiresAt = 0;
        this.refreshExpiresAt = 0;

        return {
          success: false,
          errors: { _auth: ["TOKEN_REFRESH_FAILED_PLEASE_LOGIN"] },
          errorCode: NociosError.Unauthorized
        };
      }
    }

    let rawResponse: RawGraphQLResponse = await this.executeQuery(
      query,
      variables,
      {
        ...(!this.token ? { "x-api-key": this.apiKey } : { Authorization: `Bearer ${this.token}` }),
      },
      options?.signal
    );

    // ✅ NUEVO: Manejo de errores de autenticación
    if (rawResponse.errors) {
      const hasAuthError = rawResponse.errors.some((error: any) =>
        error.message?.includes('Unauthorized') ||
        error.message?.includes('Invalid token') ||
        error.extensions?.code === 'UNAUTHENTICATED'
      );

      if (hasAuthError && this.refreshToken && !this.isRefreshTokenExpired()) {
        if (this.logLevel === "debug") {
          console.info("Crudify: Received auth error, attempting token refresh...");
        }

        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.success) {
          // Reintentar la operación con el nuevo token
          rawResponse = await this.executeQuery(
            query,
            variables,
            { Authorization: `Bearer ${this.token}` },
            options?.signal
          );
        } else {
          // Si el refresh falló, limpiar tokens
          this.token = "";
          this.refreshToken = "";
          this.tokenExpiresAt = 0;
          this.refreshExpiresAt = 0;
        }
      }
    }

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
      // ✅ NUEVO: Soporte para refresh tokens
      this.token = internalResponse.data.token;

      if (internalResponse.data.refreshToken) {
        this.refreshToken = internalResponse.data.refreshToken;

        // Calcular tiempo de expiración
        const now = Date.now();
        this.tokenExpiresAt = now + (internalResponse.data.expiresIn || 900) * 1000; // Default 15 min
        this.refreshExpiresAt = now + (internalResponse.data.refreshExpiresIn || 604800) * 1000; // Default 7 días

        if (this.logLevel === "debug") {
          console.info("Crudify Login - Refresh token enabled", {
            accessExpires: new Date(this.tokenExpiresAt),
            refreshExpires: new Date(this.refreshExpiresAt)
          });
        }
      }

      if (this.logLevel === "debug" && internalResponse.data?.version) {
        console.info("Crudify Login Version:", internalResponse.data.version);
      }
    }
    const publicResponse = this.adaptToPublicResponse(internalResponse);
    if (publicResponse.success) {
      publicResponse.data = {
        loginStatus: "successful",
        token: this.token,
        refreshToken: this.refreshToken,
        expiresAt: this.tokenExpiresAt,
        refreshExpiresAt: this.refreshExpiresAt
      };
    }
    return publicResponse;
  };


  /**
   * ✅ NUEVO: Renovar access token usando refresh token
   */
  public refreshAccessToken = async (): Promise<CrudifyResponse> => {
    if (!this.refreshToken) {
      return {
        success: false,
        errors: { _refresh: ["NO_REFRESH_TOKEN_AVAILABLE"] }
      };
    }

    if (!this.endpoint || !this.apiKey) {
      throw new Error("Crudify: Not initialized. Call init() first.");
    }

    try {
      const rawResponse = await this.executeQuery(
        mutationRefreshToken,
        { refreshToken: this.refreshToken },
        { "x-api-key": this.apiKey }
      );

      const internalResponse = this.formatResponseInternal(rawResponse);

      if (internalResponse.success && internalResponse.data?.token) {
        // Actualizar tokens
        this.token = internalResponse.data.token;

        if (internalResponse.data.refreshToken) {
          this.refreshToken = internalResponse.data.refreshToken;
        }

        // Actualizar tiempos de expiración
        const now = Date.now();
        this.tokenExpiresAt = now + (internalResponse.data.expiresIn || 900) * 1000;
        this.refreshExpiresAt = now + (internalResponse.data.refreshExpiresIn || 604800) * 1000;

        if (this.logLevel === "debug") {
          console.info("Crudify Token refreshed successfully", {
            accessExpires: new Date(this.tokenExpiresAt),
            refreshExpires: new Date(this.refreshExpiresAt)
          });
        }

        return {
          success: true,
          data: {
            token: this.token,
            refreshToken: this.refreshToken,
            expiresAt: this.tokenExpiresAt,
            refreshExpiresAt: this.refreshExpiresAt
          }
        };
      }

      return this.adaptToPublicResponse(internalResponse);
    } catch (error) {
      if (this.logLevel === "debug") {
        console.error("Crudify Token refresh failed:", error);
      }
      return {
        success: false,
        errors: { _refresh: ["TOKEN_REFRESH_FAILED"] }
      };
    }
  };

  /**
   * ✅ NUEVO: Verificar si el access token necesita renovación
   */
  private isTokenExpired = (): boolean => {
    if (!this.tokenExpiresAt) return false;
    // Renovar 2 minutos antes de que expire
    const bufferTime = 2 * 60 * 1000; // 2 minutos
    return Date.now() >= (this.tokenExpiresAt - bufferTime);
  };

  /**
   * ✅ NUEVO: Verificar si el refresh token está expirado
   */
  private isRefreshTokenExpired = (): boolean => {
    if (!this.refreshExpiresAt) return false;
    return Date.now() >= this.refreshExpiresAt;
  };

  public setToken = (token: string): void => {
    if (typeof token === "string" && token) this.token = token;
  };

  /**
   * ✅ NUEVO: Configurar tokens manualmente (para restaurar sesión)
   */
  public setTokens = (tokens: CrudifyTokenConfig): void => {
    if (tokens.accessToken) {
      this.token = tokens.accessToken;
    }
    if (tokens.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }
    if (tokens.expiresAt) {
      this.tokenExpiresAt = tokens.expiresAt;
    }
    if (tokens.refreshExpiresAt) {
      this.refreshExpiresAt = tokens.refreshExpiresAt;
    }
  };

  /**
   * ✅ NUEVO: Obtener información de los tokens actuales
   */
  public getTokenData = () => {
    return {
      accessToken: this.token || "",
      refreshToken: this.refreshToken || "",
      expiresAt: this.tokenExpiresAt || 0,
      refreshExpiresAt: this.refreshExpiresAt || 0,
      isExpired: this.isTokenExpired(),
      isRefreshExpired: this.isRefreshTokenExpired()
    };
  };

  public logout = async (): Promise<CrudifyResponse> => {
    this.token = "";
    this.refreshToken = "";
    this.tokenExpiresAt = 0;
    this.refreshExpiresAt = 0;
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
