# Stats Page Environment Variables Setup

## Problem
The stats page (`/stats`) works in development but doesn't display states in production because:
1. Missing MongoDB connection environment variables in Vercel
2. States/counties collections may not be seeded in production MongoDB

## Required Environment Variables

### For Vercel (Frontend/API Routes)

The Next.js API routes (`/api/states` and `/api/counties`) run on Vercel and need access to MongoDB:

1. **`MONGO_URI`** (Required)
   - MongoDB connection string
   - Format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<username>`, `<password>`, and `<cluster>` with your actual MongoDB Atlas credentials
   - This is the same connection string used by your Koyeb workers

2. **`MONGO_DB`** (Optional)
   - Database name (defaults to `"cl"` if not set)
   - Only set this if your production database uses a different name

### For Koyeb (Backend Workers)

The seed script should run on Koyeb to populate the states/counties collections:

1. **`MONGO_URI`** (Required)
   - Same MongoDB connection string as Vercel
   - Already configured in `koyeb/cron-fcc.yaml`

## Setup Instructions

### Step 1: Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   **Variable Name:** `MONGO_URI`  
   **Value:** `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`  
   (Replace placeholders with your actual MongoDB Atlas credentials)  
   **Environment:** Production, Preview, Development (select all that apply)

   **Variable Name:** `MONGO_DB` (if needed)  
   **Value:** `cl` (or your database name)  
   **Environment:** Production, Preview, Development

4. **Redeploy** your Vercel application after adding the variables

### Step 2: Seed States/Counties Data in Production MongoDB

You need to run the seed script to populate the `states` and `counties` collections. You have two options:

#### Option A: Run Seed Script on Koyeb (Recommended)

1. Create a new Koyeb service or use an existing one
2. Add environment variables:
   - `MONGO_URI` (same value as Vercel)
   - `MONGO_DB` (if different from default "cl")
3. Run the seed script:
   ```bash
   # From your local machine, SSH into Koyeb or use Koyeb's shell
   pnpm tsx packages/workers/src/seed-states-counties.ts
   ```

#### Option B: Run Seed Script Locally (One-time)

1. Set up your local `.env` file with production `MONGO_URI`:
   ```bash
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB=cl
   ```
   (Replace `<username>`, `<password>`, and `<cluster>` with your actual MongoDB Atlas credentials)
2. Run the seed script:
   ```bash
   pnpm tsx packages/workers/src/seed-states-counties.ts
   ```

#### Option C: Create a Koyeb Cron Job for Seeding

Create a new Koyeb cron job similar to `koyeb/cron-fcc.yaml`:

```yaml
name: cl-seed-states-counties
regions:
  - fra  # or your preferred region
triggers:
  - type: cron
    schedule: "0 0 * * 0"  # Weekly on Sunday at midnight
scaling:
  preset: free
env:
  - key: MONGO_URI
    value: ${MONGO_URI}
  - key: MONGO_DB
    value: ${MONGO_DB}
  - key: NODE_ENV
    value: production
run:
  cmd: pnpm tsx packages/workers/src/seed-states-counties.ts
```

### Step 3: Verify the Setup

1. Check that `/api/states` returns data:
   ```bash
   curl https://your-vercel-app.vercel.app/api/states
   ```
   Should return a JSON array of states.

2. Check that `/api/counties?stateCode=MS` returns data:
   ```bash
   curl https://your-vercel-app.vercel.app/api/counties?stateCode=MS
   ```
   Should return a JSON array of counties for Mississippi.

3. Visit `/stats` page and verify the state dropdown is populated.

## Troubleshooting

### States still not showing?

1. **Check Vercel logs:**
   - Go to Vercel dashboard → Your project → Deployments → Latest deployment → Functions
   - Check for errors in `/api/states` route

2. **Verify MongoDB connection:**
   - Test the connection string locally with the same `MONGO_URI`
   - Ensure the MongoDB user has read permissions

3. **Check if collections exist:**
   - Connect to MongoDB Atlas
   - Verify `states` and `counties` collections exist in the `cl` database
   - Check if they have data

4. **Verify environment variables are set:**
   - In Vercel, check that `MONGO_URI` is set for Production environment
   - Ensure you redeployed after adding the variable

### Common Issues

- **"MONGO_URI is required" error:** Environment variable not set in Vercel
- **Empty array returned:** Collections not seeded or don't exist
- **Connection timeout:** Check MongoDB Atlas network access (IP whitelist)
- **Authentication failed:** Verify MongoDB username/password in connection string

## Summary

**Required Environment Variables:**

| Variable | Vercel | Koyeb | Purpose |
|----------|--------|-------|---------|
| `MONGO_URI` | ✅ Required | ✅ Required | MongoDB connection string |
| `MONGO_DB` | ⚠️ Optional | ⚠️ Optional | Database name (defaults to "cl") |

**Actions Required:**
1. ✅ Add `MONGO_URI` to Vercel environment variables
2. ✅ Run seed script to populate `states` and `counties` collections
3. ✅ Redeploy Vercel application
4. ✅ Verify `/api/states` endpoint returns data

