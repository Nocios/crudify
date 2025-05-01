type LogLevel = "none" | "debug";

type ResponseType = { success: boolean; data?: any; fieldsWarning?: any; errors?: any };

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

  public init = (publicApiKey: string, logLevel?: LogLevel): void => {
    this.logLevel = logLevel || "debug";
    this.publicApiKey = publicApiKey;
    this.token = "NO_TOKEN";
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
    if (this.logLevel === "debug") console.log("Response:", response);

    if (response.errors) return { success: false, errors: response.errors };

    const status = response.data.response.status ?? "Unknown";
    const dataResponse = JSON.parse(response.data.response.data);

    if (this.logLevel === "debug") {
      console.log("Response:", response);
      console.log("Status:", status);
      console.log("Data:", dataResponse);
    }

    switch (status) {
      case "OK":
      case "WARNING":
        return { success: true, data: dataResponse, fieldsWarning: response.data.response.fieldsWarning };
      case "FIELD_ERROR":
        return { success: false, errors: this.formatErrors(dataResponse) };
      default:
        return { success: false, errors: { _error: [status] } };
    }
  };

  public login = async (identifier: string, password: string): Promise<ResponseType> => {
    const email: string | undefined = identifier.includes("@") ? identifier : undefined;
    const username: string | undefined = identifier.includes("@") ? undefined : identifier;

    const response = await this.executeQuery(mutationLogin, { username, email, password }, { "x-api-key": this.apiKey });

    if (response.data?.response?.status === "OK") this.token = response.data.response.data.replace(/^"+|"+$/g, "");

    const formatedResponse = this.formatResponse(response);
    delete formatedResponse.data;
    delete formatedResponse.fieldsWarning;

    return formatedResponse;
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

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const data: any = await response.json();

    return data;
  };

  public static getInstance(): Crudify {
    if (!Crudify.instance) Crudify.instance = new Crudify();
    return Crudify.instance;
  }
}

export default Crudify.getInstance();
