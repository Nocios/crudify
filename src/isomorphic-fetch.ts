import type {
  RequestInit as UndiciRequestInit,
  HeadersInit as UndiciHeadersInit,
  BodyInit as UndiciBodyInit,
  Response as UndiciResponse,
  Agent as UndiciAgentClassType,
} from "undici";
import type CacheableLookupClassType from "cacheable-lookup";
import type { LookupFunction as NetLookupFunction } from "net";

export const IS_BROWSER = typeof window !== "undefined" && typeof window.document !== "undefined";

let cacheableInstance: CacheableLookupClassType | null = null;
let undiciAgentDispatcher: UndiciAgentClassType | undefined = undefined;
let undiciFetchOriginalForNode: ((url: string | URL, options?: UndiciRequestInit) => Promise<UndiciResponse>) | null = null;

let nodeSpecificsSetupPromise: Promise<void> | null = null;

function initializeNodeSpecificsInternal(): Promise<void> {
  return (async () => {
    try {
      const { Agent: ActualUndiciAgentClass, fetch: actualUndiciFetch } = await import("undici");
      const CacheableLookupActualClass = (await import("cacheable-lookup")).default;

      cacheableInstance = new CacheableLookupActualClass({ maxTtl: 300_000, fallbackDuration: 30_000 });
      undiciAgentDispatcher = new ActualUndiciAgentClass({
        keepAliveTimeout: 60_000,
        connections: 10,
        pipelining: 1,
        connect: { lookup: cacheableInstance.lookup as unknown as NetLookupFunction },
      });
      undiciFetchOriginalForNode = actualUndiciFetch;
    } catch (error) {
      console.error(
        "FATAL: Failed to dynamically initialize Node.js specific modules (undici, cacheable-lookup) in isomorphic-fetch.",
        error
      );
      throw new Error(
        `Node.js specific modules failed to load in isomorphic-fetch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  })();
}

if (!IS_BROWSER) {
  nodeSpecificsSetupPromise = initializeNodeSpecificsInternal();
  nodeSpecificsSetupPromise.catch((err) => {
    console.error("Initial Node.js specifics setup failed in isomorphic-fetch:", err.message);
  });
}

export const getInternalNodeSpecificsSetupPromise = () => nodeSpecificsSetupPromise;

export const _fetch = async (
  url: globalThis.RequestInfo,
  options?: globalThis.RequestInit & { dispatcher?: unknown } // Allow dispatcher for destructuring
): Promise<globalThis.Response> => {
  if (IS_BROWSER) {
    const { dispatcher, ...browserOptions } = options || {};
    return window.fetch(url, browserOptions as globalThis.RequestInit);
  } else {
    if (nodeSpecificsSetupPromise) {
      try {
        await nodeSpecificsSetupPromise;
      } catch (setupError) {
        throw new Error(
          `Node.js HTTP client setup failed: ${
            setupError instanceof Error ? setupError.message : String(setupError)
          }. Cannot proceed with fetch.`
        );
      }
    }

    if (!undiciFetchOriginalForNode || !undiciAgentDispatcher) {
      throw new Error("Node.js HTTP client (undici) is not available or failed to initialize. Check for earlier errors during setup.");
    }

    // For Node.js, we ignore any incoming 'dispatcher' from options and use our own.
    const { dispatcher, ...restOptions } = options || {};
    const nodeOptions: UndiciRequestInit = {
      ...restOptions,
      headers: restOptions.headers as UndiciHeadersInit,
      body: restOptions.body as UndiciBodyInit,
      dispatcher: undiciAgentDispatcher, // Always use the internally managed dispatcher
    };

    const undiciNodeResponse: UndiciResponse = await undiciFetchOriginalForNode(url as string | URL, nodeOptions);
    return undiciNodeResponse as unknown as globalThis.Response;
  }
};

export const shutdownNodeSpecifics = async (logLevel?: CrudifyLogLevel): Promise<void> => {
  if (!IS_BROWSER) {
    if (nodeSpecificsSetupPromise) {
      try {
        await nodeSpecificsSetupPromise;
      } catch (e) {
        if (logLevel === "debug") {
          console.warn(
            "Node specifics setup may have failed during shutdown check in isomorphic-fetch:",
            e instanceof Error ? e.message : String(e)
          );
        }
      }
    }
    if (undiciAgentDispatcher) {
      if (logLevel === "debug") console.log("Shutting down Undici agent dispatcher via isomorphic-fetch.");
      await undiciAgentDispatcher.close();
      if (logLevel === "debug") console.log("Undici agent dispatcher closed.");
    } else if (logLevel === "debug") {
      console.log("Shutdown: Undici agent dispatcher was not initialized or setup failed (isomorphic-fetch).");
    }
  } else if (logLevel === "debug") {
    console.log("Shutdown called, no action needed for browser environment (isomorphic-fetch).");
  }
};
