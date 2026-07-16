# Deployment Guide

## What This Project Is

This repo is a full-stack TanStack Start app, not a static frontend.

It includes:
- SSR/app server via [src/server.ts](/C:/Users/mubas/flovix%20ai/src/server.ts)
- API routes like [src/routes/api/chat.ts](/C:/Users/mubas/flovix%20ai/src/routes/api/chat.ts)
- server functions across `src/lib/*.functions.ts`
- server-side Supabase access via [src/integrations/supabase/client.server.ts](/C:/Users/mubas/flovix%20ai/src/integrations/supabase/client.server.ts)
- Shopify OAuth/install routes like [src/routes/api/public/shopify/install.ts](/C:/Users/mubas/flovix%20ai/src/routes/api/public/shopify/install.ts)

## Recommendation

Deploy the whole app as one service on Google Cloud Run first.

That is the simplest and safest option because:
- frontend and backend are tightly coupled
- the app expects same-origin routes like `/api/chat`
- Shopify install/auth flows are easier on one domain
- TanStack Start server functions also live in the same app runtime

## Is It Serverless?

Yes, serverless-capable, but not frontend-only.

It can run on:
- Cloud Run
- Vercel full-stack
- other Node-compatible serverless/container platforms

It should not be treated as a static SPA right now.

## Vercel Frontend + Cloud Run Backend

Not recommended without refactoring.

Why:
- this app does not currently separate frontend and backend cleanly
- the frontend calls same-origin server routes and server functions
- moving only `/api/*` to Cloud Run will likely break SSR and generated server-function endpoints

If you really want that split later, refactor to:
- frontend as pure client app on Vercel
- backend as separate JSON API on Cloud Run
- shared auth/session strategy
- explicit backend base URL in the frontend

## Cloud Run Setup

This repo includes a `Dockerfile` that forces Nitro to build a Node server:

- build preset: `node-server`
- runtime entry: `.output/server/index.mjs`

### Required Environment Variables

Set these in Cloud Run:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `FLOVIX_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `RESEND_API_KEY`
- `LOVABLE_API_KEY`

### Vertex Credentials

Prefer using the Cloud Run service account instead of `GOOGLE_APPLICATION_CREDENTIALS`.

That means:
- attach a service account to the Cloud Run service
- give it Vertex AI permissions
- do not mount a local JSON key if you can avoid it

## Deploy Commands

Build and deploy from the repo root:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/flovix
gcloud run deploy flovix \
  --image gcr.io/YOUR_PROJECT_ID/flovix \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

Then add env vars:

```bash
gcloud run services update flovix \
  --region us-central1 \
  --set-env-vars SUPABASE_URL=... \
  --set-env-vars SUPABASE_PUBLISHABLE_KEY=... \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=... \
  --set-env-vars SHOPIFY_API_KEY=... \
  --set-env-vars SHOPIFY_API_SECRET=... \
  --set-env-vars FLOVIX_TOKEN_ENCRYPTION_KEY=... \
  --set-env-vars GOOGLE_CLOUD_PROJECT=... \
  --set-env-vars GOOGLE_CLOUD_LOCATION=global \
  --set-env-vars UPSTASH_REDIS_REST_URL=... \
  --set-env-vars UPSTASH_REDIS_REST_TOKEN=...
```

## Shopify Notes

After deployment:
- update your Shopify app URL to the Cloud Run public URL or custom domain
- update redirect URLs for OAuth callbacks
- make sure embedded app URLs point to the deployed domain

## If You Want Vercel Anyway

Use Vercel only if you deploy the whole full-stack app there, not just the frontend.

For the current codebase, Cloud Run is still the cleaner target, but Vercel works if you configure server env vars correctly.

## Vercel Environment Setup

The published app can fail even when localhost works if local Vertex auth depends on a JSON file path like `GOOGLE_APPLICATION_CREDENTIALS`.

That usually works locally, but not on Vercel, because Vercel does not have your local credentials file unless you redesign deployment around it.

For Vercel, set these project environment variables instead:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `FLOVIX_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION=global`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_PRIVATE_KEY_ID` optional
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional:

- `RESEND_API_KEY`
- `LOVABLE_API_KEY`

### Important For `GOOGLE_PRIVATE_KEY`

Paste the full private key into Vercel as one env var.

If your key is copied from JSON, it should look like this in Vercel:

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

If Vercel stores it with escaped newlines like `\n`, this app now converts them back automatically at runtime.

### Do Not Rely On This On Vercel

Avoid using:

- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/file.json`

That pattern is fine on local machines or some containers, but it is not the right default for this Vercel deployment.
