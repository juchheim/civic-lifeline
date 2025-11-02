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

  const response = new NextResponse(record.buffer, { status: 200, headers });
  response.headers.set('Content-Type', 'application/pdf');
  response.headers.set('Content-Disposition', `inline; filename="${record.filename}"`);
  return response;
}
