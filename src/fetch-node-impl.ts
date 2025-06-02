import type { CrudifyLogLevel } from "./types";
// TODAS LAS IMPORTACIONES DE NODE ESTÁN AQUÍ
import {
  Agent as ActualUndiciAgentClass,
  fetch as actualUndiciFetch,
  Response as UndiciResponse,
  RequestInit as UndiciRequestInit,
} from "undici";
import CacheableLookupActualClass from "cacheable-lookup";

export const IS_BROWSER = false; // Definitivo para este archivo

// Tipos específicos para la implementación de Node
type NodeFetchType = (url: string | URL, options?: UndiciRequestInit) => Promise<UndiciResponse>;

let nodeFetchImplementation: NodeFetchType | null = null;
let nodeShutdownImplementation: ((logLevel?: CrudifyLogLevel) => Promise<void>) | null = null;
let nodeSpecificsSetupPromiseSingleton: Promise<void> | null = null;

async function initializeNodeSpecifics(): Promise<void> {
  try {
    const cacheableInstance = new CacheableLookupActualClass({ maxTtl: 300_000, fallbackDuration: 30_000 });
    const undiciAgentDispatcher = new ActualUndiciAgentClass({
      keepAliveTimeout: 60_000,
      connections: 10,
      pipelining: 1,
      connect: { lookup: cacheableInstance.lookup as any }, // Cast 'any' para simplificar compatibilidad de tipos
    });

    nodeFetchImplementation = (url: string | URL, options?: UndiciRequestInit) => {
      const { dispatcher, ...restOptions } = options || {}; // Ignora dispatcher de las opciones
      const nodeOptions: UndiciRequestInit = {
        ...restOptions,
        dispatcher: undiciAgentDispatcher, // Usa el dispatcher interno
      };
      return actualUndiciFetch(url, nodeOptions);
    };

    nodeShutdownImplementation = async (logLevel?: CrudifyLogLevel) => {
      if (logLevel === "debug") console.log("Crudify (Node): Shutting down Undici agent dispatcher.");
      if (undiciAgentDispatcher) {
        // Verifica que el dispatcher exista antes de cerrarlo
        await undiciAgentDispatcher.close();
      }
      if (logLevel === "debug") console.log("Crudify (Node): Undici agent dispatcher closed.");
    };

    if (console && typeof process !== "undefined" && process.env?.CRUDIFY_LOG_LEVEL === "debug") {
      console.log("Crudify (Node): Node-specific modules (undici, cacheable-lookup) initialized successfully.");
    }
  } catch (error) {
    console.error("Crudify (Node) FATAL: Failed to initialize Node.js specific modules (undici, cacheable-lookup).", error);
    nodeFetchImplementation = () => Promise.reject(new Error("Node fetch failed to initialize.")) as any; // Cast a any
    nodeShutdownImplementation = () => Promise.resolve();
    throw new Error(`Node.js specific modules failed to load: ${error instanceof Error ? error.message : String(error)}`);
  }
}

nodeSpecificsSetupPromiseSingleton = initializeNodeSpecifics();
nodeSpecificsSetupPromiseSingleton.catch((err) => {
  // El error ya se registra en initializeNodeSpecifics
});

export const getInternalNodeSpecificsSetupPromise = (): Promise<void> | null => {
  return nodeSpecificsSetupPromiseSingleton;
};

export const _fetch = async (
  url: globalThis.RequestInfo, // Mantén globalThis para consistencia de firma
  options?: globalThis.RequestInit // Mantén globalThis para consistencia de firma
): Promise<globalThis.Response> => {
  if (nodeSpecificsSetupPromiseSingleton) {
    // Asegúrate de que la promesa existe
    await nodeSpecificsSetupPromiseSingleton;
  }
  if (!nodeFetchImplementation) {
    throw new Error("Crudify (Node): HTTP client (undici) not available or failed to initialize.");
  }
  // Castea las opciones a UndiciRequestInit y la respuesta de vuelta a globalThis.Response
  return nodeFetchImplementation(url as string | URL, options as UndiciRequestInit) as unknown as globalThis.Response;
};

export const shutdownNodeSpecifics = async (logLevel?: CrudifyLogLevel): Promise<void> => {
  if (nodeSpecificsSetupPromiseSingleton) {
    try {
      await nodeSpecificsSetupPromiseSingleton;
    } catch (e) {
      /* ignora error de setup al intentar apagar */
    }
  }
  if (nodeShutdownImplementation) {
    await nodeShutdownImplementation(logLevel);
  } else if (logLevel === "debug") {
    console.log("Crudify (Node): Shutdown implementation not available.");
  }
};
