import type { CrudifyLogLevel } from "./types";

export const IS_BROWSER = true;

export const _fetch = async (url: globalThis.RequestInfo, options?: globalThis.RequestInit): Promise<globalThis.Response> => {
  const { dispatcher, ...browserOptions } = options || ({} as any);
  return window.fetch(url, browserOptions);
};

export const shutdownNodeSpecifics = async (logLevel?: CrudifyLogLevel): Promise<void> => {
  if (logLevel === "debug") {
    console.log("Crudify (Browser): shutdownNodeSpecifics called - no action needed.");
  }
};

export const getInternalNodeSpecificsSetupPromise = (): Promise<void> => {
  return Promise.resolve();
};
