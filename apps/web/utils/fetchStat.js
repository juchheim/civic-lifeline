/* eslint-env browser, es2021 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CENSUS_HOST = "api.census.gov";
const CENSUS_MIN_INTERVAL_MS = 1_100; // Roughly 1 request per second

const getCensusApiKey = () => process.env.NEXT_PUBLIC_CENSUS_API_KEY ?? process.env.CENSUS_API_KEY ?? "";

const withCensusApiKey = (endpoint) => {
  const apiKey = getCensusApiKey();
  if (!apiKey) return endpoint;

  try {
    const url = new URL(endpoint);
    if (url.hostname !== CENSUS_HOST) return endpoint;
    if (!url.searchParams.has("key")) {
      url.searchParams.set("key", apiKey);
    }
    return url.toString();
  } catch {
    // Relative URLs (e.g. /api/...) will throw here – keep the original endpoint.
    return endpoint;
  }
};

const getGlobalScope = () => {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
};

const globalScope = getGlobalScope();

const getThrottleState = () => {
  const key = "__clCensusThrottle";
  if (!globalScope[key]) {
    globalScope[key] = {
      queue: Promise.resolve(),
      lastRequestAt: 0,
    };
  }
  return globalScope[key];
};

const scheduleCensusFetch = (task) => {
  const state = getThrottleState();
  const runTask = async () => {
    const now = Date.now();
    const waitMs = Math.max(0, state.lastRequestAt + CENSUS_MIN_INTERVAL_MS - now);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    state.lastRequestAt = Date.now();
    return task();
  };

  state.queue = state.queue.catch(() => undefined).then(runTask);
  return state.queue;
};

const shouldThrottleCensus = (target) => {
  if (!target) return false;
  try {
    const url = new URL(target);
    return url.hostname === CENSUS_HOST;
  } catch {
    return false;
  }
};

const safeJsonParse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Response is not valid JSON");
  }
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 429 && response.url.includes(CENSUS_HOST)) {
      throw new Error("Census API rate limit reached. Please try again shortly.");
    }

    const body = await safeJsonParse(response).catch(() => null);
    const message = body?.error ?? response.statusText ?? "Request failed";
    throw new Error(message);
  }
  return safeJsonParse(response);
};

export async function fetchStat(endpoint, parser) {
  const requestTarget = typeof endpoint === "string" ? withCensusApiKey(endpoint) : endpoint;
  const targetUrl =
    typeof requestTarget === "string"
      ? requestTarget
      : requestTarget instanceof URL
        ? requestTarget.toString()
        : typeof Request !== "undefined" && requestTarget instanceof Request
          ? requestTarget.url
          : null;

  const executeFetch = () => fetch(requestTarget);
  const response = shouldThrottleCensus(targetUrl) ? await scheduleCensusFetch(executeFetch) : await executeFetch();
  const json = await handleResponse(response);
  if (parser) return parser(json);
  return json;
}

export function getCachedStat(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.expires && parsed.expires < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedStat(key, value) {
  if (typeof window === "undefined") return;
  try {
    const payload = {
      expires: Date.now() + CACHE_TTL_MS,
      value,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}
