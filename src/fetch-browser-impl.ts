import type { CrudifyLogLevel } from "./types";

export const IS_BROWSER = true;

export const _fetch = async (url: globalThis.RequestInfo, options?: any): Promise<globalThis.Response> => {
  const { dispatcher, ...browserOptions } = options || {};
  return window.fetch(url, browserOptions as globalThis.RequestInit);
};

export const shutdownNodeSpecifics = async (logLevel?: CrudifyLogLevel): Promise<void> => {
  if (logLevel === "debug") {
    console.log("Crudify (Browser): Shutdown called, no action needed.");
  }
};

export const getInternalNodeSpecificsSetupPromise = (): Promise<void> => {
  return Promise.resolve();
};
