# Resume Summary Rewriter - OpenAI Integration Fix

## Summary

Fixed the AI-powered resume summary rewriter feature to work with OpenAI's standard Chat Completions API. The previous implementation used a non-standard API format that doesn't exist in OpenAI's actual API.

## Changes Made

### 1. Core Implementation (`apps/web/resume/server/summary-rewriter.ts`)

#### API Endpoint
- **Before**: `https://api.openai.com/v1/responses` (non-existent endpoint)
- **After**: `https://api.openai.com/v1/chat/completions` (standard OpenAI endpoint)

#### Default Model
- **Model**: `gpt-5-mini-2025-08-07` (this is the correct, current model)

#### Request Format
- **Before**: Custom format with `input` array containing objects with `type: 'input_text'`
- **After**: Standard OpenAI format with `messages` array containing `role` and `content` fields

```typescript
// Before (incorrect)
{
  model: modelName,
  max_output_tokens: 1200,
  input: [
    {
      role: 'system',
      content: [{ type: 'input_text', text: SYSTEM_PROMPT }]
    },
    {
      role: 'user',
      content: [{ type: 'input_text', text: userMessage }]
    }
  ]
}

// After (correct)
{
  model: modelName,
  // GPT-5 models: max_completion_tokens, no temperature
  // Older models: max_tokens, temperature: 0.3
  max_completion_tokens: 1200, // or max_tokens for GPT-4 and earlier
  // temperature: 0.3 // only for non-GPT-5 models
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage }
  ]
}
```

#### Response Parsing
- **Before**: Complex extraction logic looking for custom fields like `output`, `output_text`, etc.
- **After**: Standard extraction from `choices[0].message.content`

#### Environment Variables
- **Primary**: Now uses `OPENAI_API_KEY` and `OPENAI_API_URL`
- **Backward Compatibility**: Still supports legacy `GPT5_NANO_API_KEY` and `GPT5_NANO_API_URL`

### 2. Documentation Updates

#### `docs/resume-builder/ai/summary-rewriter.md`
- Updated API endpoint reference
- Updated model name to `gpt-4o-mini`
- Updated response parsing documentation
- Updated environment variable names with legacy support note

#### `docs/resume-builder/ai/prompt.md`
- Updated provider from "OpenAI Responses API" to "OpenAI Chat Completions API"
- Updated model ID to `gpt-4o-mini`
- Added temperature parameter documentation

#### `docs/resume-builder/SETUP.md` (new file)
- Complete setup guide for the AI feature
- Environment variable configuration instructions
- Getting started with OpenAI API keys
- Model selection recommendations
- Troubleshooting guide
- Change log

### 3. Testing Resources

#### `apps/web/resume/scripts/summary-rewrite-test.http` (new file)
- HTTP test file for manual API testing
- Example payload with realistic data
- Can be used with VS Code REST Client extension

## Setup Instructions

1. **Get an OpenAI API Key**
   - Visit https://platform.openai.com/api-keys
   - Create a new secret key
   - Copy the key (starts with `sk-`)

2. **Configure Environment Variables**
   - Create or edit `apps/web/.env.local`
   - Add the following:
   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Optional Configuration**
   ```bash
   # Use a different model
   RESUME_SUMMARY_MODEL=gpt-4o
   
   # Use a custom API endpoint (for proxies or Azure OpenAI)
   OPENAI_API_URL=https://your-custom-endpoint.com/v1/chat/completions
   ```

4. **Restart the Development Server**
   ```bash
   cd apps/web
   npm run dev
   ```

5. **Test the Feature**
   - Navigate to http://localhost:3000/jobs
   - Scroll to "Build Your Resume" section
   - Enter a summary with at least 12 characters
   - Click "Rewrite with AI"
   - You should see a polished version appear

## Testing

### Manual Testing via UI
1. Start the dev server: `cd apps/web && npm run dev`
2. Go to http://localhost:3000/jobs
3. Fill in the resume builder form
4. Click "Rewrite with AI" on the summary field

### API Testing
Use the provided test file with a REST client:
```bash
# Install REST Client extension in VS Code
# Open apps/web/resume/scripts/summary-rewrite-test.http
# Click "Send Request" above the POST line
```

Or use curl:
```bash
curl -X POST http://localhost:3000/api/resume/summary \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "I worked at walmart for 3 years. I was good at helping customers",
    "skills": ["Customer Service", "Retail"]
  }'
```

## Troubleshooting

### "OPENAI_API_KEY is not configured"
- Check that you've added the key to `.env.local`
- Restart the development server
- Ensure the key starts with `sk-`

### "AI provider rejected credentials" (401/403)
- Your API key is invalid or expired
- Generate a new key from OpenAI Platform
- Check that you haven't included extra spaces in the key

### "AI provider rate limited the request" (429)
- You've hit your OpenAI rate limit
- Wait a few minutes and try again
- Consider upgrading your OpenAI plan

### Request timeout
- The 20-second timeout may be too short for your network
- Check your internet connection
- Verify OpenAI's service status at https://status.openai.com

## Additional Notes

- The default model `gpt-5-mini-2025-08-07` is recommended for cost-effectiveness
- GPT-5 models have specific API requirements that are automatically handled:
  - Use `max_completion_tokens` instead of `max_tokens`
  - Don't support custom `temperature` values (only default 1.0 is allowed)
  - Need higher token limits (2500) because internal "reasoning tokens" count against the limit
  - The model uses ~1200 tokens for reasoning, leaving room for ~300 token output
- Older models (GPT-4, GPT-3.5) use `max_tokens: 1200` and `temperature: 0.3`
- Maximum returned summary is 800 characters
- The system maintains backward compatibility with `GPT5_NANO_*` variables
- All API calls include request IDs for correlation in logs

## Files Modified

1. `apps/web/resume/server/summary-rewriter.ts` - Core implementation
2. `docs/resume-builder/ai/summary-rewriter.md` - API documentation
3. `docs/resume-builder/ai/prompt.md` - Prompt documentation

## Files Created

1. `docs/resume-builder/SETUP.md` - Setup guide
2. `apps/web/resume/scripts/summary-rewrite-test.http` - Test file
3. `CHANGES.md` - This file

## Next Steps

1. Set up your `OPENAI_API_KEY` in `.env.local`
2. Test the feature locally
3. Deploy with the new environment variables configured
4. Monitor logs for any API errors
5. Consider setting up rate limiting if needed

