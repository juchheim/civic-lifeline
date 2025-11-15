const STATE_ENTRIES = [
  { code: "AL", names: ["alabama"] },
  { code: "AK", names: ["alaska"] },
  { code: "AZ", names: ["arizona"] },
  { code: "AR", names: ["arkansas"] },
  { code: "CA", names: ["california"] },
  { code: "CO", names: ["colorado"] },
  { code: "CT", names: ["connecticut"] },
  { code: "DE", names: ["delaware"] },
  { code: "FL", names: ["florida"] },
  { code: "GA", names: ["georgia"] },
  { code: "HI", names: ["hawaii"] },
  { code: "ID", names: ["idaho"] },
  { code: "IL", names: ["illinois"] },
  { code: "IN", names: ["indiana"] },
  { code: "IA", names: ["iowa"] },
  { code: "KS", names: ["kansas"] },
  { code: "KY", names: ["kentucky"] },
  { code: "LA", names: ["louisiana"] },
  { code: "ME", names: ["maine"] },
  { code: "MD", names: ["maryland"] },
  { code: "MA", names: ["massachusetts"] },
  { code: "MI", names: ["michigan"] },
  { code: "MN", names: ["minnesota"] },
  { code: "MS", names: ["mississippi"] },
  { code: "MO", names: ["missouri"] },
  { code: "MT", names: ["montana"] },
  { code: "NE", names: ["nebraska"] },
  { code: "NV", names: ["nevada"] },
  { code: "NH", names: ["new hampshire"] },
  { code: "NJ", names: ["new jersey"] },
  { code: "NM", names: ["new mexico"] },
  { code: "NY", names: ["new york"] },
  { code: "NC", names: ["north carolina"] },
  { code: "ND", names: ["north dakota"] },
  { code: "OH", names: ["ohio"] },
  { code: "OK", names: ["oklahoma"] },
  { code: "OR", names: ["oregon"] },
  { code: "PA", names: ["pennsylvania"] },
  { code: "RI", names: ["rhode island"] },
  { code: "SC", names: ["south carolina"] },
  { code: "SD", names: ["south dakota"] },
  { code: "TN", names: ["tennessee"] },
  { code: "TX", names: ["texas"] },
  { code: "UT", names: ["utah"] },
  { code: "VT", names: ["vermont"] },
  { code: "VA", names: ["virginia"] },
  { code: "WA", names: ["washington"] },
  { code: "WV", names: ["west virginia"] },
  { code: "WI", names: ["wisconsin"] },
  { code: "WY", names: ["wyoming"] },
  { code: "DC", names: ["district of columbia", "washington dc", "washington d c", "washington, dc"] },
  { code: "AS", names: ["american samoa"] },
  { code: "GU", names: ["guam"] },
  { code: "MP", names: ["northern mariana islands"] },
  { code: "PR", names: ["puerto rico"] },
  { code: "VI", names: ["virgin islands", "u s virgin islands", "us virgin islands", "united states virgin islands"] },
] as const;

const STATE_NAME_TO_CODE = STATE_ENTRIES.reduce<Record<string, string>>((acc, entry) => {
  entry.names.forEach((name) => {
    acc[name] = entry.code;
  });
  return acc;
}, {});

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTwoLetterCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Za-z]{2}$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export function resolveStateCode(input?: string | null): string | null {
  if (!input) return null;
  const asCode = normalizeTwoLetterCode(input);
  if (asCode) return asCode;
  const normalizedName = normalizeName(input);
  if (!normalizedName) return null;
  return STATE_NAME_TO_CODE[normalizedName] ?? null;
}

export function isStateCode(value?: string | null): value is string {
  return Boolean(resolveStateCode(value));
}
