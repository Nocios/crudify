import { Agent, fetch as undiciFetch } from "undici";
import CacheableLookup from "cacheable-lookup";
import type { LookupFunction } from "net";
import dotenv from "dotenv";

dotenv.config();

const cacheable = new CacheableLookup({ maxTtl: 300_000, fallbackDuration: 30_000 });

const dispatcher = new Agent({
  keepAliveTimeout: 60_000,
  connections: 10,
  pipelining: 1,
  connect: { lookup: cacheable.lookup as unknown as LookupFunction },
});

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

class Crudify {
  private static instance: Crudify;
  private static readonly ApiMetadata = process.env.CRUDIFY_METADATA_API || "";
  private static readonly ApiKeyMetadata = process.env.CRUDIFY_METADATA_API_KEY || "";

  private publicApiKey: string = "";
  private token: string = "";

  private logLevel: LogLevel = "debug";
  private apiKey: string = "";
  private endpoint: string = "";

  private constructor() {}

  public config = (endpoint: string, apiKey: string): void => {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  };

  public init = async (publicApiKey: string, logLevel?: LogLevel): Promise<void> => {
    this.logLevel = logLevel || "none";
    this.publicApiKey = publicApiKey;
    this.token = "";

    const response = await undiciFetch(Crudify.ApiMetadata, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": Crudify.ApiKeyMetadata },
      body: JSON.stringify({ query: queryInit, variables: { apiKey: publicApiKey } }),
      dispatcher,
    });

    const data: any = await response.json();

    if (logLevel === "debug") console.log("Init response:", data);

    if (data?.data?.response) {
      const { response } = data.data;
      this.endpoint = response.apiEndpoint;
      this.apiKey = response.apiKeyEndpoint;
    } else {
      console.error("Init response error");
      throw new Error("Failed to initialize Crudify, check your API key");
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
    if (response.errors) return { success: false, errors: response.errors };

    const status = response.data.response.status ?? "Unknown";
    const dataResponse = JSON.parse(response.data.response.data);

    if (this.logLevel === "debug") {
      console.log("Response:", response);
      console.log("Status:", status);
    }

    switch (status) {
      case "OK":
      case "WARNING":
        return { success: true, data: dataResponse, fieldsWarning: response.data.response.fieldsWarning };
      case "FIELD_ERROR":
        return { success: false, errors: this.formatErrors(dataResponse) };
      case "ITEM_NOT_FOUND":
        return { success: false, errors: { _id: ["ITEM_NOT_FOUND"] } };
      case "ERROR": {
        if (Array.isArray(dataResponse)) {
          const formatted = (dataResponse as any[]).map(({ action, response: opRes }) => {
            if (opRes.status === "FIELD_ERROR") {
              return { action, status: opRes.status, errors: this.formatErrors(opRes.errors as Issue[]) };
            }
            return { action, status: opRes.status };
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
    else {
      const email: string | undefined = identifier.includes("@") ? identifier : undefined;
      const username: string | undefined = identifier.includes("@") ? undefined : identifier;

      const response = await this.executeQuery(mutationLogin, { username, email, password }, { "x-api-key": this.apiKey });

      if (response.data?.response?.status === "OK") {
        const parsedData = JSON.parse(response.data.response.data);
        this.token = parsedData.token;
        if (this.logLevel === "debug") console.info("Version:", parsedData.version);
      }

      const formatedResponse = this.formatResponse(response);
      delete formatedResponse.data;
      delete formatedResponse.fieldsWarning;

      return formatedResponse;
    }
  };

  public logout = async (): Promise<ResponseType> => {
    this.token = "";
    return { success: true };
  };

  public getPermissions = async (): Promise<ResponseType> => {
    const response = await this.executeQuery(queryGetPermissions, {}, { Authorization: `Bearer ${this.token}` });

    return this.formatResponse(response);
  };

  public createItem = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationCreateItem,
      { moduleKey, data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    if (this.logLevel === "debug") console.log("Response:", response);

    if (response.errors) return { success: false, errors: response.errors };

    return this.formatResponse(response);
  };

  public readItem = async (moduleKey: string, data: { _id: string }): Promise<ResponseType> => {
    const response = await this.executeQuery(
      queryReadItem,
      { moduleKey, data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    return this.formatResponse(response);
  };

  public readItems = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      queryReadItems,
      { moduleKey, data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    return this.formatResponse(response);
  };

  public updateItem = async (moduleKey: string, data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationUpdateItem,
      { moduleKey, data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    return this.formatResponse(response);
  };

  public deleteItem = async (moduleKey: string, data: { _id: string }): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationDeleteItem,
      { moduleKey, data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    return this.formatResponse(response);
  };

  public transaction = async (data: any): Promise<ResponseType> => {
    const response = await this.executeQuery(
      mutationTransaction,
      { data: JSON.stringify(data) },
      { Authorization: `Bearer ${this.token}` }
    );

    return this.formatResponse(response);
  };

  private executeQuery = async (query: string, variables = {}, extraHeaders: { [key: string]: string }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-subscriber-key": this.publicApiKey,
      ...extraHeaders,
    };

    if (this.logLevel === "debug") console.log("Headers:", headers);

    const response = await undiciFetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      dispatcher,
    });

    const data: any = await response.json();

    return data;
  };

  public static getInstance(): Crudify {
    if (!Crudify.instance) Crudify.instance = new Crudify();
    return Crudify.instance;
  }

  public async shutdown() {
    await dispatcher.close();
  }
}

export default Crudify.getInstance();
