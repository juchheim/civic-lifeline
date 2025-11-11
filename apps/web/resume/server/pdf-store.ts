import { randomUUID } from 'crypto';
import { getDb } from '@cl/db';

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const COLLECTION_NAME = 'resumePdfPreviews';

type PdfPreviewDocument = {
  _id: string;
  buffer: Buffer;
  filename: string;
  createdAt: Date;
  expiresAt: Date;
};

let collectionPromise: Promise<any> | null = null;

async function getPdfCollection() {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<PdfPreviewDocument>(COLLECTION_NAME);
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      return collection;
    })();
  }
  return collectionPromise;
}

export async function savePdf(buffer: Uint8Array, filename: string) {
  const collection = await getPdfCollection();
  const id = randomUUID();
  const now = Date.now();
  const expiresAtDate = new Date(now + EXPIRY_MS);

  await collection.insertOne({
    _id: id,
    buffer: Buffer.from(buffer),
    filename,
    createdAt: new Date(now),
    expiresAt: expiresAtDate,
  });

  return { id, expiresAt: expiresAtDate.getTime() };
}

export async function getPdf(id: string) {
  const collection = await getPdfCollection();
  const record = await collection.findOne({ _id: id });
  if (!record) {
    return null;
  }

  const expiresAtMs = record.expiresAt.getTime();
  if (expiresAtMs < Date.now()) {
    await collection.deleteOne({ _id: id });
    return null;
  }

  const buffer = new Uint8Array(record.buffer);
  return {
    buffer,
    filename: record.filename,
    expiresAt: expiresAtMs,
  };
}
