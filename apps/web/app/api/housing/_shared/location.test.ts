import { beforeEach, describe, expect, it, vi } from "vitest";
import Redis from "ioredis";
import { resolveLocation } from "./location";

class StubRedis {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async set(key: string, value: string, _mode: string, _ttl: number) {
    this.store.set(key, value);
  }
}

describe("resolveLocation", () => {
  const origin = "https://example.com";
  const mockResponse = {
    lat: 32.3,
    lon: -90.2,
    name: "Jackson, Mississippi",
    address: { postalCode: "39201" },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and caches location results", async () => {
    const redis = new StubRedis() as unknown as Redis;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Response
    );

    const first = await resolveLocation("Jackson, MS", { origin, redis });
    expect(first.lat).toBeCloseTo(32.3);
    expect(first.postalCode).toBe("39201");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockClear();
    const second = await resolveLocation("Jackson, MS", { origin, redis });
    expect(second.lat).toBeCloseTo(32.3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when upstream responds with an error", async () => {
    const redis = new StubRedis() as unknown as Redis;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "No matching locations found." }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }) as unknown as Response
    );

    await expect(resolveLocation("Unknown Place", { origin, redis })).rejects.toThrow(
      "No matching locations found."
    );
  });
});
