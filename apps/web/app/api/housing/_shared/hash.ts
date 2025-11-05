import crypto from "node:crypto";

export function hashKey(parts: Record<string, string | number | boolean | undefined | null>): string {
  const norm = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key] ?? ""}`)
    .join("|");
  return crypto.createHash("sha256").update(norm).digest("hex");
}
