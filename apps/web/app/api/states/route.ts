import { NextResponse } from "next/server";
import { getStatesCollection } from "@cl/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const statesCollection = await getStatesCollection();
    const states = await statesCollection.find({}).sort({ name: 1 }).toArray();
    return NextResponse.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch states", details: errorMessage },
      { status: 500 }
    );
  }
}

