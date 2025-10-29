import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { FccBroadband, Resource } from "@cl/types";

let _client: MongoClient | null = null;
let _db: Db | null = null;

export async function getMongoClient(uri?: string): Promise<MongoClient> {
  if (_client) return _client;
  const mongoUri = uri ?? process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is required");
  _client = new MongoClient(mongoUri);
  await _client.connect();
  return _client;
}

export async function getDb(dbName?: string): Promise<Db> {
  if (_db) return _db;
  const client = await getMongoClient();
  _db = client.db(dbName ?? process.env.MONGO_DB ?? "cl");
  return _db;
}

export async function getFccBroadbandCollection(): Promise<Collection<FccBroadband & { _id: string }>> {
  const db = await getDb();
  return db.collection<FccBroadband & { _id: string }>("fccBroadband");
}

export async function getResourcesCollection(): Promise<Collection<any>> {
  const db = await getDb();
  return db.collection("resources");
}

export interface ResourceAudit {
  _id?: string;
  resourceId: string;
  action: "verify" | "create" | "update";
  by: string;
  at: string;
  method?: "phone" | "site" | "email";
  notes?: string;
}

export async function getResourceAuditsCollection(): Promise<Collection<ResourceAudit>> {
  const db = await getDb();
  return db.collection<ResourceAudit>("resourceAudits");
}

export { ObjectId };
