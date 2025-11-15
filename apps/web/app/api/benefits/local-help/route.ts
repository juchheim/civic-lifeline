import { NextRequest, NextResponse } from "next/server";
import { type BenefitsLocalHelpRequest, type BenefitsLocalHelpKind, type BenefitsLocalHelpResult, zBenefitsLocalHelpRequest, zBenefitsLocalHelpResponse } from "@cl/types";
import { createLogger } from "@/lib/logger";
import { fetchAjcCentersForLocation, getAjcConfig } from "./ajcClient";

const log = createLogger("api/benefits/local-help");

const SAMPLE_ITEMS: Record<BenefitsLocalHelpKind, BenefitsLocalHelpResult[]> = {
  food: [
    {
      id: "sample-food-1",
      name: "Community Food Pantry",
      description: "Free groceries once a week.",
      address: "123 Main St",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-123-4567",
      distanceMiles: 1.2,
      source: "sample",
    },
    {
      id: "sample-food-2",
      name: "Meals and More",
      description: "Hot meals served Monday-Friday.",
      address: "75 Oak Ave",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-987-2211",
      website: "https://example.org/meals",
      distanceMiles: 3.5,
      source: "sample",
    },
  ],
  cash: [
    {
      id: "sample-cash-1",
      name: "County Human Services",
      description: "Apply for cash help like TANF.",
      address: "200 Center St",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-222-1111",
      distanceMiles: 2.1,
      source: "sample",
    },
  ],
  housing: [
    {
      id: "sample-housing-1",
      name: "Housing Choice Voucher Office",
      description: "Helps with Section 8 vouchers.",
      address: "10 River Rd",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-444-1111",
      website: "https://example.org/housing",
      distanceMiles: 4.4,
      source: "sample",
    },
  ],
  bills: [
    {
      id: "sample-bills-1",
      name: "Energy Bill Relief Center",
      description: "Helps with electric and gas bills.",
      address: "88 Power Line",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-888-1212",
      distanceMiles: 5.3,
      source: "sample",
    },
  ],
  kids: [
    {
      id: "sample-kids-1",
      name: "Head Start Enrollment",
      description: "Preschool and family support.",
      address: "450 Elm St",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-333-9988",
      distanceMiles: 2.8,
      source: "sample",
    },
  ],
  health: [
    {
      id: "sample-health-1",
      name: "Marketplace Navigator Office",
      description: "Free help applying for Medicaid or Marketplace plans.",
      address: "300 Healthy Way",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-765-4321",
      website: "https://example.org/health",
      distanceMiles: 1.7,
      source: "sample",
    },
  ],
  "social-security": [
    {
      id: "sample-ssa-1",
      name: "Social Security Resource Center",
      description: "Help with SSI or SSDI applications.",
      address: "640 Federal Plz",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-909-4545",
      distanceMiles: 6.2,
      source: "sample",
    },
  ],
  veterans: [
    {
      id: "sample-veterans-1",
      name: "Veterans Service Organization",
      description: "Help with VA claims and legal aid.",
      address: "50 Service Rd",
      city: "Sampletown",
      state: "MS",
      postalCode: "39194",
      phone: "555-101-7878",
      website: "https://example.org/vets",
      distanceMiles: 7.9,
      source: "sample",
    },
  ],
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=60",
};

export async function POST(req: NextRequest) {
  const payload = await parseBody(req);
  if (!payload.success) {
    return payload.errorResponse;
  }

  const request = payload.data;
  const config = getAjcConfig();
  log.info("local-help search", { kind: request.kind, ajcConfigured: config.enabled });

  if (!config.enabled) {
    return respondWithSample(request.kind);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const items = await fetchAjcCentersForLocation({
      locationText: request.locationText,
      radiusMiles: config.radiusMiles,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const response = zBenefitsLocalHelpResponse.parse({
      items,
      source: "career-onestop-ajc",
      lastUpdated: new Date().toISOString(),
    });
    return NextResponse.json(response, { headers: CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.warn("ajc local-help error", { kind: request.kind, message });
    return respondWithSample(request.kind);
  }
}

async function parseBody(
  req: NextRequest,
): Promise<{ success: true; data: BenefitsLocalHelpRequest } | { success: false; errorResponse: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      success: false,
      errorResponse: NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 }),
    };
  }

  const parsed = zBenefitsLocalHelpRequest.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors.join(" ") || "Invalid request.";
    return {
      success: false,
      errorResponse: NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 }),
    };
  }

  return { success: true, data: parsed.data };
}

function respondWithSample(kind: BenefitsLocalHelpKind) {
  const items = SAMPLE_ITEMS[kind] ?? [];
  const response = zBenefitsLocalHelpResponse.parse({
    items,
    source: "sample-local-data",
    lastUpdated: new Date().toISOString(),
  });
  return NextResponse.json(response, { headers: CACHE_HEADERS });
}
