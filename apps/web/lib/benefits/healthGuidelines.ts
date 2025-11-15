// NOTE: These guidelines change annually. Update the data + dataVintage when new HHS poverty guidelines are published.

export type FplRegion = "contiguous" | "alaska" | "hawaii";

export interface PovertyGuidelineRow {
  householdSize: number;
  annualFpl: number;
}

interface PovertyGuidelineTable {
  rows: PovertyGuidelineRow[];
  extraPersonAmount: number;
}

export const POVERTY_GUIDELINES_VINTAGE = "2024";

export const povertyGuidelines2024: Record<FplRegion, PovertyGuidelineTable> = {
  contiguous: {
    rows: [
      { householdSize: 1, annualFpl: 15060 },
      { householdSize: 2, annualFpl: 20440 },
      { householdSize: 3, annualFpl: 25820 },
      { householdSize: 4, annualFpl: 31200 },
      { householdSize: 5, annualFpl: 36580 },
      { householdSize: 6, annualFpl: 41960 },
      { householdSize: 7, annualFpl: 47340 },
      { householdSize: 8, annualFpl: 52720 },
    ],
    extraPersonAmount: 5380,
  },
  alaska: {
    rows: [
      { householdSize: 1, annualFpl: 18810 },
      { householdSize: 2, annualFpl: 25540 },
      { householdSize: 3, annualFpl: 32270 },
      { householdSize: 4, annualFpl: 39000 },
      { householdSize: 5, annualFpl: 45730 },
      { householdSize: 6, annualFpl: 52460 },
      { householdSize: 7, annualFpl: 59190 },
      { householdSize: 8, annualFpl: 65920 },
    ],
    extraPersonAmount: 6730,
  },
  hawaii: {
    rows: [
      { householdSize: 1, annualFpl: 17310 },
      { householdSize: 2, annualFpl: 23490 },
      { householdSize: 3, annualFpl: 29670 },
      { householdSize: 4, annualFpl: 35850 },
      { householdSize: 5, annualFpl: 42030 },
      { householdSize: 6, annualFpl: 48210 },
      { householdSize: 7, annualFpl: 54390 },
      { householdSize: 8, annualFpl: 60570 },
    ],
    extraPersonAmount: 6180,
  },
};

export interface StateCoverageConfig {
  region: FplRegion;
  isMedicaidExpansion: boolean;
}

const ALL_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const NON_EXPANSION_STATES = new Set(["AL", "FL", "GA", "KS", "MS", "SC", "TN", "TX", "WI", "WY"]);

export const stateCoverageConfig: Record<string, StateCoverageConfig> = ALL_STATE_CODES.reduce(
  (acc, code) => {
    const region: FplRegion = code === "AK" ? "alaska" : code === "HI" ? "hawaii" : "contiguous";
    acc[code] = {
      region,
      isMedicaidExpansion: !NON_EXPANSION_STATES.has(code),
    };
    return acc;
  },
  {} as Record<string, StateCoverageConfig>,
);

export function computeFplRatio(params: {
  stateCode: string;
  householdSize: number;
  annualIncome: number;
}): {
  region: FplRegion;
  isMedicaidExpansionState: boolean;
  fplValue: number;
  fplRatio: number;
} {
  const normalizedState = params.stateCode.toUpperCase();
  const config = stateCoverageConfig[normalizedState] ?? { region: "contiguous" as FplRegion, isMedicaidExpansion: true };
  const table = povertyGuidelines2024[config.region];
  const fplValue = getGuidelineValue(table, params.householdSize);
  const ratio = fplValue > 0 ? params.annualIncome / fplValue : 0;
  return {
    region: config.region,
    isMedicaidExpansionState: config.isMedicaidExpansion,
    fplValue,
    fplRatio: Number.isFinite(ratio) ? ratio : 0,
  };
}

function getGuidelineValue(table: PovertyGuidelineTable, householdSize: number) {
  if (householdSize <= table.rows.length) {
    return table.rows[householdSize - 1]!.annualFpl;
  }
  const maxRow = table.rows[table.rows.length - 1]!;
  const extraPeople = householdSize - table.rows.length;
  return maxRow.annualFpl + extraPeople * table.extraPersonAmount;
}
