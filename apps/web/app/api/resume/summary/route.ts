import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import {
  MissingApiKeyError,
  SummaryRewriteSchema,
  UpstreamRateLimitError,
  UpstreamRequestError,
  UpstreamUnauthorizedError,
  rewriteSummaryWithAi,
} from '@/resume/server/summary-rewriter';
import { logger } from '@/resume/server/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const reqId = nanoid();
  const headers = new Headers({
    'X-Request-Id': reqId,
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  const startedAt = process.hrtime.bigint();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    logRequest({ reqId, startedAt, level: 'warn', error: 'Invalid JSON body' });
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  let normalizedPayload: ReturnType<typeof SummaryRewriteSchema.parse>;
  try {
    normalizedPayload = SummaryRewriteSchema.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid payload';
    logRequest({ reqId, startedAt, level: 'warn', error: message });
    return NextResponse.json({ error: 'Validation failed', details: message }, { status: 400, headers });
  }

  try {
    const summary = await rewriteSummaryWithAi(normalizedPayload, { requestId: reqId });
    logRequest({ reqId, startedAt, level: 'info' });
    return NextResponse.json({ summary }, { status: 200, headers });
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      logRequest({ reqId, startedAt, level: 'error', error: error.message });
      return NextResponse.json({ error: 'AI integration not configured' }, { status: 401, headers });
    }
    if (error instanceof UpstreamUnauthorizedError) {
      logRequest({ reqId, startedAt, level: 'error', error: error.message });
      return NextResponse.json({ error: 'AI provider rejected credentials' }, { status: 401, headers });
    }
    if (error instanceof UpstreamRateLimitError) {
      logRequest({ reqId, startedAt, level: 'warn', error: error.message });
      return NextResponse.json({ error: 'AI provider rate limited the request' }, { status: 429, headers });
    }
    if (error instanceof UpstreamRequestError) {
      logRequest({ reqId, startedAt, level: 'error', error: error.message });
      return NextResponse.json({ error: 'Summary rewrite failed', details: error.message }, { status: 502, headers });
    }

    logRequest({ reqId, startedAt, level: 'error', error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Unexpected failure during summary rewrite' }, { status: 500, headers });
  }
}

type LogLevel = 'info' | 'warn' | 'error';

function logRequest({
  reqId,
  startedAt,
  level,
  error,
}: {
  reqId: string;
  startedAt: bigint;
  level: LogLevel;
  error?: string;
}) {
  const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1e6));
  const payload = {
    requestId: reqId,
    durationMs,
    ...(error ? { error } : {}),
  };
  const log = typeof logger[level] === 'function' ? logger[level].bind(logger) : logger.info.bind(logger);
  log(payload, 'resume-summary');
}
