import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getResourcesCollection, getResourceAuditsCollection } from "@cl/db";
import { parseBbox } from "@cl/utils";
import { zResourceType, type Resource } from "@cl/types";

const zGetQuery = z.object({
  bbox: z.string().optional(),
  type: zResourceType.optional(),
  queue: z.string().optional(),
});

const zPostBody = z.object({
  type: zResourceType,
  name: z.string(),
  description: z.string().optional(),
  coords: z.tuple([z.number(), z.number()]),
  address: z.string().optional(),
  contact: z.object({ phone: z.string().optional(), email: z.string().optional(), site: z.string().optional() }).optional(),
  hours: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = zGetQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  const { bbox, type, queue } = parsed.data;

  const col = await getResourcesCollection();
  const q: any = {};
  if (!queue) q["verified"] = { $exists: true };
  if (type) q["type"] = type;
  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = parseBbox(bbox);
    q["loc"] = {
      $geoWithin: {
        $box: [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
      },
    };
  }
  const docs: Array<Resource & { _id: unknown; loc?: { coordinates?: [number, number] } }> = await col
    .find(q)
    .limit(500)
    .toArray();
  const items = docs.map((doc): {
    id: string;
    type: Resource["type"];
    name: string;
    description?: string;
    coords?: [number, number];
    address?: string;
    contact?: Resource["contact"];
    hours?: string;
    verified?: Resource["verified"];
  } => ({
    id: String(doc._id),
    type: doc.type,
    name: doc.name,
    description: doc.description,
    coords: (doc as any).loc?.coordinates,
    address: doc.address,
    contact: doc.contact,
    hours: doc.hours,
    verified: doc.verified,
  }));
  return NextResponse.json({ items, source: queue ? "Moderation Queue" : "Community", lastUpdated: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = zPostBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  const b = parsed.data;

  const now = new Date().toISOString();
  const col = await getResourcesCollection();
  const audits = await getResourceAuditsCollection();
  const submittedBy = req.headers.get("x-user-email") || null;

  const doc: any = {
    type: b.type,
    name: b.name,
    description: b.description,
    loc: { type: "Point", coordinates: b.coords },
    address: b.address,
    contact: b.contact,
    hours: b.hours,
    submittedBy,
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);
  await audits.insertOne({ resourceId: String(res.insertedId), action: "create", by: submittedBy || "anonymous", at: now });
  return NextResponse.json({ id: String(res.insertedId), status: "queued" }, { status: 201 });
}
