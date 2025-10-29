import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getResourcesCollection, getResourceAuditsCollection, ObjectId } from "@cl/db";

const zBody = z.object({
  method: z.union([z.literal("phone"), z.literal("site"), z.literal("email")]),
  notes: z.string().optional(),
  by: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json().catch(() => null);
  const parsed = zBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.message } }, { status: 400 });
  const { method, notes, by } = parsed.data;
  const who = by || req.headers.get("x-user-email") || "moderator@site";
  const at = new Date().toISOString();

  const col = await getResourcesCollection();
  const audits = await getResourceAuditsCollection();
  const _id = new ObjectId(id);
  const upd = await col.updateOne({ _id }, { $set: { verified: { by: who, at, method }, updatedAt: at } });
  if (upd.matchedCount === 0) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  await audits.insertOne({ resourceId: id, action: "verify", by: who, at, method, notes });
  return NextResponse.json({ id, verified: { by: who, at, method } });
}
