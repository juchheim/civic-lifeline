# Resume Summary Generator

This document captures the end-to-end flow for the automatic summary step inside the Resume Builder. The new experience generates a draft the moment users reach the Summary step so they can edit instead of starting from a blank field.

## API Route: `POST /api/resume/summary`
- **Runtime:** Node.js (Next.js App Router)
- **Authentication:** Bearer token via `OPENAI_API_KEY`
- **Response headers:** `Cache-Control: no-store`, `X-Request-Id`
- **Request payload (JSON):**
  ```ts
  {
    recentRole?: {
      title?: string;
      employer?: string;
      tenureLabel?: string;  // e.g. "2 years", "Less than 1 year"
      tenureYears?: number;  // rounded whole years when available
    };
    topSkills: string[];      // <= 5 items, already normalized
    highestEducation?: {
      labels: string[];       // all highest-level credentials (e.g. ["Bachelor of Arts", "Bachelor of Science"])
      readingLevel: string;   // "12th grade", "College level", "Graduate level"
    };
    readingLevel: string;     // Always provided (fallback: "8th grade")
    contactContext?: {
      city?: string;
      state?: string;         // Two-letter abbreviation
    };
  }
  ```
- **Response payload:**
  ```ts
  {
    summary: string; // AI-generated summary, <= 800 chars
  }
  ```
- **Error codes:** `400` (validation), `401` (missing API key), `429` (provider throttle), `500` (other upstream failures)

## Flow
1. Validate the incoming payload with `SummaryRewriteSchema`. All text fields are sanitized to remove links, phone numbers, and email addresses before being sent upstream.
2. Build the system/user prompts (`SYSTEM_PROMPT` + `buildPrompt(input)`):
   - Remind the model that only the structured facts may be used—no hallucinated employers, skills, or degrees.
   - Instruct it to write 45–70 words in implied first person and to match the requested reading level (8th grade, 12th grade, College level, Graduate level) without naming that level in the copy, using resume-style action sentences conjugated for a single candidate (e.g., “Delivers”, “Supports” rather than command-form “Deliver”).
   - Provide serialized bullets for recent role + tenure, top 3–5 skills, highest education labels, and city/state context when available.
3. Call the OpenAI Chat Completions API (`OPENAI_API_URL` override supported, default `https://api.openai.com/v1/chat/completions`) with:
   - `model = process.env.RESUME_SUMMARY_MODEL || 'gpt-5-mini-2025-08-07'`
   - `max_completion_tokens = 2500` for GPT-5 models, else `max_tokens = 1200`, `temperature = 0.3`
   - 20s timeout enforced via `AbortController`, `X-Request-Id` headers for tracing
4. Parse `choices[0].message.content`, strip the required `SUMMARY:` prefix, trim to 800 characters, and return it to the browser.

## Front-End Contract
- Client helper `rewriteSummary()` lives at `apps/web/lib/resume/rewrite-summary.ts` and now expects the structured context payload instead of raw user notes.
- `useResumeBuilderState` (in `apps/web/components/resume/useResumeBuilderState.ts`) assembles the payload via `buildSummaryContext(payload)` and triggers generation automatically the first time the Summary step mounts. It exposes:
  - `isSummaryGenerating`, `summaryGenerationError` for UI state
  - `summaryContextDetails` for instructional copy (“Based on your role as … for about 2 years…”)
  - `regenerateSummary()` so the user can request another draft after edits
- The `SummaryStep` component displays a blocking loader (“This typically takes about 15 seconds...”) until the first response arrives, then pre-fills the textarea, shows which data informed the draft, and reminds users they can rewrite anything. No diff UI remains.
- If the AI call fails, the component surfaces the error inline, keeps the textarea editable, and offers a “Try again” action.

## Operational Notes
- Logging: `resume-summary-ai-*` log lines now capture request id, duration, upstream status, and whether structured context fields were present.
- Rate limiting / abuse: still relies on global resume-route throttles; no additional per-user logic was introduced in this iteration.
- Local development: set `OPENAI_API_KEY` in `.env.local`. Optional overrides: `OPENAI_API_URL`, `RESUME_SUMMARY_MODEL`. Without a key the API returns `401`.
- The automatic generation flow assumes the wizard order `Template → Contact info → Skills → Experience → Education → Summary → Preview`, ensuring the AI sees all relevant data before running.
