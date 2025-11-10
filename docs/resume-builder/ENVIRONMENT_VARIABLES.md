# Environment Variables Setup for Resume Builder

This guide shows how to configure the OpenAI API key and other environment variables for the resume summary rewriter feature on Vercel and Koyeb.

## Required Environment Variable

### `OPENAI_API_KEY`

Your OpenAI API key (starts with `sk-`). Get it from: https://platform.openai.com/api-keys

## Vercel Setup

### Method 1: Via Vercel Dashboard (Recommended)

1. **Navigate to your project**:
   - Go to https://vercel.com/dashboard
   - Select your project

2. **Open Settings**:
   - Click on your project
   - Go to **Settings** tab
   - Click on **Environment Variables** in the left sidebar

3. **Add the variable**:
   - Click **Add New**
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (paste it here)
   - **Environment**: Select all environments where you need it:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (optional, for preview deployments)
   - Click **Save**

4. **Redeploy** (if needed):
   - Vercel automatically redeploys when you add environment variables
   - If not, go to **Deployments** tab and click **Redeploy** on the latest deployment

### Method 2: Via Vercel CLI

```bash
# Set for production
vercel env add OPENAI_API_KEY production

# Set for preview
vercel env add OPENAI_API_KEY preview

# Set for development
vercel env add OPENAI_API_KEY development
```

The CLI will prompt you to enter the value (it will be hidden).

### Method 3: Via `vercel.json` (Not Recommended)

You can add environment variables to `vercel.json`, but **this is not secure** for API keys:

```json
{
  "env": {
    "OPENAI_API_KEY": "sk-your-key-here"
  }
}
```

⚠️ **Warning**: This exposes your API key in your repository. Only use for non-sensitive variables.

### Verify Configuration

After adding the variable:
1. Go to **Settings** → **Environment Variables**
2. You should see `OPENAI_API_KEY` listed
3. Test by redeploying and checking the logs

## Koyeb Setup

### Via Koyeb Dashboard

1. **Navigate to your service**:
   - Go to https://app.koyeb.com
   - Select your service

2. **Open Settings**:
   - Click on your service name
   - Go to **Variables** tab (in the left sidebar)

3. **Add the variable**:
   - Click **Add Variable** button
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
   - **Scope**: 
     - ✅ Runtime (for production)
     - ✅ Build (if needed during build time)
   - Click **Save**

4. **Redeploy**:
   - Go to **Deployments** tab
   - Click **Redeploy** to apply the new environment variable

### Via Koyeb CLI

```bash
# Install Koyeb CLI (if not already installed)
curl -fsSL https://cli.koyeb.com/install.sh | sh

# Login
koyeb login

# Set environment variable
koyeb service env set OPENAI_API_KEY "sk-your-key-here" --service your-service-name
```

### Via Koyeb YAML Configuration

If you're using Koyeb's declarative configuration (recommended for production):

**koyeb/resume-builder.yaml**:
```yaml
services:
  - name: civic-lifeline
    env:
      - key: OPENAI_API_KEY
        value: ${OPENAI_API_KEY}  # References secret from Koyeb Secrets
```

Then create a secret:
```bash
koyeb secret create OPENAI_API_KEY "sk-your-key-here"
```

Or via dashboard:
1. Go to **Secrets** tab
2. Click **Create Secret**
3. Name: `OPENAI_API_KEY`
4. Value: Your API key
5. Reference it in your service configuration

## Optional Environment Variables

### `RESUME_SUMMARY_MODEL`

Override the default model. Defaults to `gpt-5-mini-2025-08-07` if not set.

**Vercel/Koyeb**: Same process as above, add as:
- **Key**: `RESUME_SUMMARY_MODEL`
- **Value**: `gpt-4o-mini` (or any other OpenAI model)

### `OPENAI_API_URL`

Override the OpenAI API endpoint (for proxies or Azure OpenAI).

**Vercel/Koyeb**: Same process as above, add as:
- **Key**: `OPENAI_API_URL`
- **Value**: `https://api.openai.com/v1/chat/completions` (or your custom endpoint)

## Legacy Environment Variables (Backward Compatible)

The following variables are still supported but deprecated. Use `OPENAI_API_KEY` instead:

- `GPT5_NANO_API_KEY` - Maps to `OPENAI_API_KEY`
- `GPT5_NANO_API_URL` - Maps to `OPENAI_API_URL`

## Testing Your Configuration

After adding the environment variable:

1. **Redeploy** your service
2. **Test the feature**:
   - Navigate to `/resume` on your deployed site
   - Confirm the "Resume Builder" wizard loads
   - Complete steps through Education, then watch the Summary loader populate the textarea automatically
   - Click "Regenerate summary" to ensure manual reruns succeed

3. **Check logs** if it fails:
   - **Vercel**: Go to **Deployments** → Click deployment → **Functions** → Check logs
   - **Koyeb**: Go to **Logs** tab in your service

## Common Issues

### "OPENAI_API_KEY is not configured"

- **Cause**: Environment variable not set or service not redeployed
- **Fix**: 
  1. Verify the variable exists in your platform's environment variables
  2. Ensure it's set for the correct environment (Production/Preview)
  3. Redeploy your service

### "AI provider rejected credentials" (401/403)

- **Cause**: Invalid or expired API key
- **Fix**:
  1. Generate a new key from https://platform.openai.com/api-keys
  2. Update the environment variable
  3. Redeploy

### Environment variable not updating

- **Cause**: Service needs to be redeployed
- **Fix**: Manually trigger a redeploy after adding/updating variables

## Security Best Practices

1. ✅ **Never commit** `.env.local` files to git
2. ✅ **Use secrets management** in your platform (Vercel Secrets, Koyeb Secrets)
3. ✅ **Rotate keys regularly** if compromised
4. ✅ **Use different keys** for development and production if possible
5. ✅ **Limit API key permissions** if your OpenAI account supports it
6. ✅ **Monitor usage** in OpenAI dashboard to detect abuse

## Cost Considerations

The `gpt-5-mini-2025-08-07` model is cost-effective:
- **Input tokens**: ~$0.15 per 1M tokens
- **Output tokens**: ~$0.60 per 1M tokens
- **Typical request**: ~300 input tokens + ~300 output tokens = ~$0.0002 per rewrite

Monitor your usage at: https://platform.openai.com/usage

## Platform-Specific Notes

### Vercel

- Environment variables are automatically available in serverless functions
- Variables are encrypted at rest
- Can be scoped to Production, Preview, or Development
- Changes require redeployment (automatic if enabled)

### Koyeb

- Environment variables are injected at runtime
- Can be set per-service or globally
- Supports both plain variables and secrets
- Changes require redeployment

## Quick Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | None | Your OpenAI API key |
| `RESUME_SUMMARY_MODEL` | ❌ No | `gpt-5-mini-2025-08-07` | OpenAI model to use |
| `OPENAI_API_URL` | ❌ No | `https://api.openai.com/v1/chat/completions` | Custom API endpoint |
