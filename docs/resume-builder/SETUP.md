# Resume Builder Setup Guide

This guide explains how to set up the AI-powered resume summary rewriter feature.

## Environment Variables

The resume summary rewriter uses OpenAI's Chat Completions API. You need to configure the following environment variables in your `apps/web/.env.local` file:

### Required

```bash
# Your OpenAI API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Optional

```bash
# Override the default OpenAI API endpoint (default: https://api.openai.com/v1/chat/completions)
OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# Specify a different OpenAI model (default: gpt-5-mini-2025-08-07)
# Available models: gpt-5-mini-2025-08-07, gpt-4o-mini, gpt-4o, gpt-4-turbo, etc.
RESUME_SUMMARY_MODEL=gpt-5-mini-2025-08-07
```

### Legacy Variables (Backward Compatibility)

The following environment variables are still supported for backward compatibility:

```bash
GPT5_NANO_API_KEY=your-api-key
GPT5_NANO_API_URL=https://api.openai.com/v1/chat/completions
```

## Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key and add it to your `.env.local` file

## Model Selection

The default model is `gpt-5-mini-2025-08-07`, which provides an excellent balance of cost, speed, and quality for this use case. You can change this by setting the `RESUME_SUMMARY_MODEL` environment variable.

Recommended models:
- **gpt-5-mini-2025-08-07** (default): Latest mini model, fast, cost-effective, suitable for most resume summaries
- **gpt-4o-mini**: Slightly older but still excellent performance
- **gpt-4o**: More powerful, better for complex rewrites
- **gpt-3.5-turbo**: Faster and cheaper, but may produce lower quality output

**Note:** GPT-5 models have specific requirements:
- Use `max_completion_tokens` instead of `max_tokens`
- Don't support custom `temperature` values (only default 1.0)
- Need higher token limits (~2500) because internal "reasoning tokens" count against the limit
- The code automatically handles these differences

## Testing the Setup

1. Set up your environment variables as described above
2. Start the development server: `cd apps/web && npm run dev`
3. Navigate to `/jobs` in your browser
4. Scroll to the "Build Your Resume" section
5. Enter a summary (at least 12 characters)
6. Click "Rewrite with AI"
7. If configured correctly, you should see the rewritten summary appear in the text area

## Troubleshooting

### Error: "OPENAI_API_KEY is not configured"

Make sure you've added the `OPENAI_API_KEY` to your `.env.local` file and restarted the development server.

### Error: "AI provider rejected credentials"

Your API key may be invalid or expired. Generate a new key from the OpenAI platform.

### Error: "AI provider rate limited the request"

You've exceeded your OpenAI API rate limit. Wait a few moments and try again, or upgrade your OpenAI plan.

### No response or timeout

The API request may be taking too long (>20 seconds). Check your internet connection and OpenAI's status page.

## Recent Changes (November 2024)

The resume summary rewriter has been updated to use OpenAI's standard Chat Completions API format:

- **API Endpoint**: Changed from `/v1/responses` to `/v1/chat/completions`
- **Model**: Default remains `gpt-5-mini-2025-08-07` (now working correctly)
- **Request Format**: Updated to use standard OpenAI messages format
- **Response Parsing**: Updated to extract from `choices[0].message.content`
- **Token Parameter**: Automatically uses `max_completion_tokens` for GPT-5 models, `max_tokens` for older models
- **Temperature**: GPT-5 models don't support custom temperature (uses default 1.0), older models use 0.3
- **Environment Variables**: Now uses standard `OPENAI_API_KEY` (with backward compatibility for `GPT5_NANO_API_KEY`)

These changes align the integration with OpenAI's official API documentation and ensure compatibility with current and future OpenAI models.

