import { randomUUID } from 'crypto';

type StoredPdf = {
  buffer: Uint8Array;
  filename: string;
  expiresAt: number;
};

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const pdfStore = new Map<string, StoredPdf>();

export function savePdf(buffer: Uint8Array, filename: string) {
  purgeExpiredPdfs();
  const id = randomUUID();
  const expiresAt = Date.now() + EXPIRY_MS;
  pdfStore.set(id, {
    buffer,
    filename,
    expiresAt,
  });
  return { id, expiresAt };
}

export function getPdf(id: string) {
  purgeExpiredPdfs();
  const record = pdfStore.get(id);
  if (!record) return null;
  if (record.expiresAt < Date.now()) {
    pdfStore.delete(id);
    return null;
  }
  return record;
}

function purgeExpiredPdfs() {
  const now = Date.now();
  for (const [id, record] of pdfStore.entries()) {
    if (record.expiresAt < now) {
      pdfStore.delete(id);
    }
  }
}
