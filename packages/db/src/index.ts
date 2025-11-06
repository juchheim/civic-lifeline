import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { FccBroadband, State, County } from "@cl/types";

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

export async function getStatesCollection(): Promise<Collection<State & { _id: string }>> {
  const db = await getDb();
  return db.collection<State & { _id: string }>("states");
}

export async function getCountiesCollection(): Promise<Collection<County & { _id: string }>> {
  const db = await getDb();
  return db.collection<County & { _id: string }>("counties");
}

export { ObjectId };
