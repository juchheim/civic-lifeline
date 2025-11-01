# Resume Summary Rewriter

This document describes the end-to-end flow for the AI-backed resume summary rewrite feature on the Jobs page. It is tailored for low-literacy job seekers who may enter jumbled phrases or incomplete thoughts.

## API Route: `POST /api/resume/summary`
- **Runtime:** Node.js (Next.js App Router)
- **Authentication:** Bearer token for the upstream OpenAI request (`OPENAI_API_KEY`)
- **Headers returned:** `Cache-Control: no-store`, `X-Request-Id`
- **Request payload (JSON):**
  ```ts
  {
    summary: string;          // Required, 12-1000 chars (trimmed)
    name?: string;
    skills?: string[];        // Optional, <= 12 items
    experience?: Array<{
      title?: string;
      company?: string;
      bullets?: string[];     // Optional, <= 2 entries considered
    }>;
  }
  ```
- **Response payload:**
  ```ts
  {
    summary: string;          // Polished summary, <= 800 chars
  }
  ```
- **Error codes:** `400` (validation), `401` (missing API key), `429` (upstream throttle), `500` (other upstream failures).

## Flow
1. Validate the payload with `zod` (`SummaryRewriteSchema`).
2. Normalize the context (trim whitespace, collapse repeats, cap array lengths, strip contact info).
3. Construct the system/user pair described in `docs/resume-builder/ai/prompt.md`, emphasizing plain, encouraging language for low-literacy writers.
4. Call the OpenAI Chat Completions API (`process.env.OPENAI_API_URL` or default `https://api.openai.com/v1/chat/completions`) with model `process.env.RESUME_SUMMARY_MODEL || 'gpt-5-mini-2025-08-07'`, `max_completion_tokens: 2500` (GPT-5 models, includes reasoning tokens) or `max_tokens: 1200, temperature: 0.3` (older models), a 20s timeout, and `X-Request-Id` for correlation. Note: GPT-5 models don't support custom temperature values and use internal reasoning tokens that count against the completion limit.
5. Parse the primary text output from `choices[0].message.content`. The model is instructed to respond with a single line beginning `SUMMARY:`. The server strips that prefix, trims to 800 characters, and returns the final text to the client.

## Front-End Contract
- Client helper `rewriteSummary()` is located at `apps/web/lib/resume/rewrite-summary.ts`.
- UI integration lives in `apps/web/components/resume/ResumeBuilderSection.tsx`. The button is disabled while a rewrite is pending or when the summary field has fewer than 12 characters.
- Success path replaces the local summary and sets a confirmation status. Failures surface an inline message but leave the user's draft untouched.

## Operational Notes
- Logging: capture request id, upstream latency, and high-level error reason via the shared resume logger.
- Rate limiting / abuse: the API should be behind whatever global throttling exists for resume routes; no additional logic is added here.
- Local development: set `OPENAI_API_KEY` in `.env.local`. Optionally use `OPENAI_API_URL` for custom endpoints and `RESUME_SUMMARY_MODEL` to try alternate OpenAI models (default: `gpt-4o-mini`). Without a key the route returns `401`.
- Legacy environment variables `GPT5_NANO_API_KEY` and `GPT5_NANO_API_URL` are still supported for backward compatibility.
