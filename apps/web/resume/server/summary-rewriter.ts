import { z } from 'zod';
import { logger } from '@/resume/server/logger';

const SYSTEM_PROMPT = `You help adults who struggle with formal writing turn structured resume data into a polished summary for entry-level or service jobs. Think through improvements silently. When you respond, output exactly one line that begins with "SUMMARY:" followed by 45-70 words in plain US English. Keep the voice confident, respectful, and job-ready, match the requested reading level without naming it, highlight reliability, people skills, and real impact without exaggerating, avoid first-person pronouns or repeating the candidate's name, and never invent achievements, employers, or credentials. Do not add any other text or explanations.`;

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.RESUME_SUMMARY_MODEL?.trim() || 'gpt-5-mini-2025-08-07';
const MAX_OUTPUT_TOKENS = 1200;
const MAX_GPT5_COMPLETION_TOKENS = 2500; // Higher limit for GPT-5 to account for reasoning tokens
const MAX_RETURNED_SUMMARY_CHARS = 800;

export const SummaryRewriteSchema = z.object({
  recentRole: z
    .object({
      title: z
        .string()
        .max(160)
        .optional()
        .transform(value => (value ? sanitizeField(value) : undefined)),
      employer: z
        .string()
        .max(160)
        .optional()
        .transform(value => (value ? sanitizeField(value) : undefined)),
      tenureLabel: z
        .string()
        .max(60)
        .optional()
        .transform(value => (value ? sanitizeField(value) : undefined)),
      tenureYears: z.number().min(0).max(60).optional(),
    })
    .optional(),
  topSkills: z
    .array(
      z
        .string()
        .max(80)
        .transform(skill => sanitizeField(skill)),
    )
    .max(5)
    .default([])
    .transform(skills => skills.filter(Boolean)),
  highestEducation: z
    .object({
      labels: z
        .array(
          z
            .string()
            .max(160)
            .transform(label => sanitizeField(label)),
        )
        .min(1)
        .max(5)
        .transform(labels => labels.filter(Boolean)),
      readingLevel: z
        .string()
        .max(40)
        .transform(value => value.trim()),
    })
    .optional(),
  readingLevel: z
    .string()
    .max(40)
    .transform(value => value.trim()),
  contactContext: z
    .object({
      city: z
        .string()
        .max(80)
        .optional()
        .transform(value => (value ? sanitizeField(value) : undefined)),
      state: z
        .string()
        .max(2)
        .optional()
        .transform(value => (value ? value.toUpperCase() : undefined)),
    })
    .optional(),
});

export type SummaryRewriteInput = z.infer<typeof SummaryRewriteSchema>;

export async function rewriteSummaryWithAi(
  rawInput: SummaryRewriteInput,
  { requestId }: { requestId: string },
): Promise<string> {
  const input = SummaryRewriteSchema.parse(rawInput);
  const apiKey = process.env.OPENAI_API_KEY || process.env.GPT5_NANO_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('OPENAI_API_KEY is not configured');
  }

  const { userMessage } = buildPrompt(input);
  const targetUrl = resolveApiUrl();
  const payload = buildChatCompletionPayload(MODEL, userMessage);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const startedAt = process.hrtime.bigint();

  let response: Response | undefined;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1e6));
    logger.error(
      { requestId, durationMs, model: MODEL, error: error instanceof Error ? error.message : String(error) },
      'resume-summary-ai',
    );
    throw new UpstreamRequestError('Failed to call summary rewrite model');
  } finally {
    clearTimeout(timeout);
  }

  const durationMs = Number((process.hrtime.bigint() - startedAt) / BigInt(1e6));
  if (!response.ok) {
    const reason = await readErrorReason(response);
    logger.warn({ requestId, status: response.status, durationMs, reason, model: MODEL }, 'resume-summary-ai-upstream-failure');
    if (response.status === 401 || response.status === 403) {
      throw new UpstreamUnauthorizedError('Summary rewrite provider rejected the request');
    }
    if (response.status === 429) {
      throw new UpstreamRateLimitError('Summary rewrite provider rate limited the request');
    }
    throw new UpstreamRequestError(reason ?? 'Summary rewrite provider returned an error');
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    logger.error({ requestId, durationMs, model: MODEL }, 'resume-summary-ai-invalid-json');
    throw new UpstreamRequestError('Summary rewrite provider returned malformed JSON');
  }

  const rewritten = extractText(json);
  if (!rewritten) {
    logger.error({ requestId, durationMs, model: MODEL, response: json }, 'resume-summary-ai-empty-output');
    throw new UpstreamRequestError('Summary rewrite provider returned an empty response');
  }

  const normalizedSummary = normalizeSummaryOutput(rewritten);
  if (!normalizedSummary) {
    logger.error({ requestId, durationMs, model: MODEL, response: json }, 'resume-summary-ai-invalid-format');
    throw new UpstreamRequestError('Summary rewrite provider returned an unexpected format');
  }

  logger.info({ requestId, durationMs, model: MODEL }, 'resume-summary-ai-success');
  return truncate(normalizedSummary, MAX_RETURNED_SUMMARY_CHARS);
}

function buildPrompt(input: SummaryRewriteInput) {
  const lines: string[] = [];
  if (input.recentRole?.title || input.recentRole?.employer) {
    const roleParts = [input.recentRole.title, input.recentRole.employer ? `at ${input.recentRole.employer}` : undefined]
      .filter(Boolean)
      .join(' ');
    const tenureSuffix = input.recentRole.tenureLabel ? ` (${input.recentRole.tenureLabel})` : '';
    lines.push(`- Recent role: ${roleParts}${tenureSuffix}`);
  } else {
    lines.push('- Recent role: Not provided.');
  }

  if (input.topSkills.length) {
    lines.push(`- Top skills: ${input.topSkills.join(', ')}`);
  } else {
    lines.push('- Top skills: Not provided.');
  }

  if (input.highestEducation) {
    lines.push(`- Highest education: ${input.highestEducation.labels.join(', ')}`);
    lines.push(`- Reading level guidance: ${input.highestEducation.readingLevel}`);
  } else {
    lines.push('- Highest education: Not provided.');
    lines.push(`- Reading level guidance: ${input.readingLevel}`);
  }

  if (input.contactContext?.city || input.contactContext?.state) {
    lines.push(
      `- Location context: ${[input.contactContext.city, input.contactContext.state].filter(Boolean).join(', ')}`,
    );
  }

  lines.push(`- Match the ${input.readingLevel} reading level without mentioning it explicitly.`);

  const userMessage = [
    'Using the structured facts below, craft a resume summary for entry-level or service jobs.',
    'Use only the provided details. Do not invent employers, credentials, or additional achievements.',
    'Write 45-70 words in implied first person (no "I" or "my") with a confident, respectful, job-ready tone.',
    'Highlight reliability, people skills, and real impact. Mention tenure, skills, and education when available.',
    'Respond with exactly one line that starts with "SUMMARY:" followed by the finished summary. Include nothing else.',
    '',
    'Structured candidate data:',
    lines.join('\n'),
  ].join('\n');

  return { userMessage };
}

function buildChatCompletionPayload(modelName: string, userMessage: string) {
  // GPT-5 and newer models use max_completion_tokens instead of max_tokens
  // GPT-5 models also don't support custom temperature (only default value of 1)
  // GPT-5 needs higher token limit because reasoning tokens count against the limit
  const isGpt5OrNewer = modelName.toLowerCase().includes('gpt-5');
  
  return {
    model: modelName,
    ...(isGpt5OrNewer 
      ? { max_completion_tokens: MAX_GPT5_COMPLETION_TOKENS }
      : { max_tokens: MAX_OUTPUT_TOKENS, temperature: 0.3 }
    ),
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };
}

function resolveApiUrl() {
  const envUrl = process.env.OPENAI_API_URL || process.env.GPT5_NANO_API_URL;
  const trimmed = envUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_API_URL;
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return value.slice(0, max);
}

function normalizeSummaryOutput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const firstLine = trimmed.split('\n')[0];
  const match = /^SUMMARY:\s*(.+)$/i.exec(firstLine);
  if (match) {
    const summaryText = match[1].trim();
    return summaryText ? summaryText : undefined;
  }
  // fallback: if provider ignored instructions, accept entire trimmed output
  return trimmed;
}

async function readErrorReason(res: Response) {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      const reason = (data as any).error?.message ?? (data as any).error ?? (data as any).message;
      if (typeof reason === 'string') {
        return reason;
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function extractText(json: unknown) {
  if (!json || typeof json !== 'object') return undefined;
  
  // Standard OpenAI Chat Completions API format
  const choices = (json as any).choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = choices[0];
    if (firstChoice && typeof firstChoice === 'object') {
      const message = firstChoice.message;
      if (message && typeof message === 'object') {
        const content = message.content;
        if (typeof content === 'string' && content.trim()) {
          return content;
        }
      }
    }
  }
  
  // Fallback for other possible formats
  const message = (json as any).message ?? (json as any).summary;
  if (typeof message === 'string' && message.trim()) return message;
  
  return undefined;
}

function sanitizeField(value: string) {
  return removeContacts(value.trim());
}

function removeContacts(value: string) {
  return value
    .replace(/\bhttps?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/\b\S+@\S+\.\S+\b/gi, '')
    .replace(/\b\+?\d[\d\s().-]{6,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class MissingApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingApiKeyError';
  }
}

export class UpstreamRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamRequestError';
  }
}

export class UpstreamRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamRateLimitError';
  }
}

export class UpstreamUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamUnauthorizedError';
  }
}

export type SummaryRewriteSuccess = { summary: string };

// Prompt contract: see docs/resume-builder/ai/prompt.md for template details.
