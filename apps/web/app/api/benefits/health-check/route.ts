import { NextRequest, NextResponse } from "next/server";
import {
  type BenefitsHealthCheckRequest,
  type BenefitsHealthCheckResponse,
  type BenefitsHealthCheckBand,
  zBenefitsHealthCheckRequest,
  zBenefitsHealthCheckResponse,
} from "@cl/types";
import { createLogger } from "@/lib/logger";
import { computeFplRatio, POVERTY_GUIDELINES_VINTAGE, stateCoverageConfig } from "@/lib/benefits/healthGuidelines";

const log = createLogger("api/benefits/health-check");

const SOURCE_METADATA = "fpl-2024 + medicaid-expansion-map";
const DEFAULT_DISCLAIMERS = [
  "This is a quick check, not a final decision.",
  "Each state has its own rules for Medicaid, CHIP, and Marketplace savings.",
  "Only your state or HealthCare.gov can make the final eligibility decision.",
];

const PROGRAM_HINTS: Record<BenefitsHealthCheckBand, string[]> = {
  likely_medicaid_or_chip: [
    "Look for Medicaid and CHIP applications in your state.",
    "Children and pregnant people may have different rules.",
  ],
  likely_marketplace_with_savings: [
    "Look for Marketplace plans with premium tax credits.",
    "You may qualify for lower monthly payments.",
  ],
  likely_marketplace_full_price: [
    "Compare Marketplace plans even if savings are limited.",
    "You can still shop for coverage and see final prices.",
  ],
  uncertain_check_state_rules: [
    "Check your state’s Medicaid website for details.",
    "You may need to talk with a local helper about Medicaid rules.",
  ],
};

const BAND_SUMMARIES: Record<BenefitsHealthCheckBand, string> = {
  likely_medicaid_or_chip: "You may qualify for Medicaid or CHIP in your state.",
  likely_marketplace_with_savings: "You may qualify for savings on a Marketplace health plan.",
  likely_marketplace_full_price: "You may still get Marketplace coverage, but savings may be limited.",
  uncertain_check_state_rules: "Your state has different Medicaid rules. Check with your state or talk to a helper.",
};

export async function POST(req: NextRequest) {
  const payload = await parseRequest(req);
  if (!payload.success) return payload.errorResponse;

  const request = payload.data;
  const stateCode = resolveStateCode(request);
  if (!stateCode) {
    return NextResponse.json(
      {
        error: {
          code: "STATE_REQUIRED",
          message: "We could not figure out your state. Please add your state before running this check.",
        },
      },
      { status: 400 },
    );
  }

  const annualIncome = request.monthlyIncome * 12;
  const fplData = computeFplRatio({
    stateCode,
    householdSize: request.householdSize,
    annualIncome,
  });

  const { band, summary } = classifyBand(fplData.fplRatio, fplData.isMedicaidExpansionState);
  const response: BenefitsHealthCheckResponse = {
    annualIncome,
    fplRatio: Number(fplData.fplRatio.toFixed(3)),
    fplPercent: Math.round(fplData.fplRatio * 100),
    householdSize: request.householdSize,
    stateCode,
    isMedicaidExpansionState: fplData.isMedicaidExpansionState,
    band,
    summary,
    programHints: PROGRAM_HINTS[band],
    disclaimers: DEFAULT_DISCLAIMERS,
    source: SOURCE_METADATA,
    dataVintage: POVERTY_GUIDELINES_VINTAGE,
  };

  log.info("health-check result", {
    stateCode,
    householdSize: request.householdSize,
    fplBucket: summarizeFplBucket(fplData.fplRatio),
  });

  return NextResponse.json(zBenefitsHealthCheckResponse.parse(response));
}

async function parseRequest(
  req: NextRequest,
): Promise<{ success: true; data: BenefitsHealthCheckRequest } | { success: false; errorResponse: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      errorResponse: NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 }),
    };
  }

  const parsed = zBenefitsHealthCheckRequest.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors.join(" ") || "Invalid request.";
    return {
      success: false,
      errorResponse: NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 }),
    };
  }

  return { success: true, data: parsed.data };
}

function resolveStateCode(request: BenefitsHealthCheckRequest): string | null {
  if (request.stateCode && stateCoverageConfig[request.stateCode]) {
    return request.stateCode;
  }
  const inferred = inferStateFromLocation(request.locationText);
  return inferred && stateCoverageConfig[inferred] ? inferred : null;
}

function inferStateFromLocation(locationText: string): string | null {
  const tokens = locationText
    .split(/[\s,]+/)
    .map((token) => token.trim().toUpperCase())
    .filter((token) => token.length > 0);

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const token = tokens[i]!;
    if (/^[A-Z]{2}$/.test(token) && stateCoverageConfig[token]) {
      return token;
    }
  }
  return null;
}

function classifyBand(fplRatio: number, isMedicaidExpansionState: boolean): { band: BenefitsHealthCheckBand; summary: string } {
  if (fplRatio <= 1.38) {
    if (isMedicaidExpansionState) {
      return { band: "likely_medicaid_or_chip", summary: BAND_SUMMARIES.likely_medicaid_or_chip };
    }
    return { band: "uncertain_check_state_rules", summary: BAND_SUMMARIES.uncertain_check_state_rules };
  }

  if (fplRatio <= 4) {
    return { band: "likely_marketplace_with_savings", summary: BAND_SUMMARIES.likely_marketplace_with_savings };
  }

  return { band: "likely_marketplace_full_price", summary: BAND_SUMMARIES.likely_marketplace_full_price };
}

function summarizeFplBucket(fplRatio: number) {
  if (fplRatio <= 1) return "FPL<=1.0";
  if (fplRatio <= 1.38) return "FPL<=1.38";
  if (fplRatio <= 2) return "FPL<=2.0";
  if (fplRatio <= 4) return "FPL<=4.0";
  return "FPL>4.0";
}
