import { NextResponse } from 'next/server';
import { getPdf } from '@/resume/server/pdf-store';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  const id = context.params.id;
  const record = getPdf(id);

  if (!record) {
    return NextResponse.json({ error: 'PDF not found or expired' }, { status: 404, headers });
  }

  headers.set('Content-Type', 'application/pdf');
  headers.set('Content-Disposition', `inline; filename="${record.filename}"`);
  const arrayBuffer = record.buffer.buffer.slice(record.buffer.byteOffset, record.buffer.byteOffset + record.buffer.byteLength) as ArrayBuffer;
  return new Response(arrayBuffer, { status: 200, headers });
}
