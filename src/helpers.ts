import { stringify } from "qs";
import { InitParams, Param, Item, ParamGetter } from "./types";
import { URL } from "./consts";
import {
  getAppName,
  getClientId,
  getAppVersion,
  getLanguage,
  getUserAgent,
  getViewport,
  getScreenResolution,
  fetch,
} from "./side-effects";

export const prepareUserAgent = (userAgent: string, appName: string) =>
  userAgent
    .replace(new RegExp(`${appName}\\/\\d+\\.\\d+\\.\\d+ `), "")
    .replace(/Electron\/\d+\.\d+\.\d+ /, "");

export const getDefaultInitParams = (): InitParams => {
  const appName = getAppName();
  return {
    protocolVersion: "1",
    clientId: getClientId(),
    appName,
    appVersion: getAppVersion(),
    language: getLanguage(),
    userAgent: prepareUserAgent(getUserAgent(), appName),
    viewport: getViewport,
    screenResolution: getScreenResolution,
  };
};

export const resolveParam = <T>(value: Param<T>): T =>
  typeof value === "function" ? (value as ParamGetter<T>)() : value;

export const prepareItems = (items: Item[], trackId, time): Item[] =>
  items.map((item) => ({ ...item, tid: trackId, qt: time - item.__timestamp }));

export const getBatches = (items: Item[], batchSize: number): Item[][] =>
  items.reduce(
    (batches, item) =>
      batches[batches.length - 1].length >= batchSize
        ? [...batches, [item]]
        : [
            ...batches.slice(0, batches.length - 1),
            [...batches[batches.length - 1], item],
          ],
    [[]]
  );

export const sendBatches = async (
  url: Param<string>,
  [batch, ...others]: Item[][],
  failedItems: Item[] = []
): Promise<Item[]> => {
  if (!batch || batch.length === 0) return failedItems;
  try {
    await fetch(URL, {
      method: "post",
      body: batch.map((item) => stringify(item)).join("\n"),
    });
    return await sendBatches(url, others, failedItems);
  } catch (error) {
    return await sendBatches(url, others, [...failedItems, ...batch]);
  }
};
