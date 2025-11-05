import { beforeEach, describe, expect, it, vi } from "vitest";
import Redis from "ioredis";
import { lookupCountyFips } from "./county";

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

describe("lookupCountyFips", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns county fips and caches results", async () => {
    const redis = new StubRedis() as unknown as Redis;
    const payload = {
      County: { FIPS: "28163", name: "Yazoo" },
      State: { code: "MS", name: "Mississippi" },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Response
    );

    const result = await lookupCountyFips(32.889, -90.405, { redis });
    expect(result.fips).toBe("28163");
    expect(result.countyName).toBe("Yazoo");
    expect(result.stateCode).toBe("MS");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    fetchSpy.mockClear();
    const cached = await lookupCountyFips(32.889, -90.405, { redis });
    expect(cached.fips).toBe("28163");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when response lacks fips", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ County: {}, State: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as unknown as Response
    );
    await expect(lookupCountyFips(32.8, -90.4, { redis: new StubRedis() as unknown as Redis })).rejects.toThrow(
      "County FIPS could not be determined for that location."
    );
  });
});
