import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { compileTemplate } from '@/resume/server/compile';
import { renderHtmlToPdf } from '@/resume/server/pdf-service';
import { ResumeSchema, type ResumePayload } from '@/resume/server/validation';
import { logger } from '@/resume/server/logger';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';

export const runtime = 'nodejs';

const ALLOWED_TEMPLATES = new Set<TemplateName>(TEMPLATES);

export async function POST(request: NextRequest) {
  const reqId = nanoid();
  const url = new URL(request.url);
  const requestedTemplate = (url.searchParams.get('template') ?? 'classic').toLowerCase();
  const template = isTemplate(requestedTemplate) ? requestedTemplate : undefined;
  const headers = new Headers({
    'X-Request-Id': reqId,
    'Cache-Control': 'no-store',
  });
  const startedAt = process.hrtime.bigint();

  if (!template || !ALLOWED_TEMPLATES.has(template)) {
    logRequest({ reqId, template: requestedTemplate, startedAt, level: 'warn' });
    return NextResponse.json({ error: 'Unsupported template' }, { status: 422, headers });
  }

  let payload: ResumePayload;
  try {
    const body = await request.json();
    payload = ResumeSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    logRequest({ reqId, template, startedAt, level: 'warn', error });
    return NextResponse.json({ error: 'Validation failed', details: message }, { status: 400, headers });
  }

  try {
    const html = compileTemplate(template, payload);
    const pdf = await renderHtmlToPdf(html);

    const response = new NextResponse(new Uint8Array(pdf), { status: 200, headers });
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `attachment; filename="resume-${template}.pdf"`);
    logRequest({ reqId, template, startedAt, level: 'info' });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[resume-pdf] render failure', error);
    logRequest({ reqId, template, startedAt, level: 'error', error });
    return NextResponse.json({ error: 'PDF generation failed', details: message }, { status: 500, headers });
  }
}

type LogLevel = 'info' | 'warn' | 'error';

function isTemplate(value: string): value is TemplateName {
  return (TEMPLATES as readonly string[]).includes(value);
}

function logRequest({
  reqId,
  template,
  startedAt,
  level,
  error,
}: {
  reqId: string;
  template: string;
  startedAt: bigint;
  level: LogLevel;
  error?: unknown;
}) {
  const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1e6));
  const payload = {
    requestId: reqId,
    template,
    durationMs,
    ...(error instanceof Error
      ? { error: error.message, errorStack: error.stack }
      : error
        ? { error: String(error) }
        : {}),
  };
  const log = typeof logger[level] === 'function' ? logger[level].bind(logger) : logger.info.bind(logger);
  log(payload, 'resume-pdf');
}
