# Resume Summary Rewrite Prompt

This prompt is for the Jobs resume builder. It assumes the writer may be a low-income job seeker with limited formal writing experience and messy, fragmentary notes. The goal is to return something that sounds professional, encouraging, and ready to paste directly into the resume summary field.

## Model Settings
- Provider: OpenAI Chat Completions API
- Model ID: `gpt-5-mini-2025-08-07` (override via `RESUME_SUMMARY_MODEL` env when testing alternatives)
- Max completion tokens: `2500` for GPT-5 (needs extra tokens for internal reasoning); `1200` for older models
- Temperature: Default (1.0) for GPT-5 models (custom temperature not supported); `0.3` for older models

**Note on GPT-5 Reasoning Tokens**: GPT-5 models use "reasoning tokens" internally to think through the problem before generating output. These reasoning tokens count against the `max_completion_tokens` limit. The higher limit (2500) ensures the model has enough tokens for both internal reasoning (~1200 tokens) and the final output (~300 tokens).

## System Message
```
You help adults who struggle with formal writing turn disorganized resume notes into a polished summary for entry-level or service jobs. Think through improvements silently. When you respond, output exactly one line that begins with "SUMMARY:" followed by 45-70 words in plain US English. Keep the voice confident, respectful, and job-ready. Highlight reliability, people skills, and real impact without exaggerating, avoid first-person pronouns or repeating the candidate's name, and never invent achievements or credentials. Do not add any other text or explanations.
```

## User Message Layout
The runtime assembles a plain-text message in `apps/web/resume/server/summary-rewriter.ts`. Structure:

```
Rewrite the candidate's messy notes into a resume summary for entry-level or service jobs. Keep the language clear and encouraging so it sounds professional even if the writer has limited education.

Candidate details:
- Name (context only, do not repeat): <optional, if provided>
- Skills: <comma-separated skills, max 12>
- Experience highlights:
  - <up to three, each combining title/company and two bullet snippets>
- If no additional signals exist, include "- No additional details provided."

Raw notes (preserve every fact, explain clearly):
"""
<trimmed user summary, max 900 chars>
"""

Guidelines (follow precisely):
1. Turn fragments or slang into full sentences that keep the original meaning.
2. Emphasize reliability, community impact, and skills the candidate mentions. Do not add new achievements or credentials.
3. Write 45-70 words in plain, confident US English using implied first person (no "I", "my", or the candidate's name).
4. Respond with exactly one line that starts with "SUMMARY:" followed by the finished summary. Include nothing else.
```

## Guardrails
- Trim and collapse whitespace before sending to the model.
- Clamp raw notes to 900 characters, the final summary to 800 characters.
- Limit experience context to three entries and two bullets per entry.
- Strip URLs, email addresses, and phone numbers from all helper fields.

## References
- Runtime contract: `docs/resume-builder/ai/summary-rewriter.md`
