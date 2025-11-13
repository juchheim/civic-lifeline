import { NextRequest, NextResponse } from "next/server";
import { getCountiesCollection } from "@cl/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const stateCode = url.searchParams.get("stateCode");

  if (!stateCode || stateCode.length !== 2) {
    return NextResponse.json({ error: "stateCode parameter required (2-letter code)" }, { status: 400 });
  }

  try {
    const countiesCollection = await getCountiesCollection();
    const counties = await countiesCollection
      .find({ stateCode: stateCode.toUpperCase() })
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json(counties);
  } catch (error) {
    console.error("Error fetching counties:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch counties", details: errorMessage },
      { status: 500 }
    );
  }
}

