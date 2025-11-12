const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    const body = await safeJsonParse(response).catch(() => null);
    const message = body?.error ?? response.statusText ?? "Request failed";
    throw new Error(message);
  }
  return safeJsonParse(response);
};

export async function fetchStat(endpoint, parser) {
  const response = await fetch(endpoint);
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
