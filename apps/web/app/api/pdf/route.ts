import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { compileTemplate } from '@/resume/server/compile';
import { renderHtmlToPdf } from '@/resume/server/pdf-service';
import { ResumeSchema, type ResumePayload } from '@/resume/server/validation';
import { logger } from '@/resume/server/logger';
import { TEMPLATES, type TemplateName } from '@/resume/shared/templates';
import { buildResumeFilename } from '@/resume/shared/filename';
import { savePdf } from '@/resume/server/pdf-store';

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
    'Content-Type': 'application/json',
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
    let message = 'Some required information is missing or invalid.';
    
    // Parse Zod errors into friendly messages
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = (error as any).issues as Array<{ path: string[]; message: string; code: string }>;
      const friendlyErrors: string[] = [];
      
      for (const issue of issues) {
        const field = issue.path[0];
        switch (field) {
          case 'name':
            friendlyErrors.push('Please enter your full name (at least 2 letters).');
            break;
          case 'email':
            friendlyErrors.push('Please enter a valid email address like name@email.com');
            break;
          case 'phone':
            friendlyErrors.push('Please enter a phone number with at least 7 digits.');
            break;
          case 'location':
            friendlyErrors.push('Please enter your city and state.');
            break;
          case 'summary':
            friendlyErrors.push('Please keep your summary under 800 characters.');
            break;
          default:
            friendlyErrors.push(issue.message);
        }
      }
      
      if (friendlyErrors.length > 0) {
        message = friendlyErrors.join(' ');
      }
    }
    
    logRequest({ reqId, template, startedAt, level: 'warn', error });
    return NextResponse.json({ error: 'Please fix the following', details: message }, { status: 400, headers });
  }

  try {
    const html = compileTemplate(template, payload);
    const pdf = await renderHtmlToPdf(html);
    const filename = buildResumeFilename(payload.name, template);
    const { id } = savePdf(new Uint8Array(pdf), filename);
    const previewPath = `/api/resume/pdf/${id}`;
    const previewUrl = `${request.nextUrl.origin}${previewPath}`;

    logRequest({ reqId, template, startedAt, level: 'info' });
    return NextResponse.json(
      {
        pdfId: id,
        previewUrl,
        filename,
      },
      { status: 201, headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[resume-pdf] render failure', error);
    logRequest({ reqId, template, startedAt, level: 'error', error });
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        details: message,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500, headers },
    );
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
