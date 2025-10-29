export type Bbox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]

export function parseBbox(input: string | number[]): Bbox {
  if (Array.isArray(input)) {
    if (input.length !== 4) throw new Error("bbox array must have 4 numbers");
    return [Number(input[0]), Number(input[1]), Number(input[2]), Number(input[3])];
  }
  const parts = input.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) throw new Error("invalid bbox string");
  return [parts[0], parts[1], parts[2], parts[3]];
}

export function bboxToQueryParam(b: Bbox): string {
  return b.join(",");
}

export function centroid(b: Bbox): [number, number] {
  const [minLon, minLat, maxLon, maxLat] = b;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

export function contains(b: Bbox, point: [number, number]): boolean {
  const [minLon, minLat, maxLon, maxLat] = b;
  const [lon, lat] = point;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

export function clampToWorld(b: Bbox): Bbox {
  const [minLon, minLat, maxLon, maxLat] = b;
  return [
    Math.max(-180, Math.min(180, minLon)),
    Math.max(-90, Math.min(90, minLat)),
    Math.max(-180, Math.min(180, maxLon)),
    Math.max(-90, Math.min(90, maxLat)),
  ];
}
